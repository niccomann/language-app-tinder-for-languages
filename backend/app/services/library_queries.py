from typing import Any, Optional

from sqlalchemy import text
from sqlmodel import Session, func, select

from app.database.models import FlashcardEntity, UserProgressEntity


RELATED_COUNT_TABLES = {"etymologies", "example_sentences", "false_friends", "proverbs"}


def row_to_dict(row: Any) -> dict:
    return dict(row) if row else {}


def fetch_one_mapping(session: Session, query: str, params: Optional[dict] = None) -> Optional[dict]:
    row = session.execute(text(query), params or {}).mappings().first()
    return row_to_dict(row) if row else None


def fetch_all_mappings(session: Session, query: str, params: Optional[dict] = None) -> list[dict]:
    rows = session.execute(text(query), params or {}).mappings().all()
    return [row_to_dict(row) for row in rows]


def fetch_flashcard_by_id(session: Session, word_id: int) -> Optional[FlashcardEntity]:
    return session.exec(select(FlashcardEntity).where(FlashcardEntity.id == word_id)).first()


def fetch_flashcards_for_language(session: Session, language: Optional[str]) -> list[FlashcardEntity]:
    query = select(FlashcardEntity)
    if language:
        query = query.where(FlashcardEntity.language == language)
    return session.exec(query).all()


def fetch_library_flashcards(
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
    limit: Optional[int],
    offset: Optional[int],
) -> list[FlashcardEntity]:
    query = select(FlashcardEntity)

    if language:
        query = query.where(FlashcardEntity.language == language)
    if search:
        search_pattern = f"%{search.lower()}%"
        query = query.where(
            (func.lower(FlashcardEntity.word).like(search_pattern))
            | (func.lower(FlashcardEntity.translation).like(search_pattern))
        )
    if category:
        query = query.where(FlashcardEntity.category == category)
    if cefr_level:
        query = query.where(FlashcardEntity.cefr_level == cefr_level)
    if frequency_band:
        query = query.where(FlashcardEntity.frequency_band == frequency_band)
    if register:
        query = query.where(FlashcardEntity.language_register == register)
    if gender:
        query = query.where(FlashcardEntity.gender == gender)
    if part_of_speech:
        query = query.where(FlashcardEntity.part_of_speech == part_of_speech)
    if is_compound is not None:
        query = query.where(FlashcardEntity.is_compound == is_compound)
    if word_formation:
        query = query.where(FlashcardEntity.word_formation == word_formation)

    return session.exec(query.offset(offset).limit(limit)).all()


def fetch_progress_map(session: Session) -> dict[str, UserProgressEntity]:
    progress_records = session.exec(select(UserProgressEntity)).all()
    return {record.card_id: record for record in progress_records}


def fetch_producer_word_for_card(session: Session, card: FlashcardEntity) -> Optional[dict]:
    return fetch_one_mapping(
        session,
        """
        SELECT w.*
        FROM words w
        WHERE w.word = :word AND w.language = :language
        ORDER BY CASE WHEN w.id = :card_id THEN 0 ELSE 1 END, w.id
        LIMIT 1
        """,
        {"word": card.word, "language": card.language, "card_id": card.id},
    )


def count_words_with_related_rows(
    session: Session,
    relation_table: str,
    language: Optional[str],
) -> int:
    if relation_table not in RELATED_COUNT_TABLES:
        raise ValueError(f"Unsupported relation table: {relation_table}")

    row = fetch_one_mapping(
        session,
        f"""
        SELECT COUNT(DISTINCT w.id) AS count
        FROM words w
        JOIN flashcards f ON f.word = w.word AND f.language = w.language
        WHERE (:language IS NULL OR w.language = :language)
          AND EXISTS (
            SELECT 1 FROM {relation_table} related
            WHERE related.word_id = w.id
          )
        """,
        {"language": language},
    )
    return int(row["count"]) if row else 0


def empty_detail_related_rows() -> dict[str, list[dict]]:
    return {
        "etymologies": [],
        "examples": [],
        "false_friends": [],
        "proverbs": [],
        "collocations": [],
        "dialect_variants": [],
    }


