from sqlalchemy import create_engine, inspect, text
from sqlmodel import SQLModel

from app.database.connection import ensure_sqlite_schema_compatibility, main_database_tables


def test_sqlite_schema_migration_adds_missing_flashcard_columns():
    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        connection.execute(text("""
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
                extra_data TEXT
            )
        """))

    ensure_sqlite_schema_compatibility(engine)

    columns = {column["name"] for column in inspect(engine).get_columns("flashcards")}
    for expected_column in [
        "image_base64",
        "image_coherence_score",
        "pronunciation_ipa",
        "example_sentence",
        "etymology_text",
        "visual_mnemonic",
        "memory_hook",
        "audio_base64",
    ]:
        assert expected_column in columns


def test_sqlite_schema_migration_adds_missing_grammar_columns():
    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE grammar_sentences (
                id INTEGER PRIMARY KEY,
                created_at DATETIME,
                updated_at DATETIME,
                german VARCHAR NOT NULL,
                english VARCHAR NOT NULL,
                difficulty VARCHAR NOT NULL,
                language VARCHAR NOT NULL,
                extra_data TEXT
            )
        """))
        connection.execute(text("""
            CREATE TABLE grammar_sentence_nodes (
                id INTEGER PRIMARY KEY,
                created_at DATETIME,
                updated_at DATETIME,
                sentence_id INTEGER,
                node_id VARCHAR NOT NULL,
                label VARCHAR NOT NULL,
                node_type VARCHAR NOT NULL,
                image_url VARCHAR,
                meta_case VARCHAR,
                meta_gender VARCHAR,
                meta_number VARCHAR,
                meta_tense VARCHAR,
                position_x FLOAT,
                position_y FLOAT,
                extra_data TEXT
            )
        """))

    ensure_sqlite_schema_compatibility(engine)

    sentence_columns = {column["name"] for column in inspect(engine).get_columns("grammar_sentences")}
    node_columns = {column["name"] for column in inspect(engine).get_columns("grammar_sentence_nodes")}
    assert "audio_base64" in sentence_columns
    assert "image_base64" in node_columns


def test_sqlite_schema_migration_adds_user_progress_user_id():
    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE user_progress (
                id INTEGER PRIMARY KEY,
                created_at DATETIME,
                updated_at DATETIME,
                card_id VARCHAR NOT NULL,
                known BOOLEAN NOT NULL,
                review_count INTEGER NOT NULL,
                swipe_right_count INTEGER NOT NULL,
                swipe_left_count INTEGER NOT NULL,
                last_reviewed DATETIME NOT NULL
            )
        """))

    ensure_sqlite_schema_compatibility(engine)

    columns = {column["name"] for column in inspect(engine).get_columns("user_progress")}
    assert "user_id" in columns
