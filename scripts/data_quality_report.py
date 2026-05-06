#!/usr/bin/env python3
"""Run data-quality checks against the local language database."""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import psycopg2
from psycopg2.extras import RealDictCursor


REQUIRED_LANGUAGES = ("de", "en", "es", "fr", "it")


@dataclass(frozen=True)
class Check:
    name: str
    value: int
    ok: bool
    detail: str


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def connect(env_path: Path):
    load_env_file(env_path)
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=os.environ.get("DB_PORT", "5433"),
        user=os.environ.get("DB_USER", "tinder_user"),
        password=os.environ.get("DB_PASSWORD", "tinder_password"),
        dbname=os.environ.get("DB_DATABASE", "tinder_languages_db"),
    )


def scalar(cursor: RealDictCursor, query: str, params: dict[str, Any] | None = None) -> int:
    cursor.execute(query, params or {})
    row = cursor.fetchone()
    if row is None:
        return 0
    return int(next(iter(row.values())) or 0)


def collect_checks(cursor: RealDictCursor, min_german_words: int, min_image_length: int) -> list[Check]:
    checks: list[Check] = []

    german_words = scalar(cursor, "SELECT COUNT(*) FROM words WHERE language = 'de'")
    checks.append(Check(
        "german_words",
        german_words,
        german_words >= min_german_words,
        f"expected at least {min_german_words} German rows in words",
    ))

    german_flashcards = scalar(cursor, "SELECT COUNT(*) FROM flashcards WHERE language = 'de'")
    checks.append(Check(
        "german_flashcards",
        german_flashcards,
        german_flashcards >= min_german_words,
        f"expected at least {min_german_words} German rows in flashcards",
    ))

    incomplete_flashcard_languages = scalar(
        cursor,
        """
        WITH counts AS (
            SELECT language, COUNT(*) AS total
            FROM flashcards
            WHERE language = ANY(%(languages)s)
            GROUP BY language
        )
        SELECT COUNT(*)
        FROM unnest(%(languages)s::text[]) AS expected(language)
        LEFT JOIN counts USING (language)
        WHERE COALESCE(total, 0) < %(min_words)s
        """,
        {"languages": list(REQUIRED_LANGUAGES), "min_words": min_german_words},
    )
    checks.append(Check(
        "flashcard_language_sets_incomplete",
        incomplete_flashcard_languages,
        incomplete_flashcard_languages == 0,
        f"each required language should have at least {min_german_words} flashcards",
    ))

    missing_images = scalar(
        cursor,
        """
        SELECT COUNT(*)
        FROM words
        WHERE language = 'de'
          AND (image_base64 IS NULL OR length(image_base64) < %(min_image_length)s)
        """,
        {"min_image_length": min_image_length},
    )
    checks.append(Check(
        "german_words_missing_images",
        missing_images,
        missing_images == 0,
        f"German words should have image_base64 length >= {min_image_length}",
    ))

    missing_core_fields = scalar(
        cursor,
        """
        SELECT COUNT(*)
        FROM words
        WHERE language = 'de'
          AND (
            NULLIF(word, '') IS NULL
            OR NULLIF(translation_en, '') IS NULL
            OR NULLIF(translation_it, '') IS NULL
            OR NULLIF(part_of_speech, '') IS NULL
          )
        """,
    )
    checks.append(Check(
        "german_words_missing_core_fields",
        missing_core_fields,
        missing_core_fields == 0,
        "German words should have word, English/Italian translations, and part_of_speech",
    ))

    incomplete_translation_families = scalar(
        cursor,
        """
        WITH families AS (
            SELECT COALESCE(source_word_id, id) AS concept_id, COUNT(DISTINCT language) AS language_count
            FROM words
            GROUP BY COALESCE(source_word_id, id)
        )
        SELECT COUNT(*)
        FROM families
        WHERE language_count < %(required_language_count)s
        """,
        {"required_language_count": len(REQUIRED_LANGUAGES)},
    )
    checks.append(Check(
        "translation_families_incomplete",
        incomplete_translation_families,
        incomplete_translation_families == 0,
        f"each concept should have {len(REQUIRED_LANGUAGES)} languages",
    ))

    verbs_without_conjugations = scalar(
        cursor,
        """
        SELECT COUNT(*)
        FROM words w
        WHERE w.language = 'de'
          AND w.part_of_speech = 'verb'
          AND NOT EXISTS (
            SELECT 1
            FROM verb_conjugations vc
            WHERE vc.word_id = w.id
          )
        """,
    )
    checks.append(Check(
        "german_verbs_without_conjugations",
        verbs_without_conjugations,
        verbs_without_conjugations == 0,
        "German verb rows should have verb_conjugations",
    ))

    sparse_verb_conjugations = scalar(
        cursor,
        """
        WITH verb_counts AS (
            SELECT w.id, COUNT(vc.id) AS forms
            FROM words w
            LEFT JOIN verb_conjugations vc ON vc.word_id = w.id
            WHERE w.language = 'de' AND w.part_of_speech = 'verb'
            GROUP BY w.id
        )
        SELECT COUNT(*)
        FROM verb_counts
        WHERE forms < 6
        """,
    )
    checks.append(Check(
        "german_verbs_with_sparse_conjugations",
        sparse_verb_conjugations,
        sparse_verb_conjugations == 0,
        "German verbs should have at least a basic six-person conjugation set",
    ))

    return checks


def print_report(checks: list[Check]) -> None:
    print("Data quality report")
    print("===================")
    for check in checks:
        status = "OK" if check.ok else "FAIL"
        print(f"{status:4} {check.name}: {check.value} ({check.detail})")


def main() -> int:
    parser = argparse.ArgumentParser(description="Check local language DB data quality.")
    parser.add_argument("--env", type=Path, default=Path(__file__).resolve().parents[1] / ".env")
    parser.add_argument("--min-german-words", type=int, default=500)
    parser.add_argument("--min-image-length", type=int, default=1000)
    args = parser.parse_args()

    with connect(args.env) as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            checks = collect_checks(cursor, args.min_german_words, args.min_image_length)

    print_report(checks)
    return 0 if all(check.ok for check in checks) else 1


if __name__ == "__main__":
    sys.exit(main())
