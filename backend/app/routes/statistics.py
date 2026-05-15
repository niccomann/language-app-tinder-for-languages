"""
Routes for user word statistics.
Tracks how well each user knows each word with a confidence score (0-100).
"""
from fastapi import APIRouter, Query
from typing import Literal, Optional, List
from datetime import datetime, UTC
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import SessionDependency
from app.database.models import LearningSnapshotEntity, UserWordStatisticsEntity
from app.services.adaptive_learning import (
    build_learning_summary,
    knowledge_level_from_confidence,
    next_confidence_score,
)

router = APIRouter(prefix="/api/statistics", tags=["statistics"])


class WordStatistics(BaseModel):
    """Statistics for a single word."""
    word: str
    language: str
    confidence_score: int
    knowledge_level: int
    times_seen: int
    times_correct: int
    times_incorrect: int
    last_practiced: Optional[datetime] = None


class UpdateStatisticsRequest(BaseModel):
    """Request to update word statistics after a swipe."""
    word: str
    language: str = "de"
    correct: bool
    user_id: str = "default_user"


class UpdateStatisticsResponse(BaseModel):
    """Response after updating statistics."""
    word: str
    new_confidence_score: int
    knowledge_level: int
    times_seen: int
    times_correct: int
    times_incorrect: int


class AdaptiveLearningSummary(BaseModel):
    """Daily adaptive learning dashboard summary."""
    average_confidence: float
    average_knowledge_level: float
    total_words_practiced: int
    total_practice_sessions: int
    words_struggling: int
    words_learning: int
    words_mastered: int
    path_xp: int
    path_level: int
    max_path_level: int
    xp_to_next_level: int
    path_level_progress: float
    trend: Literal["new", "improving", "stable", "declining"]
    level_delta: float
    last_practiced: Optional[datetime] = None
    days_since_last_practice: Optional[int] = None
    should_reengage: bool


def statistics_to_response(stats: UserWordStatisticsEntity) -> WordStatistics:
    return WordStatistics(
        word=stats.word,
        language=stats.language,
        confidence_score=stats.confidence_score,
        knowledge_level=knowledge_level_from_confidence(stats.confidence_score),
        times_seen=stats.times_seen,
        times_correct=stats.times_correct,
        times_incorrect=stats.times_incorrect,
        last_practiced=stats.last_practiced,
    )


def _get_user_stats(session: Session, language: str, user_id: str) -> List[UserWordStatisticsEntity]:
    query = select(UserWordStatisticsEntity).where(
        UserWordStatisticsEntity.language == language,
        UserWordStatisticsEntity.user_id == user_id,
    )
    return list(session.exec(query).all())


def _get_previous_snapshot(
    session: Session,
    *,
    language: str,
    user_id: str,
    now: datetime,
) -> Optional[LearningSnapshotEntity]:
    query = (
        select(LearningSnapshotEntity)
        .where(
            LearningSnapshotEntity.language == language,
            LearningSnapshotEntity.user_id == user_id,
            LearningSnapshotEntity.snapshot_date < now.date(),
        )
        .order_by(LearningSnapshotEntity.snapshot_date.desc())
    )
    return session.exec(query).first()


def _upsert_today_snapshot(
    session: Session,
    *,
    user_id: str,
    language: str,
    summary: dict,
    now: datetime,
) -> None:
    query = select(LearningSnapshotEntity).where(
        LearningSnapshotEntity.user_id == user_id,
        LearningSnapshotEntity.language == language,
        LearningSnapshotEntity.snapshot_date == now.date(),
    )
    snapshot = session.exec(query).first()

    if not snapshot:
        snapshot = LearningSnapshotEntity(
            user_id=user_id,
            language=language,
            snapshot_date=now.date(),
        )
        session.add(snapshot)

    snapshot.average_confidence = summary["average_confidence"]
    snapshot.average_knowledge_level = summary["average_knowledge_level"]
    snapshot.total_words_practiced = summary["total_words_practiced"]
    snapshot.total_practice_sessions = summary["total_practice_sessions"]
    snapshot.words_struggling = summary["words_struggling"]
    snapshot.words_learning = summary["words_learning"]
    snapshot.words_mastered = summary["words_mastered"]


