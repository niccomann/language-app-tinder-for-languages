from fastapi import APIRouter, Query
from typing import Optional, List
from sqlmodel import select, func
from datetime import datetime, UTC

from app.models import Flashcard, ProgressRequest, ProgressResponse
from app.database import SessionDependency
from app.database.models import FlashcardEntity, UserProgressEntity

router = APIRouter(prefix="/api", tags=["cards"])


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
        select(UserProgressEntity).where(UserProgressEntity.card_id == progress_request.card_id)
    ).first()
    
    if existing_progress:
        # Update existing progress
        existing_progress.known = progress_request.known
        existing_progress.review_count += 1
        existing_progress.last_reviewed = datetime.now(UTC)
        session.add(existing_progress)
    else:
        # Create new progress entry
        new_progress = UserProgressEntity(
            card_id=progress_request.card_id,
            known=progress_request.known,
            review_count=1,
            last_reviewed=datetime.now(UTC)
        )
        session.add(new_progress)
    
    session.commit()
    
    # Calculate statistics
    total_reviewed = session.exec(select(func.count(UserProgressEntity.id))).one()
    known_count = session.exec(
        select(func.count(UserProgressEntity.id)).where(UserProgressEntity.known == True)
    ).one()
    unknown_count = session.exec(
        select(func.count(UserProgressEntity.id)).where(UserProgressEntity.known == False)
    ).one()
    
    return ProgressResponse(
        cards_reviewed=total_reviewed,
        known_count=known_count,
        unknown_count=unknown_count
    )


@router.get("/progress", response_model=ProgressResponse)
async def get_progress(session: SessionDependency):
    """
    Get current progress statistics from database
    """
    total_reviewed = session.exec(select(func.count(UserProgressEntity.id))).one()
    known_count = session.exec(
        select(func.count(UserProgressEntity.id)).where(UserProgressEntity.known == True)
    ).one()
    unknown_count = session.exec(
        select(func.count(UserProgressEntity.id)).where(UserProgressEntity.known == False)
    ).one()
    
    return ProgressResponse(
        cards_reviewed=total_reviewed,
        known_count=known_count,
        unknown_count=unknown_count
    )


@router.post("/progress/reset")
async def reset_progress(session: SessionDependency):
    """
    Reset progress statistics by deleting all progress records from database
    """
    # Delete all progress records
    progress_records = session.exec(select(UserProgressEntity)).all()
    for record in progress_records:
        session.delete(record)
    
    session.commit()
    
    return {"message": "Progress reset successfully"}
