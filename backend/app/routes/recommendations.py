from __future__ import annotations

import threading
from typing import Any

from fastapi import APIRouter, Query, Request
from sqlmodel import Session, select

from app.core.user_middleware import require_user_id
from app.database.connection import DatabaseConnection
from app.database.models import MovieEntity, SubtitleEntity
from app.services.recommender import Recommender, RecommenderCache, SUPPORTED_LANGUAGES
from app.services.user_vocab import extract_user_vocab


router = APIRouter(prefix="/api/movies", tags=["movies"])

_db = DatabaseConnection()
_cache: RecommenderCache | None = None
_cache_lock = threading.Lock()


def _get_engine():
    return _db.engine


def _reset_cache() -> None:
    global _cache
    with _cache_lock:
        _cache = None


def _build_cache() -> RecommenderCache:
    grouped_text: dict[tuple[str, str], list[str]] = {}
    metadata: dict[str, dict[str, Any]] = {}

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
    return RecommenderCache.from_corpus(corpus=corpus, metadata=metadata)


def _get_cache() -> RecommenderCache:
    global _cache
    if _cache is None:
        with _cache_lock:
            if _cache is None:
                _cache = _build_cache()
    return _cache


@router.get("/recommendations")
def get_recommendations(
    request: Request,
    language: str = Query(default="de", pattern="^(de|fr|it|en)$"),
    limit: int = Query(default=20, ge=1, le=100),
):
    user_id = require_user_id(request)

    with Session(_get_engine()) as session:
        user_vocab = extract_user_vocab(session, user_id=user_id, language=language)

    if not user_vocab:
        return []

    recommender = Recommender(_get_cache())
    return recommender.recommend(
        user_vocab=user_vocab,
        language=language,
        limit=limit,
    )
