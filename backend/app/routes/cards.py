from fastapi import APIRouter, Query
from typing import Optional, List
from sqlmodel import select, func, delete
from sqlalchemy.orm import defer
from datetime import datetime, UTC
from pydantic import BaseModel, ConfigDict, Field
from types import SimpleNamespace

from app.models import AdaptiveFlashcardQueryRequest, Flashcard, ProgressRequest, ProgressResponse
from app.database import SessionDependency
from app.database.models import FlashcardEntity, UserProgressEntity, UserWordStatisticsEntity
from app.services.adaptive_learning import (
    adaptive_sort_key,
    knowledge_level_from_confidence,
    selection_reason,
)
from app.services.preference_filter import select_preference_weighted_candidates

CEFR_ORDER = ("A1", "A2", "B1", "B2")


def allowed_cefr_levels(max_cefr_level: Optional[str]) -> Optional[tuple[str, ...]]:
    if not max_cefr_level:
        return None
    normalized = max_cefr_level.strip().upper()
    if normalized not in CEFR_ORDER:
        return None
    return CEFR_ORDER[: CEFR_ORDER.index(normalized) + 1]


def _hydrate_media_for(session, selected):
    """Batch-fetch image_base64 + audio_base64 for only the selected top-N cards.

    The adaptive endpoints first run a metadata-only scan over the language's
    flashcards (image_base64 is deferred, since it's ~100KB per row × thousands
    of rows = hundreds of MB pulled per request). After the top-N have been
    chosen, we hydrate those few rows with their media here.
    """
    ids = [card.id for _, card, _ in selected]
    if not ids:
        return
    rows = session.exec(
        select(FlashcardEntity.id, FlashcardEntity.image_base64, FlashcardEntity.audio_base64)
        .where(FlashcardEntity.id.in_(ids))
    ).all()
    media = {row[0]: (row[1], row[2]) for row in rows}
    for _, card, _ in selected:
        img, aud = media.get(card.id, (None, None))
        card.image_base64 = img
        card.audio_base64 = aud


def load_adaptive_candidates(
    session: SessionDependency,
    language: str,
    categories: Optional[List[str]],
    user_id: str,
    max_cefr_level: Optional[str] = None,
) -> list[tuple[SimpleNamespace, FlashcardEntity, Optional[UserWordStatisticsEntity]]]:
    """Metadata-only scan of cards + user stats, returned as adaptive candidates.

    image_base64/audio_base64 stay deferred until the caller picks the top-N
    and hands them to _hydrate_media_for.
    """
    query = (
        select(FlashcardEntity)
        .where(FlashcardEntity.language == language)
        .options(defer(FlashcardEntity.image_base64), defer(FlashcardEntity.audio_base64))
    )
    if categories:
        query = query.where(FlashcardEntity.category.in_(categories))
    levels = allowed_cefr_levels(max_cefr_level)
    if levels:
        query = query.where(FlashcardEntity.cefr_level.in_(levels))
    cards = session.exec(query).all()
    stats_by_word = get_user_stats_by_word(session, language, user_id)
    return build_adaptive_candidates(cards, stats_by_word)

router = APIRouter(prefix="/api", tags=["cards"])


class FlashcardWithProgress(BaseModel):
    """Flashcard with progress information"""
    id: int
    word: str
    translation: str
    image_base64: Optional[str] = None
    language: str
    difficulty: Optional[str] = None
    category: Optional[str] = None
    known: Optional[bool] = None
    review_count: Optional[int] = None
    swipe_right_count: Optional[int] = None
    swipe_left_count: Optional[int] = None
    last_reviewed: Optional[datetime] = None


