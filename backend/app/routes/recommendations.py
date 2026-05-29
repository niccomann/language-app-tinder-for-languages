from __future__ import annotations

import os
import re
import threading
import time
from typing import Any
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import requests
from sqlalchemy import text
from sqlmodel import Session, select

from app.core.user_middleware import require_user_id
from app.database import SessionDependency
from app.database.connection import DatabaseConnection
from app.database.models import FlashcardEntity, MovieEntity, SubtitleEntity
from app.services.recommender import LexicalAliases, Recommender, RecommenderCache, SUPPORTED_LANGUAGES
from app.services.schema_utils import database_column_exists, database_table_exists
from app.services.user_vocab import extract_user_vocab


router = APIRouter(prefix="/api/movies", tags=["movies"])

_DEFAULT_CACHE_TTL_SECONDS = 60 * 30
_MIN_ADMIN_TOKEN_LENGTH = 32
_cache: RecommenderCache | None = None
_cache_built_at: float | None = None
_cache_reset_at: float | None = None
_cache_lock = threading.Lock()
_poster_cache: dict[str, str | None] = {}
_poster_cache_lock = threading.Lock()
_IMDB_ID_RE = re.compile(r"^tt\d{7,}$")
_IMDB_SUGGEST_TIMEOUT_SECONDS = 4
_IMDB_SUGGEST_USER_AGENT = "LanguageAppMoviePoster/1.0 (https://customizeyourlingua.com)"


class MovieRecommendationOut(BaseModel):
    imdb_id: str
    title: str
    year: int | None = None
    score: float
    user_vocab_count: int
    shared_vocab_count: int
    subtitle_unique_word_count: int
    subtitle_token_count: int
    sample_known_words: list[str]


def _get_engine():
    return DatabaseConnection().engine


def _reset_cache() -> None:
    global _cache, _cache_built_at, _cache_reset_at
    with _cache_lock:
        _cache = None
        _cache_built_at = None
        _cache_reset_at = None


def _reset_poster_cache() -> None:
    with _poster_cache_lock:
        _poster_cache.clear()


def _is_safe_imdb_image_url(url: str) -> bool:
    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    return (
        parsed.scheme == "https"
        and (hostname == "m.media-amazon.com" or hostname.endswith(".media-amazon.com"))
    )


def _extract_imdb_image_url(payload: Any, imdb_id: str) -> str | None:
    if not isinstance(payload, dict):
        return None
    candidates = payload.get("d")
    if not isinstance(candidates, list):
        return None

    exact = next(
        (
            candidate
            for candidate in candidates
            if isinstance(candidate, dict) and candidate.get("id") == imdb_id
        ),
        None,
    )
    if exact is None:
        exact = next((candidate for candidate in candidates if isinstance(candidate, dict)), None)
    if not isinstance(exact, dict):
        return None

    image = exact.get("i")
    if not isinstance(image, dict):
        return None
    image_url = image.get("imageUrl")
    if not isinstance(image_url, str) or not _is_safe_imdb_image_url(image_url):
        return None
    return image_url


