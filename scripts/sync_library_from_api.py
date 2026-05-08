#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import sqlite3
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


FLASHCARD_COLUMNS = [
    "id",
    "created_at",
    "updated_at",
    "word",
    "translation",
    "image_url",
    "language",
    "difficulty",
    "category",
    "cefr_level",
    "frequency_band",
    "register",
    "thematic_domain",
    "part_of_speech",
    "gender",
    "plural_form",
    "is_compound",
    "word_formation",
    "extra_data",
    "image_base64",
    "image_coherence_score",
    "pronunciation_ipa",
    "example_sentence",
    "etymology_text",
    "visual_mnemonic",
    "memory_hook",
    "audio_base64",
]

RELATED_TABLES = [
    "etymologies",
    "example_sentences",
    "false_friends",
    "proverbs",
    "collocations",
    "dialect_variants",
]


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def fetch_json(url: str, timeout: int) -> Any:
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"HTTP {exc.code} while fetching {url}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Could not fetch {url}: {exc.reason}") from exc


def fetch_page(base_url: str, language: str, limit: int, offset: int, timeout: int) -> list[dict[str, Any]]:
    query = urllib.parse.urlencode({"language": language, "limit": limit, "offset": offset})
    payload = fetch_json(f"{base_url.rstrip('/')}/api/library/words?{query}", timeout)
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict) and isinstance(payload.get("items"), list):
        return payload["items"]
    raise RuntimeError("Unexpected /api/library/words response shape")


def fetch_all_words(base_url: str, language: str, page_size: int, timeout: int) -> list[dict[str, Any]]:
    words: list[dict[str, Any]] = []
    offset = 0
    while True:
        page = fetch_page(base_url, language, page_size, offset, timeout)
        if not page:
            break
        words.extend(page)
        print(f"Fetched {len(words)} records...", flush=True)
        if len(page) < page_size:
            break
        offset += page_size
    return words


def fetch_word_detail(base_url: str, word_id: int, timeout: int) -> dict[str, Any]:
    payload = fetch_json(f"{base_url.rstrip('/')}/api/library/words/{word_id}/db-row", timeout)
    if isinstance(payload, dict):
        return payload
    raise RuntimeError(f"Unexpected /api/library/words/{word_id}/db-row response shape")


def fetch_word_details(
    base_url: str,
    words: list[dict[str, Any]],
    timeout: int,
) -> dict[int, dict[str, Any]]:
    details: dict[int, dict[str, Any]] = {}
    for index, row in enumerate(words, start=1):
        word_id = int(row["id"])
        details[word_id] = fetch_word_detail(base_url, word_id, timeout)
        if index % 50 == 0 or index == len(words):
            print(f"Fetched details for {index}/{len(words)} records...", flush=True)
    return details


def normalize_extra_data(value: Any) -> str | None:
    if value is None or value == "":
        return None
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def normalize_bool(value: Any) -> int | None:
    if value is None:
        return None
    return 1 if bool(value) else 0


def flashcard_values(row: dict[str, Any]) -> list[Any]:
    created_at = row.get("created_at") or now_iso()
    updated_at = row.get("updated_at") or now_iso()
    return [
        row["id"],
        created_at,
        updated_at,
        row["word"],
        row.get("translation") or "",
        row.get("image_url") or "",
        row.get("language") or "de",
        row.get("difficulty"),
        row.get("category"),
        row.get("cefr_level"),
        row.get("frequency_band"),
        row.get("register"),
        row.get("thematic_domain"),
        row.get("part_of_speech"),
        row.get("gender"),
        row.get("plural_form"),
        normalize_bool(row.get("is_compound")),
        row.get("word_formation"),
        normalize_extra_data(row.get("extra_data")),
        row.get("image_base64"),
        row.get("image_coherence_score"),
        row.get("pronunciation_ipa"),
        row.get("example_sentence"),
        row.get("etymology_text"),
        row.get("visual_mnemonic"),
        row.get("memory_hook"),
        row.get("audio_base64"),
    ]


def delete_related_rows(connection: sqlite3.Connection, flashcard_ids: list[int]) -> None:
    if not flashcard_ids:
        return
    placeholders = ",".join("?" for _ in flashcard_ids)
    table_names = {
        row[0]
        for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
    }
    for table in RELATED_TABLES:
        if table in table_names:
            connection.execute(f"DELETE FROM {table} WHERE flashcard_id IN ({placeholders})", flashcard_ids)