class AdaptiveFlashcard(Flashcard):
    """Flashcard enriched with adaptive learning metadata."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    cefr_level: Optional[str] = None
    frequency_band: Optional[str] = None
    language_register: Optional[str] = Field(default=None, alias="register", serialization_alias="register")
    thematic_domain: Optional[str] = None
    part_of_speech: Optional[str] = None
    confidence_score: int = 0
    knowledge_level: int = 1
    times_seen: int = 0
    times_correct: int = 0
    times_incorrect: int = 0
    last_practiced: Optional[datetime] = None
    selection_reason: str


def build_adaptive_candidates(
    cards: list[FlashcardEntity],
    stats_by_word: dict[tuple[str, str], UserWordStatisticsEntity],
) -> list[tuple[SimpleNamespace, FlashcardEntity, Optional[UserWordStatisticsEntity]]]:
    candidates: list[tuple[SimpleNamespace, FlashcardEntity, Optional[UserWordStatisticsEntity]]] = []
    for card in cards:
        stats = stats_by_word.get((card.word, card.language))
        confidence_score = stats.confidence_score if stats else 0
        times_seen = stats.times_seen if stats else 0
        last_practiced = stats.last_practiced if stats else None
        candidate = SimpleNamespace(
            id=card.id,
            confidence_score=confidence_score,
            times_seen=times_seen,
            last_practiced=last_practiced,
        )
        candidates.append((candidate, card, stats))
    return candidates


def adaptive_flashcard_from_candidate(
    candidate: SimpleNamespace,
    card: FlashcardEntity,
    stats: Optional[UserWordStatisticsEntity],
) -> AdaptiveFlashcard:
    card_data = Flashcard.model_validate(card).model_dump()
    confidence_score = candidate.confidence_score
    return AdaptiveFlashcard(
        **card_data,
        cefr_level=card.cefr_level,
        frequency_band=card.frequency_band,
        language_register=card.language_register,
        thematic_domain=card.thematic_domain,
        part_of_speech=card.part_of_speech,
        confidence_score=confidence_score,
        knowledge_level=knowledge_level_from_confidence(confidence_score),
        times_seen=candidate.times_seen,
        times_correct=stats.times_correct if stats else 0,
        times_incorrect=stats.times_incorrect if stats else 0,
        last_practiced=candidate.last_practiced,
        selection_reason=selection_reason(candidate),
    )


def get_user_stats_by_word(
    session: SessionDependency,
    language: str,
    user_id: str,
) -> dict[tuple[str, str], UserWordStatisticsEntity]:
    stats_rows = session.exec(
        select(UserWordStatisticsEntity).where(
            UserWordStatisticsEntity.language == language,
            UserWordStatisticsEntity.user_id == user_id,
        )
    ).all()
    return {(stats.word, stats.language): stats for stats in stats_rows}


def progress_response_for_user(session: SessionDependency, user_id: str) -> ProgressResponse:
    total_reviewed = session.exec(
        select(func.count(UserProgressEntity.id)).where(UserProgressEntity.user_id == user_id)
    ).one()
    known_count = session.exec(
        select(func.count(UserProgressEntity.id)).where(
            UserProgressEntity.user_id == user_id,
            UserProgressEntity.known.is_(True),
        )
    ).one()
    unknown_count = session.exec(
        select(func.count(UserProgressEntity.id)).where(
            UserProgressEntity.user_id == user_id,
            UserProgressEntity.known.is_(False),
        )
    ).one()

    return ProgressResponse(
        cards_reviewed=total_reviewed,
        known_count=known_count,
        unknown_count=unknown_count,
    )


@router.get("/cards", response_model=List[Flashcard])
async def get_flashcards(
    session: SessionDependency,
    language: Optional[str] = Query(None, description="Filter by language code (e.g., 'de')"),
    category: Optional[str] = Query(None, description="Filter by category (e.g., 'animals')"),
    limit: Optional[int] = Query(None, description="Limit number of cards returned")
):
    """
    Get list of flashcards with optional filters from database
    """
    query = select(FlashcardEntity)
    
    if language:
        query = query.where(FlashcardEntity.language == language)
    
    if category:
        query = query.where(FlashcardEntity.category == category)
    
    if limit:
        query = query.limit(limit)
    
    flashcards = session.exec(query).all()
    
    return [Flashcard.model_validate(card) for card in flashcards]


@router.get("/cards/adaptive", response_model=List[AdaptiveFlashcard])
async def get_adaptive_flashcards(
    session: SessionDependency,
    language: str = Query("de", description="Language code"),
    category: Optional[List[str]] = Query(None, description="Repeated category filters"),
    limit: int = Query(50, ge=1, le=500, description="Maximum number of adaptive cards"),
    user_id: str = Query("default_user", description="User ID"),
    max_cefr_level: Optional[str] = Query(None, description="Hard cap for path-unlocked CEFR level"),
):
    """
    Get flashcards ordered by adaptive learning usefulness.

    Reuses user_word_statistics as the mastery source:
    struggling seen words first, then new words, learning words, and mastered review cards.
    """
    candidates = load_adaptive_candidates(session, language, category, user_id, max_cefr_level)
    selected = sorted(candidates, key=lambda item: adaptive_sort_key(item[0]))[:limit]
    _hydrate_media_for(session, selected)

    return [
        adaptive_flashcard_from_candidate(candidate, card, stats)
        for candidate, card, stats in selected
    ]


@router.post("/cards/adaptive/query", response_model=List[AdaptiveFlashcard])
async def query_adaptive_flashcards(
    session: SessionDependency,
    request: AdaptiveFlashcardQueryRequest,
):
    """
    Get adaptive flashcards through a soft preference profile.

    The profile biases ordering without hard-locking the learner into one topic:
    selected domains are prioritized, functional grammar words are preserved,
    and fallback/exploration cards remain available.
    """
    candidates = load_adaptive_candidates(
        session, request.language, request.selected_categories, request.user_id, request.max_cefr_level
    )
    selected = select_preference_weighted_candidates(
        candidates,
        request.profile,
        request.limit,
        adaptive_sort_key,
    )
    _hydrate_media_for(session, selected)

    return [
        adaptive_flashcard_from_candidate(candidate, card, stats)
        for candidate, card, stats in selected
    ]


@router.post("/progress", response_model=ProgressResponse)
async def record_progress(
    session: SessionDependency,
    progress_request: ProgressRequest
):
    """
    Record user's swipe action (known/unknown) in database
    """
    # Check if progress already exists for this card
    existing_progress = session.exec(
        select(UserProgressEntity).where(
            UserProgressEntity.user_id == progress_request.user_id,
            UserProgressEntity.card_id == progress_request.card_id,
        )
    ).first()
    
    if existing_progress:
        # Update existing progress
        existing_progress.known = progress_request.known
        existing_progress.review_count += 1
        if progress_request.known:
            existing_progress.swipe_right_count += 1
        else:
            existing_progress.swipe_left_count += 1
        existing_progress.last_reviewed = datetime.now(UTC)
        session.add(existing_progress)
    else:
        # Create new progress entry
        new_progress = UserProgressEntity(
            user_id=progress_request.user_id,
            card_id=progress_request.card_id,
            known=progress_request.known,
            review_count=1,
            swipe_right_count=1 if progress_request.known else 0,
            swipe_left_count=0 if progress_request.known else 1,
            last_reviewed=datetime.now(UTC)
        )
        session.add(new_progress)
    
    session.commit()
    
    return progress_response_for_user(session, progress_request.user_id)


@router.get("/progress", response_model=ProgressResponse)
async def get_progress(
    session: SessionDependency,
    user_id: str = Query("default_user", description="User ID"),
):
    """
    Get current progress statistics from database
    """
    return progress_response_for_user(session, user_id)


@router.post("/progress/reset")
async def reset_progress(
    session: SessionDependency,
    user_id: str = Query("default_user", description="User ID"),
):
    """
    Reset progress statistics by deleting all progress records from database
    """
    session.exec(delete(UserProgressEntity).where(UserProgressEntity.user_id == user_id))
    session.commit()
    return {"message": "Progress reset successfully"}
