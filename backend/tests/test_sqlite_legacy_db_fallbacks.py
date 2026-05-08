from sqlalchemy import text
from sqlmodel import Session, create_engine

from app.database.models import FlashcardEntity
from app.routes.grammar import get_source_word_ids_by_flashcard
from app.services.library_queries import (
    count_words_with_related_rows,
    fetch_dialect_rows,
    fetch_detail_related_rows,
    fetch_producer_word_for_card,
)


def make_legacy_sqlite_session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    session = Session(engine)
    session.execute(
        text(
            """
            CREATE TABLE flashcards (
                id INTEGER PRIMARY KEY,
                created_at DATETIME,
                updated_at DATETIME,
                word VARCHAR NOT NULL,
                translation VARCHAR NOT NULL,
                image_url VARCHAR NOT NULL,
                language VARCHAR NOT NULL,
                difficulty VARCHAR,
                category VARCHAR,
                cefr_level VARCHAR,
                frequency_band VARCHAR,
                register VARCHAR,
                thematic_domain VARCHAR,
                part_of_speech VARCHAR,
                gender VARCHAR,
                plural_form VARCHAR,
                is_compound BOOLEAN,
                word_formation VARCHAR,
                image_base64 TEXT,
                image_coherence_score INTEGER,
                pronunciation_ipa VARCHAR,
                example_sentence TEXT,
                etymology_text TEXT,
                visual_mnemonic TEXT,
                memory_hook TEXT,
                audio_base64 TEXT,
                extra_data TEXT
            )
            """
        )
    )
    session.execute(
        text(
            """
            INSERT INTO flashcards (
                id,
                word,
                translation,
                image_url,
                language,
                category,
                part_of_speech,
                gender,
                plural_form
            )
            VALUES (1, 'Hund', 'dog', '', 'de', 'animals', 'noun', 'masculine', 'Hunde')
            """
        )
    )
    session.execute(
        text(
            """
            CREATE TABLE etymologies (
                id INTEGER PRIMARY KEY,
                flashcard_id INTEGER,
                origin_language VARCHAR,
                origin_word VARCHAR,
                etymology_text TEXT,
                language_family VARCHAR,
                time_period VARCHAR
            )
            """
        )
    )
    session.execute(
        text(
            """
            INSERT INTO etymologies (
                flashcard_id,
                origin_language,
                origin_word,
                etymology_text
            )
            VALUES (1, 'Proto-Germanic', '*hundaz', 'Legacy flashcard-linked etymology.')
            """
        )
    )
    session.execute(
        text(
            """
            CREATE TABLE dialect_variants (
                id INTEGER PRIMARY KEY,
                flashcard_id INTEGER,
                region VARCHAR,
                dialect_name VARCHAR,
                variant_word VARCHAR,
                pronunciation VARCHAR
            )
            """
        )
    )
    session.execute(
        text(
            """
            INSERT INTO dialect_variants (
                flashcard_id,
                region,
                dialect_name,
                variant_word,
                pronunciation
            )
            VALUES (1, 'Bavaria', 'Bavarian', 'Hund', 'soft final d')
            """
        )
    )
    session.commit()
    return session


def test_grammar_source_word_mapping_tolerates_missing_words_table():
    session = make_legacy_sqlite_session()

    try:
        assert get_source_word_ids_by_flashcard(session, "de") == {}
    finally:
        session.close()


def test_library_queries_use_flashcard_relations_when_words_table_is_missing():
    session = make_legacy_sqlite_session()

    try:
        card = FlashcardEntity(
            id=1,
            word="Hund",
            translation="dog",
            image_url="",
            language="de",
            category="animals",
            part_of_speech="noun",
            gender="masculine",
            plural_form="Hunde",
        )
        producer_row = fetch_producer_word_for_card(session, card)
        related = fetch_detail_related_rows(session, producer_word_id=None, flashcard_id=1)

        assert producer_row["id"] == 1
        assert producer_row["word"] == "Hund"
        assert count_words_with_related_rows(session, "etymologies", "de") == 1
        assert related["etymologies"][0]["origin_word"] == "*hundaz"
        assert fetch_dialect_rows(session, "de")[0]["variant_word"] == "Hund"
    finally:
        session.close()