def mirror_language(connection: sqlite3.Connection, language: str, remote_ids: list[int]) -> None:
    current_ids = [
        int(row[0])
        for row in connection.execute("SELECT id FROM flashcards WHERE language = ?", (language,))
    ]
    delete_related_rows(connection, current_ids)
    if current_ids:
        connection.execute("DELETE FROM flashcards WHERE language = ?", (language,))

    if not remote_ids:
        return
    placeholders = ",".join("?" for _ in remote_ids)
    delete_related_rows(connection, remote_ids)
    connection.execute(f"DELETE FROM flashcards WHERE id IN ({placeholders})", remote_ids)


def insert_flashcards(connection: sqlite3.Connection, words: list[dict[str, Any]]) -> None:
    quoted_columns = ", ".join(f'"{column}"' for column in FLASHCARD_COLUMNS)
    placeholders = ", ".join("?" for _ in FLASHCARD_COLUMNS)
    connection.executemany(
        f"INSERT INTO flashcards ({quoted_columns}) VALUES ({placeholders})",
        [flashcard_values(row) for row in words],
    )


def compact_extra_data(row: dict[str, Any], local_columns: set[str]) -> str | None:
    extra = {key: value for key, value in row.items() if key not in local_columns and value is not None}
    return normalize_extra_data(extra)


