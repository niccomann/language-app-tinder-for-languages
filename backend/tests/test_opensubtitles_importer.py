import json
import sqlite3
import gzip
from datetime import UTC, datetime
from importlib import import_module

import pytest
import requests
from sqlalchemy import event
from sqlmodel import SQLModel, Session, create_engine

from app.services.opensubtitles_importer import (
    BatchImportReport,
    ImportedSubtitle,
    MovieSpec,
    count_words,
    import_movie_batch,
    select_best_subtitle,
    strip_subtitle_text,
)
from app.services import opensubtitles_importer


def _make_sqlite_db(path):
    engine = create_engine(f"sqlite:///{path}")

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_conn, _conn_record):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys = ON")
        cur.close()

    SQLModel.metadata.create_all(engine)
    return path


def test_strip_subtitle_text_removes_srt_markup_without_dropping_dialogue():
    raw = """1
00:00:01,000 --> 00:00:02,000
<i>Hallo</i>, Neo!

2
00:00:03,000 --> 00:00:04,000
{\\an8}Folge dem weißen Kaninchen.
"""

    assert strip_subtitle_text(raw) == "Hallo, Neo!\nFolge dem weißen Kaninchen."


def test_count_words_returns_total_and_distinct_casefolded_words():
    assert count_words("Hund hund Hunde läuft.") == (4, 3)


def test_select_best_subtitle_prefers_non_bad_popular_srt_downloads():
    rows = [
        {
            "SubFormat": "srt",
            "SubBad": "1",
            "SubDownloadsCnt": "99999",
            "SubRating": "10",
            "SubSize": "200000",
            "SubDownloadLink": "https://example.test/bad.gz",
        },
        {
            "SubFormat": "sub",
            "SubBad": "0",
            "SubDownloadsCnt": "50000",
            "SubRating": "10",
            "SubSize": "200000",
            "SubDownloadLink": "https://example.test/wrong-format.gz",
        },
        {
            "SubFormat": "srt",
            "SubBad": "0",
            "SubDownloadsCnt": "1200",
            "SubRating": "0",
            "SubSize": "90000",
            "SubDownloadLink": "https://example.test/older.gz",
        },
        {
            "SubFormat": "srt",
            "SubBad": "0",
            "SubDownloadsCnt": "3000",
            "SubRating": "0",
            "SubSize": "80000",
            "SubDownloadLink": "https://example.test/popular.gz",
        },
    ]

    assert select_best_subtitle(rows)["SubDownloadLink"] == "https://example.test/popular.gz"


def test_load_movie_manifest_reads_versioned_movie_specs(tmp_path):
    manifest_path = tmp_path / "movies.json"
    manifest_path.write_text(
        json.dumps(
            {
                "language": "de",
                "movies": [
                    {"imdb_id": "tt0133093", "title": "The Matrix", "year": 1999},
                    {"imdb_id": "tt0109830", "title": "Forrest Gump"},
                ],
            }
        ),
        encoding="utf-8",
    )

    movies = opensubtitles_importer.load_movie_manifest(manifest_path)

    assert movies == [
        MovieSpec(imdb_id="tt0133093", title="The Matrix", year=1999),
        MovieSpec(imdb_id="tt0109830", title="Forrest Gump", year=None),
    ]


def test_default_movie_manifest_is_versioned_in_repo():
    script = import_module("scripts.import_opensubtitles_movies")

    assert script.DEFAULT_MANIFEST_PATH.name == "movie_manifest_de.json"
    assert script.DEFAULT_MANIFEST_PATH.exists()


def test_opensubtitles_config_reads_runtime_environment(monkeypatch):
    monkeypatch.setenv("OPENSUBTITLES_REST_BASE_URL", "https://opensubtitles.example.test/search")
    monkeypatch.setenv("OPENSUBTITLES_USER_AGENT", "LanguageAppTest/1.0")
    monkeypatch.setenv("OPENSUBTITLES_MIN_WORD_COUNT", "42")
    monkeypatch.setenv("OPENSUBTITLES_REQUEST_DELAY_SECONDS", "1.25")

    config = opensubtitles_importer.OpenSubtitlesConfig.from_env()

    assert config.base_url == "https://opensubtitles.example.test/search"
    assert config.user_agent == "LanguageAppTest/1.0"
    assert config.min_word_count == 42
    assert config.request_delay_seconds == 1.25


