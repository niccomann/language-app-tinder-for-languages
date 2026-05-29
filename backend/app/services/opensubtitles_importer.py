from __future__ import annotations

import gzip
import html
import ipaddress
import json
import os
import re
import time
from io import BytesIO
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Mapping
from urllib.parse import urljoin, urlparse

import certifi
import requests
from sqlalchemy import delete
from sqlalchemy.engine import Engine
from sqlmodel import SQLModel, Session, create_engine, select

from app.database.models import (
    IngestionLogEntity,
    MovieEntity,
    SubtitleEntity,
    SubtitleStatsEntity,
)


DEFAULT_OPENSUBTITLES_REST_BASE = "https://rest.opensubtitles.org/search"
DEFAULT_USER_AGENT = "LanguageAppMovieImporter/1.0"
DEFAULT_ALLOWED_DOWNLOAD_HOSTS = (
    "dl.opensubtitles.org",
    "www.opensubtitles.org",
    "opensubtitles.org",
)
MAX_DOWNLOAD_REDIRECTS = 3
SOURCE_NAME = "opensubtitles_rest"
LICENSE_NOTE = "OpenSubtitles REST API metadata/download"
_WORD_RE = re.compile(r"\w+", re.UNICODE)
_TIMESTAMP_RE = re.compile(
    r"^\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}\s+-->\s+\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}"
)


@dataclass(frozen=True)
class MovieSpec:
    imdb_id: str
    title: str
    year: int | None = None


@dataclass(frozen=True)
class OpenSubtitlesConfig:
    base_url: str = DEFAULT_OPENSUBTITLES_REST_BASE
    user_agent: str = DEFAULT_USER_AGENT
    min_word_count: int = 1000
    request_delay_seconds: float = 0.5
    request_timeout_seconds: float = 20.0
    download_timeout_seconds: float = 30.0
    request_retry_count: int = 2
    request_retry_delay_seconds: float = 1.0
    allowed_download_hosts: tuple[str, ...] = DEFAULT_ALLOWED_DOWNLOAD_HOSTS
    max_download_bytes: int = 5_000_000
    max_decompressed_bytes: int = 20_000_000

    def __post_init__(self) -> None:
        base_url = self.base_url.rstrip("/")
        user_agent = self.user_agent.strip()
        allowed_download_hosts = tuple(
            host.strip().lower()
            for host in self.allowed_download_hosts
            if host.strip()
        )
        if not base_url:
            raise ValueError("base_url is required")
        if not user_agent:
            raise ValueError("user_agent is required")
        if not allowed_download_hosts:
            raise ValueError("allowed_download_hosts is required")
        if self.min_word_count < 0:
            raise ValueError("min_word_count must be >= 0")
        if self.max_download_bytes <= 0 or self.max_decompressed_bytes <= 0:
            raise ValueError("download size limits must be > 0")
        if self.request_delay_seconds < 0 or self.request_retry_delay_seconds < 0:
            raise ValueError("delay values must be >= 0")
        if self.request_timeout_seconds <= 0 or self.download_timeout_seconds <= 0:
            raise ValueError("timeout values must be > 0")
        if self.request_retry_count < 0:
            raise ValueError("request_retry_count must be >= 0")
        object.__setattr__(self, "base_url", base_url)
        object.__setattr__(self, "user_agent", user_agent)
        object.__setattr__(self, "allowed_download_hosts", allowed_download_hosts)

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "OpenSubtitlesConfig":
        values = os.environ if env is None else env
        return cls(
            base_url=values.get("OPENSUBTITLES_REST_BASE_URL", DEFAULT_OPENSUBTITLES_REST_BASE).rstrip("/"),
            user_agent=values.get("OPENSUBTITLES_USER_AGENT", DEFAULT_USER_AGENT).strip() or DEFAULT_USER_AGENT,
            min_word_count=_env_int(values, "OPENSUBTITLES_MIN_WORD_COUNT", 1000),
            request_delay_seconds=_env_float(values, "OPENSUBTITLES_REQUEST_DELAY_SECONDS", 0.5),
            request_timeout_seconds=_env_float(values, "OPENSUBTITLES_REQUEST_TIMEOUT_SECONDS", 20.0),
            download_timeout_seconds=_env_float(values, "OPENSUBTITLES_DOWNLOAD_TIMEOUT_SECONDS", 30.0),
            request_retry_count=_env_int(values, "OPENSUBTITLES_REQUEST_RETRY_COUNT", 2),
            request_retry_delay_seconds=_env_float(values, "OPENSUBTITLES_REQUEST_RETRY_DELAY_SECONDS", 1.0),
            allowed_download_hosts=_env_csv_tuple(
                values,
                "OPENSUBTITLES_ALLOWED_DOWNLOAD_HOSTS",
                DEFAULT_ALLOWED_DOWNLOAD_HOSTS,
            ),
            max_download_bytes=_env_int(values, "OPENSUBTITLES_MAX_DOWNLOAD_BYTES", 5_000_000),
            max_decompressed_bytes=_env_int(values, "OPENSUBTITLES_MAX_DECOMPRESSED_BYTES", 20_000_000),
        )