def first_available(row: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if row.get(key) is not None:
            return row[key]
    return None


def related_rows_for(
    detail_rows: dict[int, dict[str, Any]],
    flashcard_id: int,
    relation_name: str,
) -> list[dict[str, Any]]:
    detail = detail_rows.get(flashcard_id) or {}
    related = detail.get("related") or {}
    rows = related.get(relation_name) or []
    return rows if isinstance(rows, list) else []


def insert_related_summary_rows(
    connection: sqlite3.Connection,
    words: list[dict[str, Any]],
    detail_rows: dict[int, dict[str, Any]],
) -> None:
    timestamp = now_iso()
    etymologies = []
    examples = []
    collocations = []
    false_friends = []
    proverbs = []
    dialect_variants = []

    etymology_columns = {
        "id",
        "created_at",
        "updated_at",
        "flashcard_id",
        "origin_language",
        "origin_word",
        "etymology_text",
        "language_family",
        "time_period",
        "extra_data",
    }
    example_columns = {
        "id",
        "created_at",
        "updated_at",
        "flashcard_id",
        "sentence",
        "translation",
        "difficulty_level",
        "context_type",
        "extra_data",
    }
    collocation_columns = {
        "id",
        "created_at",
        "updated_at",
        "flashcard_id",
        "collocate_word",
        "collocation_type",
        "example_phrase",
        "frequency",
        "extra_data",
    }

    for row in words:
        flashcard_id = int(row["id"])
        detail_etymologies = related_rows_for(detail_rows, flashcard_id, "etymologies")
        detail_examples = related_rows_for(detail_rows, flashcard_id, "example_sentences")
        detail_collocations = related_rows_for(detail_rows, flashcard_id, "collocations")
        detail_false_friends = related_rows_for(detail_rows, flashcard_id, "false_friends")
        detail_proverbs = related_rows_for(detail_rows, flashcard_id, "proverbs")
        detail_dialects = related_rows_for(detail_rows, flashcard_id, "dialect_variants")

        if detail_etymologies:
            for etymology in detail_etymologies:
                etymologies.append(
                    (
                        timestamp,
                        timestamp,
                        flashcard_id,
                        etymology.get("origin_language"),
                        etymology.get("origin_word"),
                        etymology.get("etymology_text"),
                        etymology.get("language_family"),
                        etymology.get("time_period"),
                        compact_extra_data(etymology, etymology_columns),
                    )
                )
        elif row.get("etymology_text"):
            etymologies.append(
                (timestamp, timestamp, flashcard_id, None, row.get("word"), row["etymology_text"], None, None, None)
            )

        if detail_examples:
            for example in detail_examples:
                examples.append(
                    (
                        timestamp,
                        timestamp,
                        flashcard_id,
                        example.get("sentence"),
                        example.get("translation"),
                        example.get("difficulty_level"),
                        example.get("context_type"),
                        compact_extra_data(example, example_columns),
                    )
                )
        elif row.get("example_sentence"):
            examples.append(
                (
                    timestamp,
                    timestamp,
                    flashcard_id,
                    row["example_sentence"],
                    row.get("translation"),
                    row.get("cefr_level") or row.get("difficulty"),
                    "generated",
                    None,
                )
            )

        for collocation in detail_collocations:
            collocations.append(
                (
                    timestamp,
                    timestamp,
                    flashcard_id,
                    collocation.get("collocate_word"),
                    collocation.get("collocation_type"),
                    collocation.get("example_phrase"),
                    collocation.get("frequency"),
                    compact_extra_data(collocation, collocation_columns),
                )
            )

        for false_friend in detail_false_friends:
            false_friends.append(
                (
                    timestamp,
                    timestamp,
                    flashcard_id,
                    false_friend.get("target_language") or "",
                    false_friend.get("similar_word") or "",
                    false_friend.get("similar_word_meaning"),
                    false_friend.get("confusion_level"),
                    normalize_extra_data(false_friend),
                )
            )

        for proverb in detail_proverbs:
            proverbs.append(
                (
                    timestamp,
                    timestamp,
                    flashcard_id,
                    proverb.get("expression") or "",
                    proverb.get("literal_meaning"),
                    proverb.get("figurative_meaning"),
                    proverb.get("expression_type"),
                    normalize_extra_data(proverb),
                )
            )

        for dialect in detail_dialects:
            dialect_variants.append(
                (
                    timestamp,
                    timestamp,
                    flashcard_id,
                    dialect.get("region") or "",
                    dialect.get("dialect_name"),
                    dialect.get("variant_word") or row.get("word") or "",
                    first_available(dialect, "pronunciation", "pronunciation_ipa"),
                    first_available(dialect, "usage_notes", "usage_note"),
                    normalize_extra_data(dialect),
                )
            )

    if etymologies:
        connection.executemany(
            """
            INSERT INTO etymologies (
                created_at,
                updated_at,
                flashcard_id,
                origin_language,
                origin_word,
                etymology_text,
                language_family,
                time_period,
                extra_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            etymologies,
        )

    if examples:
        connection.executemany(
            """
            INSERT INTO example_sentences (
                created_at,
                updated_at,
                flashcard_id,
                sentence,
                translation,
                difficulty_level,
                context_type,
                extra_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            examples,
        )

    if collocations:
        connection.executemany(
            """
            INSERT INTO collocations (
                created_at,
                updated_at,
                flashcard_id,
                collocate_word,
                collocation_type,
                example_phrase,
                frequency,
                extra_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            collocations,
        )

    if false_friends:
        connection.executemany(
            """
            INSERT INTO false_friends (
                created_at,
                updated_at,
                flashcard_id,
                target_language,
                similar_word,
                similar_word_meaning,
                confusion_level,
                extra_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            false_friends,
        )

    if proverbs:
        connection.executemany(
            """
            INSERT INTO proverbs (
                created_at,
                updated_at,
                flashcard_id,
                expression,
                literal_meaning,
                figurative_meaning,
                expression_type,
                extra_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            proverbs,
        )

    if dialect_variants:
        connection.executemany(
            """
            INSERT INTO dialect_variants (
                created_at,
                updated_at,
                flashcard_id,
                region,
                dialect_name,
                variant_word,
                pronunciation,
                usage_notes,
                extra_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            dialect_variants,
        )


def ensure_local_verb_conjugation_table(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS verb_conjugations (
            id INTEGER NOT NULL PRIMARY KEY,
            created_at DATETIME NOT NULL,
            updated_at DATETIME,
            flashcard_id INTEGER NOT NULL,
            language VARCHAR,
            mood VARCHAR,
            tense VARCHAR,
            person INTEGER,
            number VARCHAR,
            pronoun VARCHAR,
            form VARCHAR,
            auxiliary VARCHAR,
            is_compound_form BOOLEAN,
            example TEXT,
            notes TEXT,
            source VARCHAR,
            confidence_score FLOAT,
            extra_data TEXT,
            FOREIGN KEY(flashcard_id) REFERENCES flashcards (id)
        )
        """
    )
    connection.execute(
        "CREATE INDEX IF NOT EXISTS ix_verb_conjugations_flashcard_id ON verb_conjugations (flashcard_id)"
    )


def insert_verb_conjugations(
    connection: sqlite3.Connection,
    words: list[dict[str, Any]],
    detail_rows: dict[int, dict[str, Any]],
) -> None:
    timestamp = now_iso()
    rows = []
    local_columns = {
        "id",
        "created_at",
        "updated_at",
        "flashcard_id",
        "language",
        "mood",
        "tense",
        "person",
        "number",
        "pronoun",
        "form",
        "auxiliary",
        "is_compound_form",
        "example",
        "notes",
        "source",
        "confidence_score",
        "extra_data",
    }

    for row in words:
        flashcard_id = int(row["id"])
        for conjugation in related_rows_for(detail_rows, flashcard_id, "verb_conjugations"):
            rows.append(
                (
                    timestamp,
                    timestamp,
                    flashcard_id,
                    conjugation.get("language"),
                    conjugation.get("mood"),
                    conjugation.get("tense"),
                    conjugation.get("person"),
                    conjugation.get("number"),
                    conjugation.get("pronoun"),
                    conjugation.get("form"),
                    conjugation.get("auxiliary"),
                    normalize_bool(conjugation.get("is_compound_form")),
                    conjugation.get("example"),
                    conjugation.get("notes"),
                    conjugation.get("source"),
                    conjugation.get("confidence_score"),
                    compact_extra_data(conjugation, local_columns),
                )
            )

    if not rows:
        return

    ensure_local_verb_conjugation_table(connection)
    connection.executemany(
        """
        INSERT INTO verb_conjugations (
            created_at,
            updated_at,
            flashcard_id,
            language,
            mood,
            tense,
            person,
            number,
            pronoun,
            form,
            auxiliary,
            is_compound_form,
            example,
            notes,
            source,
            confidence_score,
            extra_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )


def backup_database(database_path: Path) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = database_path.with_suffix(f".before-library-sync-{timestamp}.db")
    shutil.copy2(database_path, backup_path)
    return backup_path


def sync_database(
    database_path: Path,
    words: list[dict[str, Any]],
    language: str,
    replace_language: bool,
    detail_rows: dict[int, dict[str, Any]],
) -> None:
    if not words:
        raise RuntimeError("Remote API returned zero words; refusing to modify the database")

    remote_ids = [int(row["id"]) for row in words]
    with sqlite3.connect(database_path, timeout=30) as connection:
        connection.execute("PRAGMA foreign_keys = OFF")
        with connection:
            if replace_language:
                mirror_language(connection, language, remote_ids)
            else:
                delete_related_rows(connection, remote_ids)
                placeholders = ",".join("?" for _ in remote_ids)
                connection.execute(f"DELETE FROM flashcards WHERE id IN ({placeholders})", remote_ids)
            connection.execute("DELETE FROM verb_conjugations WHERE flashcard_id IN ({})".format(
                ",".join("?" for _ in remote_ids)
            )) if table_exists(connection, "verb_conjugations") else None
            insert_flashcards(connection, words)
            insert_related_summary_rows(connection, words, detail_rows)
            insert_verb_conjugations(connection, words, detail_rows)


def table_exists(connection: sqlite3.Connection, table_name: str) -> bool:
    return connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table_name,),
    ).fetchone() is not None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync local SQLite library data from a deployed API.")
    parser.add_argument("--api-base-url", default="http://3.64.236.66")
    parser.add_argument("--database", default="backend/app.db")
    parser.add_argument("--language", default="de")
    parser.add_argument("--page-size", type=int, default=50)
    parser.add_argument("--timeout", type=int, default=60)
    parser.add_argument("--replace-language", action="store_true")
    parser.add_argument("--include-details", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    database_path = Path(args.database)
    if not database_path.exists():
        print(f"Database not found: {database_path}", file=sys.stderr)
        return 1

    started_at = time.monotonic()
    words = fetch_all_words(args.api_base_url, args.language, args.page_size, args.timeout)
    detail_rows = fetch_word_details(args.api_base_url, words, args.timeout) if args.include_details else {}
    image_count = sum(1 for row in words if row.get("image_base64"))
    backup_path = backup_database(database_path)
    sync_database(database_path, words, args.language, args.replace_language, detail_rows)
    elapsed = time.monotonic() - started_at

    print(f"Backed up local database to {backup_path}")
    print(f"Imported {len(words)} {args.language} flashcards")
    print(f"Imported {image_count} flashcards with image_base64")
    if detail_rows:
        print(f"Imported related details for {len(detail_rows)} flashcards")
    print(f"Completed in {elapsed:.1f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
