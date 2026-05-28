from __future__ import annotations

import threading
import time
from typing import Any

from fastapi import APIRouter, Query, Request
from pydantic import BaseModel
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

_CACHE_TTL_SECONDS = 60 * 30
MIN_SUBTITLE_TOKEN_COUNT = 1000
MIN_SUBTITLE_UNIQUE_WORD_COUNT = 200
_cache: RecommenderCache | None = None
_cache_built_at: float | None = None
_cache_lock = threading.Lock()


class MovieRecommendationOut(BaseModel):
    imdb_id: str
    title: str
    year: int | None = None
    score: float
    shared_vocab_count: int
    subtitle_unique_word_count: int
    sample_known_words: list[str]


def _get_engine():
    return DatabaseConnection().engine


def _reset_cache() -> None:
    global _cache, _cache_built_at
    with _cache_lock:
        _cache = None
        _cache_built_at = None


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
        min_document_tokens=MIN_SUBTITLE_TOKEN_COUNT,
        min_unique_tokens=MIN_SUBTITLE_UNIQUE_WORD_COUNT,
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
    cache_expired = _cache_built_at is not None and (now - _cache_built_at) > _CACHE_TTL_SECONDS
    if _cache is None or cache_expired:
        with _cache_lock:
            now = time.monotonic()
            cache_expired = _cache_built_at is not None and (now - _cache_built_at) > _CACHE_TTL_SECONDS
            if _cache is None or cache_expired:
                _cache = _build_cache()
                _cache_built_at = now
    return _cache


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