@dataclass(frozen=True)
class ImportedSubtitle:
    movie: MovieSpec
    language: str
    text: str
    metadata: dict[str, Any]
    source: str = SOURCE_NAME
    license_note: str = LICENSE_NOTE
    imported_at: datetime | None = None


@dataclass(frozen=True)
class ImportResult:
    imdb_id: str
    title: str
    word_count: int
    unique_words: int
    external_id: str | None


@dataclass(frozen=True)
class MovieImportFailure:
    imdb_id: str
    title: str
    error: str


@dataclass(frozen=True)
class BatchImportReport:
    results: list[ImportResult]
    failures: list[MovieImportFailure]


def load_movie_manifest(path: str | Path) -> list[MovieSpec]:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    movies_payload = payload.get("movies") if isinstance(payload, dict) else payload
    if not isinstance(movies_payload, list):
        raise ValueError("Movie manifest must be a list or an object with a movies list")

    movies: list[MovieSpec] = []
    for index, item in enumerate(movies_payload):
        if not isinstance(item, dict):
            raise ValueError(f"Movie manifest entry {index} must be an object")
        imdb_id = str(item.get("imdb_id") or "").strip()
        title = str(item.get("title") or "").strip()
        year = item.get("year")
        if not imdb_id or not title:
            raise ValueError(f"Movie manifest entry {index} requires imdb_id and title")
        if year is not None:
            year = int(year)
        movies.append(MovieSpec(imdb_id=imdb_id, title=title, year=year))
    return movies


def strip_subtitle_text(raw: str) -> str:
    text = raw.replace("\r\n", "\n").replace("\r", "\n")
    lines: list[str] = []
    for line in text.split("\n"):
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.isdigit():
            continue
        if _TIMESTAMP_RE.match(stripped):
            continue
        if stripped.upper().startswith(("WEBVTT", "NOTE ")):
            continue

        stripped = re.sub(r"<[^>]+>", " ", stripped)
        stripped = re.sub(r"\{[^}]+}", " ", stripped)
        stripped = html.unescape(stripped)
        stripped = re.sub(r"\s+", " ", stripped).strip()
        stripped = re.sub(r"\s+([,.!?;:])", r"\1", stripped)
        if stripped:
            lines.append(stripped)

    return "\n".join(lines)


def count_words(text: str) -> tuple[int, int]:
    words = _WORD_RE.findall(text or "")
    normalized_words = {word.casefold() for word in words}
    return len(words), len(normalized_words)


def select_best_subtitle(rows: list[dict[str, Any]]) -> dict[str, Any]:
    candidates = [
        row
        for row in rows
        if str(row.get("SubFormat") or "").lower() == "srt"
        and row.get("SubDownloadLink")
        and int(row.get("SubBad") or 0) == 0
    ]
    if not candidates:
        raise ValueError("No usable SRT subtitle candidates found")

    def score(row: dict[str, Any]) -> tuple[int, float, int]:
        return (
            int(row.get("SubDownloadsCnt") or 0),
            float(row.get("SubRating") or 0.0),
            int(row.get("SubSize") or 0),
        )

    return max(candidates, key=score)