def test_opensubtitles_config_rejects_unsafe_runtime_values():
    with pytest.raises(ValueError, match="base_url"):
        opensubtitles_importer.OpenSubtitlesConfig(base_url="", user_agent="LanguageAppTest/1.0")

    with pytest.raises(ValueError, match="user_agent"):
        opensubtitles_importer.OpenSubtitlesConfig(base_url="https://example.test/search", user_agent="")

    with pytest.raises(ValueError, match="timeout"):
        opensubtitles_importer.OpenSubtitlesConfig(
            base_url="https://example.test/search",
            user_agent="LanguageAppTest/1.0",
            request_timeout_seconds=0,
        )


def test_search_subtitles_uses_configured_base_url_and_user_agent(monkeypatch):
    calls = []

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return [{"SubFormat": "srt", "SubDownloadLink": "https://example.test/sub.gz"}]

    def fake_get(url, *, headers, timeout, verify):
        calls.append({"url": url, "headers": headers, "timeout": timeout, "verify": verify})
        return FakeResponse()

    monkeypatch.setattr(opensubtitles_importer.requests, "get", fake_get)

    config = opensubtitles_importer.OpenSubtitlesConfig(
        base_url="https://opensubtitles.example.test/search",
        user_agent="LanguageAppTest/1.0",
        min_word_count=1000,
        request_delay_seconds=0,
    )

    rows = opensubtitles_importer.search_subtitles("tt0133093", language_id="ger", config=config)

    assert rows[0]["SubFormat"] == "srt"
    assert calls[0]["url"] == "https://opensubtitles.example.test/search/imdbid-133093/sublanguageid-ger"
    assert calls[0]["headers"] == {"User-Agent": "LanguageAppTest/1.0"}


def test_search_subtitles_retries_temporary_http_failures(monkeypatch):
    calls = []

    class FakeResponse:
        def __init__(self, status_code, payload):
            self.status_code = status_code
            self._payload = payload

        def raise_for_status(self):
            if self.status_code >= 400:
                raise requests.HTTPError(response=self)

        def json(self):
            return self._payload

    responses = [
        FakeResponse(503, {}),
        FakeResponse(200, [{"SubFormat": "srt", "SubDownloadLink": "https://example.test/sub.gz"}]),
    ]

    def fake_get(url, *, headers, timeout, verify):
        calls.append(url)
        return responses.pop(0)

    monkeypatch.setattr(opensubtitles_importer.requests, "get", fake_get)
    monkeypatch.setattr(opensubtitles_importer.time, "sleep", lambda _seconds: None)

    config = opensubtitles_importer.OpenSubtitlesConfig(
        base_url="https://opensubtitles.example.test/search",
        user_agent="LanguageAppTest/1.0",
        min_word_count=1000,
        request_delay_seconds=0,
        request_retry_count=1,
        request_retry_delay_seconds=0,
    )

    rows = opensubtitles_importer.search_subtitles("tt0133093", language_id="ger", config=config)

    assert rows[0]["SubDownloadLink"] == "https://example.test/sub.gz"
    assert len(calls) == 2


def test_download_subtitle_rejects_untrusted_or_local_urls():
    config = opensubtitles_importer.OpenSubtitlesConfig(
        base_url="https://opensubtitles.example.test/search",
        user_agent="LanguageAppTest/1.0",
        allowed_download_hosts=("dl.opensubtitles.org",),
    )

    with pytest.raises(ValueError, match="https"):
        opensubtitles_importer.download_subtitle("http://dl.opensubtitles.org/file.gz", config=config)

    with pytest.raises(ValueError, match="host"):
        opensubtitles_importer.download_subtitle("https://127.0.0.1/file.gz", config=config)

    with pytest.raises(ValueError, match="host"):
        opensubtitles_importer.download_subtitle("https://evil.example.test/file.gz", config=config)


