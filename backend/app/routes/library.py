"""
Library API routes for rich word exploration.
Route handlers keep FastAPI concerns here and delegate data work to services.
"""
from typing import List, Optional

from fastapi import APIRouter, Query

from app.database import SessionDependency
from app.models import FlashcardDetail, FlashcardWithProgress, LibraryFilters, LibraryStats
from app.services.library_service import (
    read_available_filters,
    read_dialect_words,
    read_library_stats,
    read_library_words,
    read_word_db_row,
    read_word_detail,
)

router = APIRouter(prefix="/api/library", tags=["library"])


@router.get("/filters", response_model=LibraryFilters)
async def get_available_filters(
    session: SessionDependency,
    language: Optional[str] = Query("de", description="Filter by language"),
):
    """
    Get all available filter options for the library.
    Returns distinct values for each filterable field.
    """
    return read_available_filters(session, language)


@router.get("/stats", response_model=LibraryStats)
async def get_library_stats(
    session: SessionDependency,
    language: Optional[str] = Query("de", description="Filter by language"),
):
    """
    Get statistics about the word library.
    """
    return read_library_stats(session, language)


@router.get("/words", response_model=List[FlashcardWithProgress])
async def get_library_words(
    session: SessionDependency,
    language: Optional[str] = Query("de", description="Filter by language"),
    search: Optional[str] = Query(None, description="Search in word or translation"),
    category: Optional[str] = Query(None, description="Filter by category"),
    cefr_level: Optional[str] = Query(None, description="Filter by CEFR level (A1-C2)"),
    frequency_band: Optional[str] = Query(None, description="Filter by frequency"),
    register: Optional[str] = Query(None, description="Filter by register"),
    gender: Optional[str] = Query(None, description="Filter by gender (masculine/feminine/neuter)"),
    part_of_speech: Optional[str] = Query(None, description="Filter by part of speech"),
    is_compound: Optional[bool] = Query(None, description="Filter compound words"),
    word_formation: Optional[str] = Query(None, description="Filter by word formation type"),
    status: Optional[str] = Query(None, description="Filter by learning status: known/unknown"),
    limit: Optional[int] = Query(100, description="Limit results"),
    offset: Optional[int] = Query(0, description="Offset for pagination"),
    user_id: str = Query("default_user", description="User ID"),
):
    """
    Get flashcards with advanced filters and progress information.
    Supports filtering by all linguistic attributes.
    """
    return read_library_words(
        session=session,
        language=language,
        search=search,
        category=category,
        cefr_level=cefr_level,
        frequency_band=frequency_band,
        register=register,
        gender=gender,
        part_of_speech=part_of_speech,
        is_compound=is_compound,
        word_formation=word_formation,
        status=status,
        limit=limit,
        offset=offset,
        user_id=user_id,
    )


@router.get("/words/{word_id}", response_model=FlashcardDetail)
async def get_word_detail(
    session: SessionDependency,
    word_id: int,
):
    """
    Get complete word detail with all relational data.
    Includes etymology, examples, false friends, proverbs, collocations, dialect variants.
    """
    return read_word_detail(session, word_id)


@router.get("/words/{word_id}/db-row")
async def get_word_db_row(
    session: SessionDependency,
    word_id: int,
):
    """
    Return the complete producer-schema row for database review.
    Large media blobs are summarized separately so the UI can inspect fields safely.
    """
    return read_word_db_row(session, word_id)


@router.get("/dialects")
async def get_dialect_words(
    session: SessionDependency,
    language: Optional[str] = Query("de", description="Filter by language"),
):
    """
    Get all words that have dialect variants.
    Returns words with their regional dialect variants for the DialectMap feature.
    """
    return read_dialect_words(session, language)