def search_subtitles(
    imdb_id: str,
    *,
    language_id: str = "ger",
    config: OpenSubtitlesConfig | None = None,
) -> list[dict[str, Any]]:
    resolved_config = config or OpenSubtitlesConfig.from_env()
    numeric_imdb = imdb_id.removeprefix("tt").lstrip("0") or imdb_id.removeprefix("tt")
    url = f"{resolved_config.base_url}/imdbid-{numeric_imdb}/sublanguageid-{language_id}"
    response = _get_with_retries(
        url,
        config=resolved_config,
        timeout=resolved_config.request_timeout_seconds,
    )
    data = response.json()
    if not isinstance(data, list):
        raise ValueError(f"Unexpected OpenSubtitles response for {imdb_id}")
    return data


def download_subtitle(download_link: str, *, config: OpenSubtitlesConfig | None = None) -> str:
    resolved_config = config or OpenSubtitlesConfig.from_env()
    response = _get_download_response(download_link, config=resolved_config)
    raw = _read_limited_response(response, resolved_config.max_download_bytes)
    raw = _maybe_decompress_limited(raw, resolved_config.max_decompressed_bytes)

    for encoding in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def fetch_imported_subtitle(
    movie: MovieSpec,
    *,
    language: str = "de",
    config: OpenSubtitlesConfig | None = None,
) -> ImportedSubtitle:
    resolved_config = config or OpenSubtitlesConfig.from_env()
    rows = search_subtitles(
        movie.imdb_id,
        language_id=_opensubtitles_language_id(language),
        config=resolved_config,
    )
    candidate = select_best_subtitle(rows)
    raw_text = download_subtitle(str(candidate["SubDownloadLink"]), config=resolved_config)
    cleaned_text = strip_subtitle_text(raw_text)
    word_count, _unique_words = count_words(cleaned_text)
    if word_count < resolved_config.min_word_count:
        raise ValueError(f"Downloaded subtitle for {movie.imdb_id} is unexpectedly tiny: {word_count} words")

    metadata = {
        key: candidate.get(key)
        for key in (
            "IDSubtitleFile",
            "IDSubtitle",
            "SubFileName",
            "SubDownloadLink",
            "ZipDownloadLink",
            "SubDownloadsCnt",
            "SubRating",
            "SubSize",
            "MovieReleaseName",
        )
    }
    return ImportedSubtitle(
        movie=movie,
        language=language,
        text=cleaned_text,
        metadata=metadata,
        imported_at=datetime.now(UTC),
    )


