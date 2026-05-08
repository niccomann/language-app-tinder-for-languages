import json
from typing import Any, Optional

from sqlalchemy import text
from sqlmodel import Session, func, select

from app.database.models import FlashcardEntity, UserProgressEntity
from app.services.grammar_conjugations import build_present_conjugation_rows
from app.services.schema_utils import database_column_exists, database_table_exists


RELATED_COUNT_TABLES = {"etymologies", "example_sentences", "false_friends", "proverbs"}
FALLBACK_HYPERNYMS = {"animals": "Tier"}


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


def flashcard_to_producer_row(card: FlashcardEntity) -> dict:
    category = card.category
    semantic_domain = card.thematic_domain or category
    return {
        "id": card.id,
        "word": card.word,
        "language": card.language,
        "translation_en": card.translation,
        "translation_it": None,
        "translation": card.translation,
        "source_word_id": None,
        "is_ground_truth": True,
        "derived_from_language": None,
        "part_of_speech": flashcard_part_of_speech(card),
        "gender": card.gender,
        "plural_form": card.plural_form,
        "category": category,
        "hypernym": FALLBACK_HYPERNYMS.get(semantic_domain or "", semantic_domain),
        "cefr_level": card.cefr_level,
        "frequency_band": card.frequency_band,
        "register": card.language_register,
        "pronunciation_ipa": card.pronunciation_ipa,
        "example_sentence": card.example_sentence,
        "etymology_text": card.etymology_text,
        "visual_mnemonic": card.visual_mnemonic,
        "memory_hook": card.memory_hook,
        "image_base64": card.image_base64,
        "audio_base64": card.audio_base64,
    }


def flashcard_part_of_speech(card: FlashcardEntity) -> Optional[str]:
    if card.part_of_speech:
        return card.part_of_speech
    if card.category in {"verbs", "actions"}:
        return "verb"
    return None


def fallback_verb_conjugations(card: Optional[FlashcardEntity]) -> list[dict]:
    if not card or flashcard_part_of_speech(card) != "verb":
        return []

    return [
        {"id": index, "word_id": card.id, **row}
        for index, row in enumerate(build_present_conjugation_rows(card.word), start=1)
    ]


def flashcard_translation_family(card: Optional[FlashcardEntity], producer_word: Optional[dict]) -> list[dict]:
    if not card:
        return [producer_word] if producer_word else []

    extra_data = {}
    if card.extra_data:
        try:
            parsed = json.loads(card.extra_data)
            extra_data = parsed if isinstance(parsed, dict) else {}
        except (json.JSONDecodeError, TypeError):
            extra_data = {}

    family = extra_data.get("translation_family")
    if not isinstance(family, dict):
        return [producer_word] if producer_word else []

    rows = []
    preferred_order = ["de", "en", "it", "fr", "es"]
    languages = [*preferred_order, *sorted(set(family) - set(preferred_order))]
    for language in languages:
        word = family.get(language)
        if not word:
            continue
        rows.append(
            {
                "id": card.id,
                "word": card.word if language == card.language else word,
                "language": language,
                "translation_en": family.get("en") or card.translation,
                "translation_it": family.get("it"),
                "source_word_id": None,
                "is_ground_truth": language == card.language,
                "derived_from_language": card.language if language != card.language else None,
                "part_of_speech": flashcard_part_of_speech(card),
                "gender": card.gender if language == card.language else None,
                "plural_form": card.plural_form if language == card.language else None,
            }
        )
    return rows or ([producer_word] if producer_word else [])


