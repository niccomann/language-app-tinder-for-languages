"""
Routes for user word statistics.
Tracks how well each user knows each word with a confidence score (0-100).
"""
from fastapi import APIRouter, Query
from typing import Optional, List
from datetime import datetime, UTC
from pydantic import BaseModel
from sqlmodel import select

from app.database import SessionDependency
from app.database.models import UserWordStatisticsEntity
from app.services.adaptive_learning import knowledge_level_from_confidence, next_confidence_score

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
    
    stats.times_seen += 1
    stats.last_practiced = datetime.now(UTC)
    
    if request.correct:
        stats.times_correct += 1
    else:
        stats.times_incorrect += 1

    stats.confidence_score = next_confidence_score(stats.confidence_score, request.correct)
    
    session.commit()
    session.refresh(stats)
    
    return UpdateStatisticsResponse(
        word=request.word,
        new_confidence_score=stats.confidence_score,
        knowledge_level=knowledge_level_from_confidence(stats.confidence_score),
        times_seen=stats.times_seen,
        times_correct=stats.times_correct,
        times_incorrect=stats.times_incorrect,
    )


@router.get("/summary")
async def get_statistics_summary(
    session: SessionDependency,
    language: str = Query("de", description="Language code"),
    user_id: str = Query("default_user", description="User ID"),
):
    """Get a summary of user's learning progress."""
    query = select(UserWordStatisticsEntity).where(
        UserWordStatisticsEntity.language == language,
        UserWordStatisticsEntity.user_id == user_id,
    )
    all_stats = session.exec(query).all()
    
    if not all_stats:
        return {
            "total_words_practiced": 0,
            "average_confidence": 0,
            "words_mastered": 0,
            "words_learning": 0,
            "words_struggling": 0,
            "total_practice_sessions": 0,
        }
    
    total_confidence = sum(s.confidence_score for s in all_stats)
    total_sessions = sum(s.times_seen for s in all_stats)
    
    return {
        "total_words_practiced": len(all_stats),
        "average_confidence": round(total_confidence / len(all_stats), 1),
        "words_mastered": len([s for s in all_stats if s.confidence_score >= 80]),
        "words_learning": len([s for s in all_stats if 30 <= s.confidence_score < 80]),
        "words_struggling": len([s for s in all_stats if s.confidence_score < 30]),
        "total_practice_sessions": total_sessions,
    }