def upsert_imported_subtitle_session(session: Session, imported: ImportedSubtitle) -> ImportResult:
    imported_at = imported.imported_at or datetime.now(UTC)
    word_count, unique_words = count_words(imported.text)
    raw_blob = json.dumps({**imported.metadata, "imported_at": imported_at.isoformat()}, ensure_ascii=False)
    external_id = imported.metadata.get("IDSubtitleFile")

    movie = session.exec(
        select(MovieEntity).where(MovieEntity.imdb_id == imported.movie.imdb_id)
    ).first()
    if movie is None:
        movie = MovieEntity(
            created_at=imported_at,
            updated_at=imported_at,
            imdb_id=imported.movie.imdb_id,
            title=imported.movie.title,
            year=imported.movie.year,
            genres=None,
        )
    else:
        movie.updated_at = imported_at
        movie.title = imported.movie.title
        movie.year = imported.movie.year
    session.add(movie)
    session.flush()

    subtitle = session.exec(
        select(SubtitleEntity).where(
            SubtitleEntity.movie_id == movie.id,
            SubtitleEntity.language == imported.language,
            SubtitleEntity.source == imported.source,
        )
    ).first()
    if subtitle is None:
        subtitle = SubtitleEntity(
            created_at=imported_at,
            updated_at=imported_at,
            movie_id=movie.id,
            language=imported.language,
            full_text=imported.text,
            raw_blob=raw_blob,
            source=imported.source,
            license=imported.license_note,
            external_id=str(external_id) if external_id is not None else None,
            validated_at=imported_at,
        )
    else:
        subtitle.updated_at = imported_at
        subtitle.full_text = imported.text
        subtitle.raw_blob = raw_blob
        subtitle.license = imported.license_note
        subtitle.external_id = str(external_id) if external_id is not None else None
        subtitle.validated_at = imported_at
    session.add(subtitle)
    session.flush()

    session.exec(delete(SubtitleStatsEntity).where(SubtitleStatsEntity.subtitle_id == subtitle.id))
    session.add(
        SubtitleStatsEntity(
            created_at=imported_at,
            updated_at=imported_at,
            subtitle_id=subtitle.id,
            word_count=word_count,
            unique_words=unique_words,
            word_freq_top=None,
            lda_topics=None,
        )
    )
    session.add(
        IngestionLogEntity(
            created_at=imported_at,
            updated_at=imported_at,
            source=imported.source,
            finished_at=imported_at,
            rows_in=1,
            rows_kept=1,
            rows_rejected=0,
            rejection_reasons={},
            notes=f"{imported.movie.imdb_id} {imported.movie.title}",
        )
    )
    session.flush()

    return ImportResult(
        imdb_id=imported.movie.imdb_id,
        title=imported.movie.title,
        word_count=word_count,
        unique_words=unique_words,
        external_id=str(external_id) if external_id is not None else None,
    )


def import_movie_batch(
    db_path: str,
    movies: list[MovieSpec],
    *,
    language: str = "de",
    delay_seconds: float | None = None,
    continue_on_error: bool = False,
    config: OpenSubtitlesConfig | None = None,
) -> BatchImportReport:
    engine = create_engine(f"sqlite:///{db_path}")
    SQLModel.metadata.create_all(engine)
    return import_movie_batch_with_engine(
        engine,
        movies,
        language=language,
        delay_seconds=delay_seconds,
        continue_on_error=continue_on_error,
        config=config,
    )


def import_movie_batch_with_engine(
    engine: Engine,
    movies: list[MovieSpec],
    *,
    language: str = "de",
    delay_seconds: float | None = None,
    continue_on_error: bool = False,
    config: OpenSubtitlesConfig | None = None,
) -> BatchImportReport:
    resolved_config = config or OpenSubtitlesConfig.from_env()
    resolved_delay_seconds = (
        resolved_config.request_delay_seconds if delay_seconds is None else delay_seconds
    )
    results: list[ImportResult] = []
    failures: list[MovieImportFailure] = []
    with Session(engine) as session:
        for index, movie in enumerate(movies):
            try:
                imported = fetch_imported_subtitle(movie, language=language, config=resolved_config)
                results.append(upsert_imported_subtitle_session(session, imported))
                session.commit()
            except Exception as exc:
                session.rollback()
                if not continue_on_error:
                    raise
                failures.append(MovieImportFailure(movie.imdb_id, movie.title, str(exc)))
            if resolved_delay_seconds > 0 and index < len(movies) - 1:
                time.sleep(resolved_delay_seconds)
    return BatchImportReport(results=results, failures=failures)


def _opensubtitles_language_id(language: str) -> str:
    language_ids = {
        "de": "ger",
        "en": "eng",
        "fr": "fre",
        "it": "ita",
    }
    if language not in language_ids:
        raise ValueError(f"Unsupported OpenSubtitles language: {language}")
    return language_ids[language]