def test_download_subtitle_enforces_compressed_and_decompressed_size_limits(monkeypatch):
    class FakeResponse:
        status_code = 200
        headers = {}
        url = "https://example.test/sub.gz"

        def __init__(self, payload):
            self.payload = payload

        def raise_for_status(self):
            return None

        def iter_content(self, chunk_size=65536):
            yield self.payload

    payload = gzip.compress(("Wort " * 100).encode("utf-8"))
    responses = [FakeResponse(payload), FakeResponse(payload)]

    def fake_get(url, *, headers, timeout, verify, allow_redirects, stream):
        return responses.pop(0)

    monkeypatch.setattr(opensubtitles_importer.requests, "get", fake_get)

    config = opensubtitles_importer.OpenSubtitlesConfig(
        base_url="https://opensubtitles.example.test/search",
        user_agent="LanguageAppTest/1.0",
        allowed_download_hosts=("example.test",),
        max_download_bytes=8,
        max_decompressed_bytes=1000,
    )

    with pytest.raises(ValueError, match="Download exceeded"):
        opensubtitles_importer.download_subtitle("https://example.test/sub.gz", config=config)

    config = opensubtitles_importer.OpenSubtitlesConfig(
        base_url="https://opensubtitles.example.test/search",
        user_agent="LanguageAppTest/1.0",
        allowed_download_hosts=("example.test",),
        max_download_bytes=10_000,
        max_decompressed_bytes=20,
    )

    with pytest.raises(ValueError, match="Decompressed subtitle exceeded"):
        opensubtitles_importer.download_subtitle("https://example.test/sub.gz", config=config)


def test_upsert_imported_subtitle_session_creates_movie_subtitle_stats_and_log(tmp_path):
    db_path = _make_sqlite_db(tmp_path / "movies.db")
    engine = create_engine(f"sqlite:///{db_path}")
    imported = ImportedSubtitle(
        movie=MovieSpec(imdb_id="tt0133093", title="The Matrix", year=1999),
        language="de",
        text="Wache auf Neo. Die Matrix hat dich.",
        metadata={"IDSubtitleFile": "123", "SubFileName": "matrix.de.srt"},
        source="opensubtitles_rest",
        license_note="OpenSubtitles REST API metadata/download",
        imported_at=datetime(2026, 5, 28, tzinfo=UTC),
    )

    with Session(engine) as session:
        result = opensubtitles_importer.upsert_imported_subtitle_session(session, imported)
        session.commit()

    with sqlite3.connect(db_path) as conn:
        movie = conn.execute("SELECT imdb_id, title, year FROM movies").fetchone()
        subtitle = conn.execute(
            "SELECT language, source, external_id, full_text, raw_blob FROM subtitles"
        ).fetchone()
        stats = conn.execute("SELECT word_count, unique_words FROM subtitle_stats").fetchone()
        log = conn.execute(
            "SELECT source, rows_in, rows_kept, rows_rejected, rejection_reasons FROM ingestion_log"
        ).fetchone()

    assert result.word_count == 7
    assert result.unique_words == 7
    assert movie == ("tt0133093", "The Matrix", 1999)
    assert subtitle[:4] == (
        "de",
        "opensubtitles_rest",
        "123",
        "Wache auf Neo. Die Matrix hat dich.",
    )
    assert json.loads(subtitle[4])["SubFileName"] == "matrix.de.srt"
    assert stats == (7, 7)
    assert log[:4] == ("opensubtitles_rest", 1, 1, 0)
    assert json.loads(log[4]) == {}


def test_upsert_imported_subtitle_session_uses_app_orm_models(tmp_path):
    db_path = _make_sqlite_db(tmp_path / "orm-movies.db")
    engine = create_engine(f"sqlite:///{db_path}")
    imported = ImportedSubtitle(
        movie=MovieSpec(imdb_id="tt0111161", title="The Shawshank Redemption", year=1994),
        language="de",
        text="Hoffnung ist eine gute Sache. Vielleicht die beste Sache.",
        metadata={"IDSubtitleFile": "456", "SubFileName": "shawshank.de.srt"},
        imported_at=datetime(2026, 5, 28, tzinfo=UTC),
    )

    with Session(engine) as session:
        result = opensubtitles_importer.upsert_imported_subtitle_session(session, imported)
        session.commit()

    assert result.imdb_id == "tt0111161"
    assert result.word_count == 9
    with sqlite3.connect(db_path) as conn:
        movie = conn.execute("SELECT imdb_id, title, year FROM movies").fetchone()
        subtitle = conn.execute("SELECT language, source, external_id FROM subtitles").fetchone()
        stats = conn.execute("SELECT word_count, unique_words FROM subtitle_stats").fetchone()

    assert movie == ("tt0111161", "The Shawshank Redemption", 1994)
    assert subtitle == ("de", "opensubtitles_rest", "456")
    assert stats == (9, 8)