def fetch_detail_related_rows(session: Session, word_id: Optional[int]) -> dict[str, list[dict]]:
    if word_id is None:
        return empty_detail_related_rows()

    params = {"word_id": word_id}
    return {
        "etymologies": fetch_all_mappings(
            session,
            """
            SELECT id, origin_language, origin_word, etymology_text, language_family, time_period
            FROM etymologies
            WHERE word_id = :word_id
            ORDER BY id
            """,
            params,
        ),
        "examples": fetch_all_mappings(
            session,
            """
            SELECT id, sentence, translation, difficulty_level, context_type
            FROM example_sentences
            WHERE word_id = :word_id
            ORDER BY id
            """,
            params,
        ),
        "false_friends": fetch_all_mappings(
            session,
            """
            SELECT id, target_language, similar_word, similar_word_meaning, confusion_level
            FROM false_friends
            WHERE word_id = :word_id
            ORDER BY id
            """,
            params,
        ),
        "proverbs": fetch_all_mappings(
            session,
            """
            SELECT id, expression, literal_meaning, figurative_meaning, expression_type
            FROM proverbs
            WHERE word_id = :word_id
            ORDER BY id
            """,
            params,
        ),
        "collocations": fetch_all_mappings(
            session,
            """
            SELECT id, collocate_word, collocation_type, example_phrase, frequency
            FROM collocations
            WHERE word_id = :word_id
            ORDER BY id
            """,
            params,
        ),
        "dialect_variants": fetch_all_mappings(
            session,
            """
            SELECT id, region, dialect_name, variant_word, pronunciation_ipa AS pronunciation, usage_notes
            FROM dialect_variants
            WHERE word_id = :word_id
            ORDER BY id
            """,
            params,
        ),
    }


def fetch_full_related_rows(session: Session, word_id: int) -> dict[str, list[dict]]:
    params = {"word_id": word_id}
    return {
        "translation_family": fetch_all_mappings(
            session,
            """
            WITH selected_word AS (
                SELECT COALESCE(source_word_id, id) AS concept_source_word_id
                FROM words
                WHERE id = :word_id
            )
            SELECT
                w.id,
                w.word,
                w.language,
                w.translation_en,
                w.translation_it,
                w.source_word_id,
                w.is_ground_truth,
                w.derived_from_language,
                w.part_of_speech,
                w.gender,
                w.plural_form
            FROM words w
            CROSS JOIN selected_word selected
            WHERE w.id = selected.concept_source_word_id
               OR w.source_word_id = selected.concept_source_word_id
            ORDER BY w.is_ground_truth DESC, w.language, w.word
            """,
            params,
        ),
        "example_sentences": fetch_all_mappings(
            session,
            "SELECT * FROM example_sentences WHERE word_id = :word_id ORDER BY id",
            params,
        ),
        "etymologies": fetch_all_mappings(
            session,
            "SELECT * FROM etymologies WHERE word_id = :word_id ORDER BY id",
            params,
        ),
        "curiosities": fetch_all_mappings(
            session,
            "SELECT * FROM curiosities WHERE word_id = :word_id ORDER BY id",
            params,
        ),
        "collocations": fetch_all_mappings(
            session,
            "SELECT * FROM collocations WHERE word_id = :word_id ORDER BY id",
            params,
        ),
        "verb_conjugations": fetch_all_mappings(
            session,
            """
            SELECT *
            FROM verb_conjugations
            WHERE word_id = :word_id
            ORDER BY
                CASE mood
                    WHEN 'indicative' THEN 1
                    WHEN 'subjunctive' THEN 2
                    WHEN 'imperative' THEN 3
                    ELSE 9
                END,
                CASE tense
                    WHEN 'present' THEN 1
                    WHEN 'preterite' THEN 2
                    WHEN 'perfect' THEN 3
                    WHEN 'future_1' THEN 4
                    ELSE 9
                END,
                CASE number WHEN 'singular' THEN 1 ELSE 2 END,
                person,
                id
            """,
            params,
        ),
        "false_friends": fetch_all_mappings(
            session,
            "SELECT * FROM false_friends WHERE word_id = :word_id ORDER BY id",
            params,
        ),
        "proverbs": fetch_all_mappings(
            session,
            "SELECT * FROM proverbs WHERE word_id = :word_id ORDER BY id",
            params,
        ),
        "dialect_variants": fetch_all_mappings(
            session,
            "SELECT * FROM dialect_variants WHERE word_id = :word_id ORDER BY id",
            params,
        ),
        "word_relations": fetch_all_mappings(
            session,
            """
            SELECT wr.*, source.word AS source_word, target.word AS target_word
            FROM word_relations wr
            JOIN words source ON source.id = wr.source_word_id
            JOIN words target ON target.id = wr.target_word_id
            WHERE wr.source_word_id = :word_id OR wr.target_word_id = :word_id
            ORDER BY wr.id
            """,
            params,
        ),
    }


def fetch_dialect_rows(session: Session, language: Optional[str]) -> list[dict]:
    return fetch_all_mappings(
        session,
        """
        SELECT
            w.id AS word_id,
            w.word,
            COALESCE(f.translation, w.translation_en, w.translation_it, '') AS translation,
            d.region,
            d.dialect_name,
            d.variant_word,
            d.pronunciation_ipa AS pronunciation
        FROM words w
        JOIN dialect_variants d ON d.word_id = w.id
        LEFT JOIN flashcards f ON f.word = w.word AND f.language = w.language
        WHERE (:language IS NULL OR w.language = :language)
        ORDER BY w.word, d.region, d.id
        """,
        {"language": language},
    )
