from typing import Optional

from fastapi import HTTPException
from sqlmodel import Session

from app.models import FlashcardDetail, FlashcardWithProgress, LibraryFilters, LibraryStats
from app.services.library_queries import (
    count_words_with_related_rows,
    fetch_detail_related_rows,
    fetch_dialect_rows,
    fetch_flashcard_by_id,
    fetch_flashcards_for_language,
    fetch_full_related_rows,
    fetch_library_flashcards,
    fetch_producer_word_for_card,
    fetch_progress_map,
)
from app.services.library_serializers import (
    build_flashcard_detail,
    build_flashcard_with_progress,
    build_word_db_row,
    count_by_attribute,
    group_dialect_words,
)


def read_available_filters(session: Session, language: Optional[str]) -> LibraryFilters:
    flashcards = fetch_flashcards_for_language(session, language)

    return LibraryFilters(
        cefr_levels=sorted(set(card.cefr_level for card in flashcards if card.cefr_level)),
        frequency_bands=sorted(set(card.frequency_band for card in flashcards if card.frequency_band)),
        registers=sorted(set(card.language_register for card in flashcards if card.language_register)),
        genders=sorted(set(card.gender for card in flashcards if card.gender)),
        parts_of_speech=sorted(set(card.part_of_speech for card in flashcards if card.part_of_speech)),
        word_formations=sorted(set(card.word_formation for card in flashcards if card.word_formation)),
        categories=sorted(set(card.category for card in flashcards if card.category)),
        thematic_domains=sorted(set(card.thematic_domain for card in flashcards if card.thematic_domain)),
    )


def read_library_stats(session: Session, language: Optional[str]) -> LibraryStats:
    flashcards = fetch_flashcards_for_language(session, language)

    return LibraryStats(
        total_words=len(flashcards),
        words_with_etymology=count_words_with_related_rows(session, "etymologies", language),
        words_with_examples=count_words_with_related_rows(session, "example_sentences", language),
        words_with_false_friends=count_words_with_related_rows(session, "false_friends", language),
        words_with_proverbs=count_words_with_related_rows(session, "proverbs", language),
        by_cefr_level=count_by_attribute(flashcards, "cefr_level"),
        by_gender=count_by_attribute(flashcards, "gender"),
        by_part_of_speech=count_by_attribute(flashcards, "part_of_speech"),
    )


def read_library_words(
    session: Session,
    language: Optional[str],
    search: Optional[str],
    category: Optional[str],
    cefr_level: Optional[str],
    frequency_band: Optional[str],
    register: Optional[str],
    gender: Optional[str],
    part_of_speech: Optional[str],
    is_compound: Optional[bool],
    word_formation: Optional[str],
    status: Optional[str],
    limit: Optional[int],
    offset: Optional[int],
) -> list[FlashcardWithProgress]:
    flashcards = fetch_library_flashcards(
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
        limit=limit,
        offset=offset,
    )
    progress_map = fetch_progress_map(session)

    result = []
    for card in flashcards:
        progress = progress_map.get(str(card.id))

        if status == "known" and (not progress or not progress.known):
            continue
        if status == "unknown" and (not progress or progress.known):
            continue

        result.append(build_flashcard_with_progress(card, progress))

    return result


def read_word_detail(session: Session, word_id: int) -> FlashcardDetail:
    card = fetch_flashcard_by_id(session, word_id)
    if not card:
        raise HTTPException(status_code=404, detail="Word not found")

    producer_word = fetch_producer_word_for_card(session, card)
    producer_word_id = producer_word["id"] if producer_word else None
    related = fetch_detail_related_rows(session, producer_word_id)
    return build_flashcard_detail(card, related)


def read_word_db_row(session: Session, word_id: int) -> dict:
    card = fetch_flashcard_by_id(session, word_id)
    if not card:
        raise HTTPException(status_code=404, detail="Word not found")

    producer_word = fetch_producer_word_for_card(session, card)
    if not producer_word:
        raise HTTPException(status_code=404, detail="Producer word row not found")

    related = fetch_full_related_rows(session, producer_word["id"])
    return build_word_db_row(card, producer_word, related)


def read_dialect_words(session: Session, language: Optional[str]) -> list[dict]:
    return group_dialect_words(fetch_dialect_rows(session, language))