def test_import_movie_batch_can_continue_after_failed_movie(tmp_path, monkeypatch):
    db_path = _make_sqlite_db(tmp_path / "batch.db")
    movies = [
        MovieSpec(imdb_id="ttok1", title="OK One", year=2001),
        MovieSpec(imdb_id="ttbad", title="Bad", year=2002),
        MovieSpec(imdb_id="ttok2", title="OK Two", year=2003),
    ]

    def fake_fetch(movie, *, language, config=None):
        if movie.imdb_id == "ttbad":
            raise ValueError("No usable subtitles")
        return ImportedSubtitle(
            movie=movie,
            language=language,
            text=f"{movie.title} hat genug Wörter für den Import.",
            metadata={"IDSubtitleFile": f"{movie.imdb_id}-sub"},
            imported_at=datetime(2026, 5, 28, tzinfo=UTC),
        )

    monkeypatch.setattr(opensubtitles_importer, "fetch_imported_subtitle", fake_fetch)

    report = import_movie_batch(
        str(db_path),
        movies,
        language="de",
        delay_seconds=0,
        continue_on_error=True,
    )

    assert isinstance(report, BatchImportReport)
    assert [result.imdb_id for result in report.results] == ["ttok1", "ttok2"]
    assert [(failure.imdb_id, failure.error) for failure in report.failures] == [
        ("ttbad", "No usable subtitles")
    ]

    with sqlite3.connect(db_path) as conn:
        assert conn.execute("SELECT COUNT(*) FROM movies").fetchone()[0] == 2


def test_import_movie_batch_uses_orm_upsert_for_sqlite_path(tmp_path, monkeypatch):
    db_path = _make_sqlite_db(tmp_path / "single-path.db")
    movies = [MovieSpec(imdb_id="ttok1", title="OK One", year=2001)]
    upsert_calls = []

    def fake_fetch(movie, *, language, config=None):
        return ImportedSubtitle(
            movie=movie,
            language=language,
            text="Ein Import über den gemeinsamen ORM Pfad.",
            metadata={"IDSubtitleFile": f"{movie.imdb_id}-sub"},
            imported_at=datetime(2026, 5, 28, tzinfo=UTC),
        )

    original_upsert = opensubtitles_importer.upsert_imported_subtitle_session

    def spy_upsert(session, imported):
        upsert_calls.append(imported.movie.imdb_id)
        return original_upsert(session, imported)

    monkeypatch.setattr(opensubtitles_importer, "fetch_imported_subtitle", fake_fetch)
    monkeypatch.setattr(opensubtitles_importer, "upsert_imported_subtitle_session", spy_upsert)

    report = import_movie_batch(str(db_path), movies, language="de", delay_seconds=0)

    assert [result.imdb_id for result in report.results] == ["ttok1"]
    assert upsert_calls == ["ttok1"]


def test_import_movie_batch_bootstraps_clean_sqlite_schema(tmp_path, monkeypatch):
    db_path = tmp_path / "clean-import.db"
    movies = [MovieSpec(imdb_id="ttok1", title="OK One", year=2001)]

    def fake_fetch(movie, *, language, config=None):
        return ImportedSubtitle(
            movie=movie,
            language=language,
            text="Ein sauberer Import erstellt das Schema selbst.",
            metadata={"IDSubtitleFile": f"{movie.imdb_id}-sub"},
            imported_at=datetime(2026, 5, 28, tzinfo=UTC),
        )

    monkeypatch.setattr(opensubtitles_importer, "fetch_imported_subtitle", fake_fetch)

    report = import_movie_batch(str(db_path), movies, language="de", delay_seconds=0)

    assert [result.imdb_id for result in report.results] == ["ttok1"]
    with sqlite3.connect(db_path) as conn:
        assert conn.execute("SELECT COUNT(*) FROM movies").fetchone()[0] == 1
