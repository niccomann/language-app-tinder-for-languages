from fastapi import APIRouter, Query
from typing import Optional, List
from sqlmodel import select, func
from datetime import datetime, UTC
from pydantic import BaseModel

from app.models import Flashcard, ProgressRequest, ProgressResponse
from app.database import SessionDependency
from app.database.models import FlashcardEntity, UserProgressEntity

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
        if progress_request.known:
            existing_progress.swipe_right_count += 1
        else:
            existing_progress.swipe_left_count += 1
        existing_progress.last_reviewed = datetime.now(UTC)
        session.add(existing_progress)
    else:
        # Create new progress entry
        new_progress = UserProgressEntity(
            card_id=progress_request.card_id,
            known=progress_request.known,
            review_count=1,
            swipe_right_count=1 if progress_request.known else 0,
            swipe_left_count=0 if progress_request.known else 1,
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


@router.get("/words/library", response_model=List[FlashcardWithProgress])
async def get_words_library(
    session: SessionDependency,
    status: Optional[str] = Query(None, description="Filter by status: 'known', 'unknown', or 'all'"),
    language: Optional[str] = Query(None, description="Language code (required)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search by word or translation")
):
    """
    Get all words with their learning progress status
    Returns flashcards with known/unknown status and review statistics
    """
    # Get all flashcards
    flashcards_query = select(FlashcardEntity)
    
    if language:
        flashcards_query = flashcards_query.where(FlashcardEntity.language == language)
    
    if category:
        flashcards_query = flashcards_query.where(FlashcardEntity.category == category)
    
    if search:
        search_pattern = f"%{search.lower()}%"
        flashcards_query = flashcards_query.where(
            (func.lower(FlashcardEntity.word).like(search_pattern)) |
            (func.lower(FlashcardEntity.translation).like(search_pattern))
        )
    
    flashcards = session.exec(flashcards_query).all()
    
    # Get all progress records
    progress_records = session.exec(select(UserProgressEntity)).all()
    progress_map = {record.card_id: record for record in progress_records}
    
    # Combine flashcards with progress
    result = []
    for card in flashcards:
        card_id = str(card.id)
        progress = progress_map.get(card_id)
        
        # Apply status filter
        if status == "known" and (not progress or not progress.known):
            continue
        elif status == "unknown" and (not progress or progress.known):
            continue
        
        result.append(FlashcardWithProgress(
            id=card.id,
            word=card.word,
            translation=card.translation,
            image_base64=card.image_base64,
            language=card.language,
            difficulty=card.difficulty,
            category=card.category,
            known=progress.known if progress else None,
            review_count=progress.review_count if progress else None,
            swipe_right_count=progress.swipe_right_count if progress else None,
            swipe_left_count=progress.swipe_left_count if progress else None,
            last_reviewed=progress.last_reviewed if progress else None
        ))
    
    return result