def local_verb_conjugations(session: Session, card: Optional[FlashcardEntity]) -> list[dict]:
    if (
        not card
        or card.id is None
        or not database_table_exists(session, "verb_conjugations")
        or not database_column_exists(session, "verb_conjugations", "flashcard_id")
    ):
        return fallback_verb_conjugations(card)

    rows = fetch_all_mappings(
        session,
        """
        SELECT *
        FROM verb_conjugations
        WHERE flashcard_id = :flashcard_id
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
        {"flashcard_id": card.id},
    )
    return rows or fallback_verb_conjugations(card)


def fetch_producer_word_for_card(session: Session, card: FlashcardEntity) -> Optional[dict]:
    if not database_table_exists(session, "words"):
        return flashcard_to_producer_row(card)

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
    if not database_table_exists(session, relation_table):
        return 0

    if not database_table_exists(session, "words") and database_column_exists(session, relation_table, "flashcard_id"):
        row = fetch_one_mapping(
            session,
            f"""
            SELECT COUNT(DISTINCT f.id) AS count
            FROM flashcards f
            JOIN {relation_table} related ON related.flashcard_id = f.id
            WHERE (:language IS NULL OR f.language = :language)
            """,
            {"language": language},
        )
        return int(row["count"]) if row else 0

    if not database_column_exists(session, relation_table, "word_id"):
        return 0

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


def fetch_related_rows(
    session: Session,
    table_name: str,
    select_columns: str,
    producer_word_id: Optional[int],
    flashcard_id: Optional[int],
) -> list[dict]:
    if not database_table_exists(session, table_name):
        return []

    if producer_word_id is not None and database_column_exists(session, table_name, "word_id"):
        return fetch_all_mappings(
            session,
            f"""
            SELECT {select_columns}
            FROM {table_name}
            WHERE word_id = :word_id
            ORDER BY id
            """,
            {"word_id": producer_word_id},
        )

    if flashcard_id is not None and database_column_exists(session, table_name, "flashcard_id"):
        return fetch_all_mappings(
            session,
            f"""
            SELECT {select_columns}
            FROM {table_name}
            WHERE flashcard_id = :flashcard_id
            ORDER BY id
            """,
            {"flashcard_id": flashcard_id},
        )

    return []


def fetch_dialect_detail_rows(
    session: Session,
    producer_word_id: Optional[int],
    flashcard_id: Optional[int],
) -> list[dict]:
    if not database_table_exists(session, "dialect_variants"):
        return []

    pronunciation_column = (
        "pronunciation_ipa"
        if database_column_exists(session, "dialect_variants", "pronunciation_ipa")
        else "pronunciation"
    )
    usage_notes_column = (
        "usage_notes"
        if database_column_exists(session, "dialect_variants", "usage_notes")
        else "NULL AS usage_notes"
    )

    return fetch_related_rows(
        session,
        "dialect_variants",
        f"id, region, dialect_name, variant_word, {pronunciation_column} AS pronunciation, {usage_notes_column}",
        producer_word_id,
        flashcard_id,
    )


def fetch_detail_related_rows(
    session: Session,
    producer_word_id: Optional[int],
    flashcard_id: Optional[int] = None,
) -> dict[str, list[dict]]:
    if producer_word_id is None and flashcard_id is None:
        return empty_detail_related_rows()

    return {
        "etymologies": fetch_related_rows(
            session,
            "etymologies",
            "id, origin_language, origin_word, etymology_text, language_family, time_period",
            producer_word_id,
            flashcard_id,
        ),
        "examples": fetch_related_rows(
            session,
            "example_sentences",
            "id, sentence, translation, difficulty_level, context_type",
            producer_word_id,
            flashcard_id,
        ),
        "false_friends": fetch_related_rows(
            session,
            "false_friends",
            "id, target_language, similar_word, similar_word_meaning, confusion_level",
            producer_word_id,
            flashcard_id,
        ),
        "proverbs": fetch_related_rows(
            session,
            "proverbs",
            "id, expression, literal_meaning, figurative_meaning, expression_type",
            producer_word_id,
            flashcard_id,
        ),
        "collocations": fetch_related_rows(
            session,
            "collocations",
            "id, collocate_word, collocation_type, example_phrase, frequency",
            producer_word_id,
            flashcard_id,
        ),
        "dialect_variants": fetch_dialect_detail_rows(session, producer_word_id, flashcard_id),
    }


def fetch_full_related_rows(
    session: Session,
    word_id: Optional[int],
    flashcard_id: Optional[int] = None,
    producer_word: Optional[dict] = None,
    card: Optional[FlashcardEntity] = None,
) -> dict[str, list[dict]]:
    if not database_table_exists(session, "words"):
        detail_rows = fetch_detail_related_rows(session, producer_word_id=None, flashcard_id=flashcard_id)
        translation_family = flashcard_translation_family(card, producer_word)
        return {
            "translation_family": translation_family,
            "example_sentences": detail_rows["examples"],
            "etymologies": detail_rows["etymologies"],
            "curiosities": [],
            "collocations": detail_rows["collocations"],
            "verb_conjugations": local_verb_conjugations(session, card),
            "false_friends": detail_rows["false_friends"],
            "proverbs": detail_rows["proverbs"],
            "dialect_variants": detail_rows["dialect_variants"],
            "word_relations": [],
        }

    if word_id is None:
        return {
            "translation_family": [],
            "example_sentences": [],
            "etymologies": [],
            "curiosities": [],
            "collocations": [],
            "verb_conjugations": [],
            "false_friends": [],
            "proverbs": [],
            "dialect_variants": [],
            "word_relations": [],
        }

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
        ) if database_table_exists(session, "example_sentences")
        and database_column_exists(session, "example_sentences", "word_id") else [],
        "etymologies": fetch_all_mappings(
            session,
            "SELECT * FROM etymologies WHERE word_id = :word_id ORDER BY id",
            params,
        ) if database_table_exists(session, "etymologies")
        and database_column_exists(session, "etymologies", "word_id") else [],
        "curiosities": fetch_all_mappings(
            session,
            "SELECT * FROM curiosities WHERE word_id = :word_id ORDER BY id",
            params,
        ) if database_table_exists(session, "curiosities") else [],
        "collocations": fetch_all_mappings(
            session,
            "SELECT * FROM collocations WHERE word_id = :word_id ORDER BY id",
            params,
        ) if database_table_exists(session, "collocations") else [],
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
        ) if database_table_exists(session, "verb_conjugations") else [],
        "false_friends": fetch_all_mappings(
            session,
            "SELECT * FROM false_friends WHERE word_id = :word_id ORDER BY id",
            params,
        ) if database_table_exists(session, "false_friends") else [],
        "proverbs": fetch_all_mappings(
            session,
            "SELECT * FROM proverbs WHERE word_id = :word_id ORDER BY id",
            params,
        ) if database_table_exists(session, "proverbs") else [],
        "dialect_variants": fetch_all_mappings(
            session,
            "SELECT * FROM dialect_variants WHERE word_id = :word_id ORDER BY id",
            params,
        ) if database_table_exists(session, "dialect_variants") else [],
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
        ) if database_table_exists(session, "word_relations") else [],
    }


def fetch_dialect_rows(session: Session, language: Optional[str]) -> list[dict]:
    if not database_table_exists(session, "dialect_variants"):
        return []

    if not database_table_exists(session, "words") and database_column_exists(session, "dialect_variants", "flashcard_id"):
        pronunciation_column = (
            "pronunciation_ipa"
            if database_column_exists(session, "dialect_variants", "pronunciation_ipa")
            else "pronunciation"
        )
        return fetch_all_mappings(
            session,
            f"""
            SELECT
                f.id AS word_id,
                f.word,
                f.translation,
                d.region,
                d.dialect_name,
                d.variant_word,
                d.{pronunciation_column} AS pronunciation
            FROM flashcards f
            JOIN dialect_variants d ON d.flashcard_id = f.id
            WHERE (:language IS NULL OR f.language = :language)
            ORDER BY f.word, d.region, d.id
            """,
            {"language": language},
        )

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