def _get_download_response(download_link: str, *, config: OpenSubtitlesConfig) -> requests.Response:
    current_url = download_link
    for _redirect_count in range(MAX_DOWNLOAD_REDIRECTS + 1):
        _validate_download_url(current_url, config)
        response = _get_with_retries(
            current_url,
            config=config,
            timeout=config.download_timeout_seconds,
            allow_redirects=False,
            stream=True,
        )
        if response.status_code in {301, 302, 303, 307, 308}:
            location = response.headers.get("Location")
            if not location:
                raise ValueError("Subtitle download redirect missing Location header")
            current_url = urljoin(current_url, location)
            continue
        return response

    raise ValueError("Subtitle download exceeded redirect limit")


def _validate_download_url(download_link: str, config: OpenSubtitlesConfig) -> None:
    parsed = urlparse(download_link)
    if parsed.scheme != "https":
        raise ValueError("Subtitle download URL must use https")
    if not parsed.hostname:
        raise ValueError("Subtitle download URL requires a host")

    host = parsed.hostname.lower()
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        address = None
    if address and (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_multicast
        or address.is_reserved
    ):
        raise ValueError("Subtitle download host is not allowed")

    if not any(host == allowed or host.endswith(f".{allowed}") for allowed in config.allowed_download_hosts):
        raise ValueError("Subtitle download host is not allowed")


def _read_limited_response(response: requests.Response, max_bytes: int) -> bytes:
    chunks: list[bytes] = []
    total = 0
    iter_content = getattr(response, "iter_content", None)
    if callable(iter_content):
        for chunk in iter_content(chunk_size=64 * 1024):
            if not chunk:
                continue
            total += len(chunk)
            if total > max_bytes:
                raise ValueError("Download exceeded maximum subtitle size")
            chunks.append(chunk)
        return b"".join(chunks)

    raw = response.content
    if len(raw) > max_bytes:
        raise ValueError("Download exceeded maximum subtitle size")
    return raw


def _maybe_decompress_limited(raw: bytes, max_decompressed_bytes: int) -> bytes:
    try:
        with gzip.GzipFile(fileobj=BytesIO(raw)) as gzip_file:
            decompressed = gzip_file.read(max_decompressed_bytes + 1)
    except OSError:
        return raw
    if len(decompressed) > max_decompressed_bytes:
        raise ValueError("Decompressed subtitle exceeded maximum size")
    return decompressed


def _get_with_retries(
    url: str,
    *,
    config: OpenSubtitlesConfig,
    timeout: float,
    allow_redirects: bool = True,
    stream: bool = False,
) -> requests.Response:
    attempts = config.request_retry_count + 1
    for attempt in range(attempts):
        try:
            request_kwargs: dict[str, Any] = {
                "headers": {"User-Agent": config.user_agent},
                "timeout": timeout,
                "verify": certifi.where(),
            }
            if not allow_redirects:
                request_kwargs["allow_redirects"] = False
            if stream:
                request_kwargs["stream"] = True
            response = requests.get(url, **request_kwargs)
            response.raise_for_status()
            return response
        except requests.RequestException as exc:
            if attempt >= config.request_retry_count or not _is_retryable_request_error(exc):
                raise
            if config.request_retry_delay_seconds > 0:
                time.sleep(config.request_retry_delay_seconds)

    raise RuntimeError("unreachable retry state")


def _is_retryable_request_error(exc: requests.RequestException) -> bool:
    response = getattr(exc, "response", None)
    if response is None:
        return True
    status_code = getattr(response, "status_code", 0)
    return status_code == 429 or 500 <= status_code < 600


def _env_int(values: Mapping[str, str], key: str, default: int) -> int:
    raw = values.get(key)
    if raw is None or str(raw).strip() == "":
        return default
    return int(str(raw).strip())


def _env_float(values: Mapping[str, str], key: str, default: float) -> float:
    raw = values.get(key)
    if raw is None or str(raw).strip() == "":
        return default
    return float(str(raw).strip())


def _env_csv_tuple(values: Mapping[str, str], key: str, default: tuple[str, ...]) -> tuple[str, ...]:
    raw = values.get(key)
    if raw is None or str(raw).strip() == "":
        return default
    return tuple(item.strip() for item in str(raw).split(",") if item.strip())