def _fetch_imdb_poster_url(imdb_id: str) -> str | None:
    if not _IMDB_ID_RE.match(imdb_id):
        return None

    with _poster_cache_lock:
        if imdb_id in _poster_cache:
            return _poster_cache[imdb_id]

    suggest_url = f"https://v2.sg.media-imdb.com/suggestion/t/{imdb_id}.json"
    try:
        response = requests.get(
            suggest_url,
            headers={"User-Agent": _IMDB_SUGGEST_USER_AGENT},
            timeout=_IMDB_SUGGEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        poster_url = _extract_imdb_image_url(response.json(), imdb_id)
    except (requests.RequestException, ValueError):
        poster_url = None

    with _poster_cache_lock:
        _poster_cache[imdb_id] = poster_url
    return poster_url


def _cache_ttl_seconds() -> int:
    raw = os.getenv("MOVIE_RECOMMENDER_CACHE_TTL_SECONDS", str(_DEFAULT_CACHE_TTL_SECONDS)).strip()
    try:
        return max(0, int(raw))
    except ValueError:
        return _DEFAULT_CACHE_TTL_SECONDS


def _cache_reset_min_interval_seconds() -> int:
    raw = os.getenv("MOVIE_RECOMMENDER_CACHE_RESET_MIN_INTERVAL_SECONDS", "60").strip()
    try:
        return max(0, int(raw))
    except ValueError:
        return 60


def _admin_token() -> str:
    token = os.getenv("MOVIE_RECOMMENDER_ADMIN_TOKEN", "").strip()
    if len(token) < _MIN_ADMIN_TOKEN_LENGTH:
        return ""
    return token


def _build_cache() -> RecommenderCache:
    grouped_text: dict[tuple[str, str], list[str]] = {}
    metadata: dict[str, dict[str, Any]] = {}
    lexical_aliases: LexicalAliases = {}

    with Session(_get_engine()) as session:
        rows = session.exec(
            select(MovieEntity, SubtitleEntity)
            .join(SubtitleEntity, SubtitleEntity.movie_id == MovieEntity.id)
            .where(
                SubtitleEntity.validated_at.is_not(None),
                SubtitleEntity.language.in_(SUPPORTED_LANGUAGES),
            )
            .order_by(
                SubtitleEntity.language,
                MovieEntity.imdb_id,
                SubtitleEntity.source,
                SubtitleEntity.id,
            )
        ).all()
        lexical_aliases = _build_lexical_aliases(session)

    for movie, subtitle in rows:
        if not movie.imdb_id:
            continue

        key = (subtitle.language, movie.imdb_id)
        grouped_text.setdefault(key, []).append(subtitle.full_text)
        metadata[movie.imdb_id] = {
            "title": movie.title,
            "year": movie.year,
            "genres": movie.genres,
        }

    corpus = {
        key: "\n".join(text_parts)
        for key, text_parts in grouped_text.items()
    }
    return RecommenderCache.from_corpus(
        corpus=corpus,
        metadata=metadata,
        lexical_aliases=lexical_aliases,
    )


def _build_lexical_aliases(session: Session) -> LexicalAliases:
    aliases: LexicalAliases = {}

    flashcards = session.exec(
        select(
            FlashcardEntity.word,
            FlashcardEntity.language,
            FlashcardEntity.plural_form,
        ).where(FlashcardEntity.language.in_(SUPPORTED_LANGUAGES))
    ).all()
    for word, language, plural_form in flashcards:
        _add_lexical_alias(aliases, language, word, word)
        _add_lexical_alias(aliases, language, plural_form, word)

    if (
        database_table_exists(session, "verb_conjugations")
        and database_column_exists(session, "verb_conjugations", "flashcard_id")
        and database_column_exists(session, "verb_conjugations", "form")
    ):
        rows = session.execute(
            text(
                """
                SELECT f.word AS lemma, f.language AS language, vc.form AS form
                FROM verb_conjugations vc
                JOIN flashcards f ON f.id = vc.flashcard_id
                WHERE f.language IN ('de', 'fr', 'it', 'en')
                  AND vc.form IS NOT NULL
                  AND vc.form != ''
                """
            )
        ).mappings().all()
        for row in rows:
            _add_lexical_alias(aliases, row["language"], row["form"], row["lemma"])

    return aliases


def _add_lexical_alias(
    aliases: LexicalAliases,
    language: str | None,
    surface: str | None,
    lemma: str | None,
) -> None:
    if not language or language not in SUPPORTED_LANGUAGES or not surface or not lemma:
        return
    aliases.setdefault(language, {})[surface] = lemma


def _get_cache() -> RecommenderCache:
    global _cache, _cache_built_at
    now = time.monotonic()
    ttl_seconds = _cache_ttl_seconds()
    cache_expired = _cache_built_at is not None and (now - _cache_built_at) > ttl_seconds
    if _cache is None or cache_expired:
        with _cache_lock:
            now = time.monotonic()
            ttl_seconds = _cache_ttl_seconds()
            cache_expired = _cache_built_at is not None and (now - _cache_built_at) > ttl_seconds
            if _cache is None or cache_expired:
                _cache = _build_cache()
                _cache_built_at = now
    return _cache


@router.get("/poster/{imdb_id}")
def get_movie_poster(imdb_id: str):
    poster_url = _fetch_imdb_poster_url(imdb_id)
    if poster_url is None:
        raise HTTPException(status_code=404, detail="Movie poster not found")
    return RedirectResponse(
        poster_url,
        status_code=302,
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.post("/recommendations/cache/reset")
def reset_recommendations_cache(request: Request):
    global _cache, _cache_built_at, _cache_reset_at
    expected_token = _admin_token()
    provided_token = request.headers.get("X-Admin-Token", "").strip()
    if not expected_token or provided_token != expected_token:
        raise HTTPException(status_code=403, detail="Invalid admin token")

    now = time.monotonic()
    min_interval = _cache_reset_min_interval_seconds()
    with _cache_lock:
        if _cache_reset_at is not None and (now - _cache_reset_at) < min_interval:
            raise HTTPException(status_code=429, detail="Cache reset rate limit exceeded")
        _cache = None
        _cache_built_at = None
        _cache_reset_at = now
    return {"status": "reset"}


@router.get("/recommendations", response_model=list[MovieRecommendationOut])
def get_recommendations(
    request: Request,
    session: SessionDependency,
    language: str = Query(default="de", pattern="^(de|fr|it|en)$"),
    limit: int = Query(default=20, ge=1, le=100),
):
    user_id = require_user_id(request)
    user_vocab = extract_user_vocab(session, user_id=user_id, language=language)

    if not user_vocab:
        return []

    recommender = Recommender(_get_cache())
    return recommender.recommend(
        user_vocab=user_vocab,
        language=language,
        limit=limit,
    )
