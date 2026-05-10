from typing import Any

from sqlalchemy import text
from sqlmodel import select

from app.database import SessionDependency
from app.database.models import FlashcardEntity
from app.services.grammar_conjugations import build_present_conjugation_rows
from app.services.grammar_starter_cards import (
    build_grammar_starter_cards,
    card_part_of_speech,
)
from app.services.schema_utils import database_column_exists, database_table_exists


def get_source_word_ids_by_flashcard(session: SessionDependency, language: str) -> dict[int, int]:
    if not database_table_exists(session, "words"):
        return {}

    order_by_ground_truth = (
        "CASE WHEN w.is_ground_truth THEN 0 ELSE 1 END,"
        if database_column_exists(session, "words", "is_ground_truth")
        else ""
    )
    rows = session.execute(
        text(
            f"""
            SELECT
                f.id AS flashcard_id,
                w.id AS source_word_id
            FROM flashcards f
            JOIN words w ON w.word = f.word AND w.language = f.language
            WHERE f.language = :language
            ORDER BY f.id, {order_by_ground_truth} w.id
            """
        ),
        {"language": language},
    ).mappings().all()

    source_word_ids: dict[int, int] = {}
    for row in rows:
        flashcard_id = int(row["flashcard_id"])
        if flashcard_id not in source_word_ids:
            source_word_ids[flashcard_id] = int(row["source_word_id"])
    return source_word_ids


def group_present_conjugation_rows(rows: list[dict[str, Any]]) -> dict[int, list[dict[str, Any]]]:
    conjugations: dict[int, list[dict[str, Any]]] = {}
    seen: set[tuple[int, str]] = set()
    for row in rows:
        flashcard_id = int(row["flashcard_id"])
        key = (flashcard_id, row["pronoun"])
        if key in seen:
            continue
        seen.add(key)
        conjugations.setdefault(flashcard_id, []).append(dict(row))
    return conjugations


def build_fallback_present_conjugations(lemma: str) -> list[dict[str, Any]]:
    return build_present_conjugation_rows(lemma)


def get_fallback_present_conjugations_by_flashcard(
    session: SessionDependency,
    language: str,
) -> dict[int, list[dict[str, Any]]]:
    cards = session.exec(
        select(FlashcardEntity)
        .where(FlashcardEntity.language == language)
        .order_by(FlashcardEntity.id)
    ).all()

    starter_cards = build_grammar_starter_cards(cards, language)
    conjugations: dict[int, list[dict[str, Any]]] = {}
    for card in [*cards, *starter_cards]:
        if card.id is None or card_part_of_speech(card) != "verb":
            continue
        fallback_rows = build_fallback_present_conjugations(card.word)
        if fallback_rows:
            conjugations[int(card.id)] = fallback_rows
    return conjugations


def get_present_conjugations_by_flashcard(session: SessionDependency, language: str) -> dict[int, list[dict[str, Any]]]:
    if not database_table_exists(session, "verb_conjugations"):
        return get_fallback_present_conjugations_by_flashcard(session, language)

    if database_column_exists(session, "verb_conjugations", "flashcard_id"):
        rows = session.execute(
            text(
                """
                SELECT
                    flashcard_id,
                    mood,
                    tense,
                    person,
                    number,
                    pronoun,
                    form
                FROM verb_conjugations
                WHERE mood = 'indicative'
                  AND tense = 'present'
                  AND flashcard_id IN (
                      SELECT id FROM flashcards WHERE language = :language
                  )
                ORDER BY flashcard_id, pronoun, person, number, id
                """
            ),
            {"language": language},
        ).mappings().all()
        return group_present_conjugation_rows(rows) or get_fallback_present_conjugations_by_flashcard(session, language)

    if not database_table_exists(session, "words"):
        return get_fallback_present_conjugations_by_flashcard(session, language)

    rows = session.execute(
        text(
            """
            SELECT
                f.id AS flashcard_id,
                vc.mood,
                vc.tense,
                vc.person,
                vc.number,
                vc.pronoun,
                vc.form
            FROM flashcards f
            JOIN words w ON w.word = f.word AND w.language = f.language
            JOIN verb_conjugations vc ON vc.word_id = w.id
            WHERE f.language = :language
              AND vc.mood = 'indicative'
              AND vc.tense = 'present'
            ORDER BY f.id, vc.pronoun, vc.person, vc.number, vc.id
            """
        ),
        {"language": language},
    ).mappings().all()

    return group_present_conjugation_rows(rows)