@router.get("/word/{word}", response_model=WordStatistics)
async def get_word_statistics(
    session: SessionDependency,
    word: str,
    language: str = Query("de", description="Language code"),
    user_id: str = Query("default_user", description="User ID"),
) -> WordStatistics:
    """Get statistics for a specific word."""
    query = select(UserWordStatisticsEntity).where(
        UserWordStatisticsEntity.word == word,
        UserWordStatisticsEntity.language == language,
        UserWordStatisticsEntity.user_id == user_id,
    )
    stats = session.exec(query).first()
    
    if not stats:
        return WordStatistics(
            word=word,
            language=language,
            confidence_score=0,
            knowledge_level=1,
            times_seen=0,
            times_correct=0,
            times_incorrect=0,
            last_practiced=None,
        )
    
    return statistics_to_response(stats)


@router.get("/all", response_model=List[WordStatistics])
async def get_all_statistics(
    session: SessionDependency,
    language: str = Query("de", description="Language code"),
    user_id: str = Query("default_user", description="User ID"),
    min_confidence: Optional[int] = Query(None, description="Minimum confidence score"),
    max_confidence: Optional[int] = Query(None, description="Maximum confidence score"),
) -> List[WordStatistics]:
    """Get statistics for all words the user has practiced."""
    query = select(UserWordStatisticsEntity).where(
        UserWordStatisticsEntity.language == language,
        UserWordStatisticsEntity.user_id == user_id,
    )
    
    if min_confidence is not None:
        query = query.where(UserWordStatisticsEntity.confidence_score >= min_confidence)
    if max_confidence is not None:
        query = query.where(UserWordStatisticsEntity.confidence_score <= max_confidence)
    
    stats = session.exec(query).all()
    return [statistics_to_response(s) for s in stats]


@router.post("/update", response_model=UpdateStatisticsResponse)
async def update_word_statistics(
    session: SessionDependency,
    request: UpdateStatisticsRequest,
) -> UpdateStatisticsResponse:
    """
    Update statistics for a word after user swipes.
    - correct=true (swipe right/like): adaptive confidence increase
    - correct=false (swipe left/dislike): adaptive confidence decrease
    """
    query = select(UserWordStatisticsEntity).where(
        UserWordStatisticsEntity.word == request.word,
        UserWordStatisticsEntity.language == request.language,
        UserWordStatisticsEntity.user_id == request.user_id,
    )
    stats = session.exec(query).first()
    
    if not stats:
        stats = UserWordStatisticsEntity(
            word=request.word,
            language=request.language,
            user_id=request.user_id,
            confidence_score=0,
            times_seen=0,
            times_correct=0,
            times_incorrect=0,
        )
        session.add(stats)
    
    now = datetime.now(UTC)
    stats.times_seen += 1
    stats.last_practiced = now
    
    if request.correct:
        stats.times_correct += 1
    else:
        stats.times_incorrect += 1

    stats.confidence_score = next_confidence_score(stats.confidence_score, request.correct)
    
    session.commit()
    session.refresh(stats)

    all_stats = _get_user_stats(session, request.language, request.user_id)
    previous_snapshot = _get_previous_snapshot(
        session,
        language=request.language,
        user_id=request.user_id,
        now=now,
    )
    summary = build_learning_summary(
        all_stats,
        now=now,
        previous_average_knowledge_level=(
            previous_snapshot.average_knowledge_level
            if previous_snapshot
            else None
        ),
    )
    _upsert_today_snapshot(
        session,
        user_id=request.user_id,
        language=request.language,
        summary=summary,
        now=now,
    )
    session.commit()
    
    return UpdateStatisticsResponse(
        word=request.word,
        new_confidence_score=stats.confidence_score,
        knowledge_level=knowledge_level_from_confidence(stats.confidence_score),
        times_seen=stats.times_seen,
        times_correct=stats.times_correct,
        times_incorrect=stats.times_incorrect,
    )


@router.get("/adaptive-summary", response_model=AdaptiveLearningSummary)
async def get_adaptive_learning_summary(
    session: SessionDependency,
    language: str = Query("de", description="Language code"),
    user_id: str = Query("default_user", description="User ID"),
) -> AdaptiveLearningSummary:
    """Get adaptive dashboard metrics for the learning path home."""
    now = datetime.now(UTC)
    all_stats = _get_user_stats(session, language, user_id)
    previous_snapshot = _get_previous_snapshot(
        session,
        language=language,
        user_id=user_id,
        now=now,
    )
    summary = build_learning_summary(
        all_stats,
        now=now,
        previous_average_knowledge_level=(
            previous_snapshot.average_knowledge_level
            if previous_snapshot
            else None
        ),
    )

    return AdaptiveLearningSummary(**summary)

