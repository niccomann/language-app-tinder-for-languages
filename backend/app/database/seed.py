"""
Database seed module.

Most linguistic data is populated by the external 'language_info_extraction'
project. This module only inserts small production starter data that the app
needs to be usable immediately, such as deterministic sentence challenges.
"""
import json
import logging

from sqlmodel import Session, select

from app.database.connection import DatabaseConnection
from app.database.models import (
    CollocationEntity,
    EtymologyEntity,
    ExampleSentenceEntity,
    FlashcardEntity,
    SentenceChallengeEntity,
)

log = logging.getLogger(__name__)


SENTENCE_CHALLENGE_SEED = [
    {
        "language": "de",
        "prompt_language": "en",
        "target_language": "de",
        "prompt": "I have the dog.",
        "correct_sentence": "Ich habe den Hund",
        "correct_tokens": ["Ich", "habe", "den Hund"],
        "distractor_tokens": ["du", "hast", "die Katze", "den Garten", "und", "aber", "leider"],
        "difficulty": "beginner",
        "grammar_focus": "subject verb accusative object",
        "cefr_level": "A1",
    },
    {
        "language": "de",
        "prompt_language": "en",
        "target_language": "de",
        "prompt": "The cat goes into the garden.",
        "correct_sentence": "Die Katze geht in den Garten",
        "correct_tokens": ["Die Katze", "geht", "in", "den Garten"],
        "distractor_tokens": ["der Hund", "sehe", "auf", "mit", "aber", "schnell"],
        "difficulty": "beginner",
        "grammar_focus": "subject verb prepositional phrase",
        "cefr_level": "A1",
    },
    {
        "language": "de",
        "prompt_language": "en",
        "target_language": "de",
        "prompt": "I unfortunately do not have time.",
        "correct_sentence": "Ich habe leider keine Zeit",
        "correct_tokens": ["Ich", "habe", "leider", "keine", "Zeit"],
        "distractor_tokens": ["du", "hast", "immer", "und", "Lust", "Freund"],
        "difficulty": "beginner",
        "grammar_focus": "pronoun verb adverb negation object",
        "cefr_level": "A1",
    },
    {
        "language": "de",
        "prompt_language": "en",
        "target_language": "de",
        "prompt": "We drink water today.",
        "correct_sentence": "Wir trinken heute Wasser",
        "correct_tokens": ["Wir", "trinken", "heute", "Wasser"],
        "distractor_tokens": ["ich", "trinkt", "morgen", "Brot", "weil", "mit"],
        "difficulty": "beginner",
        "grammar_focus": "plural subject verb adverb object",
        "cefr_level": "A1",
    },
    {
        "language": "de",
        "prompt_language": "en",
        "target_language": "de",
        "prompt": "The friend reads the book.",
        "correct_sentence": "Der Freund liest das Buch",
        "correct_tokens": ["Der Freund", "liest", "das Buch"],
        "distractor_tokens": ["die Freundin", "lese", "ein Buch", "schnell", "oder", "auf"],
        "difficulty": "beginner",
        "grammar_focus": "subject verb accusative object",
        "cefr_level": "A1",
    },
]

STARTER_FLASHCARD_SEED = [
    {
        "word": "Katze",
        "translation": "cat",
        "category": "animals",
        "thematic_domain": "animals",
        "part_of_speech": "noun",
        "gender": "feminine",
        "plural_form": "Katzen",
        "cefr_level": "A1",
        "frequency_band": "common",
    },
    {
        "word": "Hund",
        "translation": "dog",
        "category": "animals",
        "thematic_domain": "animals",
        "part_of_speech": "noun",
        "gender": "masculine",
        "plural_form": "Hunde",
        "cefr_level": "A1",
        "frequency_band": "common",
        "extra_data": {
            "translation_family": {
                "de": "Hund",
                "en": "dog",
                "it": "cane",
                "fr": "chien",
                "es": "perro",
            }
        },
    },
    {
        "word": "Schreiben",
        "translation": "to write",
        "category": "verbs",
        "thematic_domain": "study",
        "part_of_speech": "verb",
        "cefr_level": "A1",
        "frequency_band": "common",
    },
    {
        "word": "gehen",
        "translation": "to go",
        "category": "verbs",
        "thematic_domain": "travel",
        "part_of_speech": "verb",
        "cefr_level": "A1",
        "frequency_band": "very_common",
    },
    {
        "word": "Computer",
        "translation": "computer",
        "category": "technology",
        "thematic_domain": "technology",
        "part_of_speech": "noun",
        "gender": "masculine",
        "plural_form": "Computer",
        "cefr_level": "A1",
        "frequency_band": "common",
    },
    {
        "word": "der",
        "translation": "the",
        "category": "function_words",
        "thematic_domain": "grammar",
        "part_of_speech": "article",
        "cefr_level": "A1",
        "frequency_band": "very_common",
    },
]


def ensure_sentence_challenges(session: Session) -> int:
    """
    Insert deterministic sentence-placement challenges if they are missing.
    Returns the number of rows inserted.
    """
    inserted = 0
    for challenge in SENTENCE_CHALLENGE_SEED:
        existing = session.exec(
            select(SentenceChallengeEntity).where(
                SentenceChallengeEntity.language == challenge["language"],
                SentenceChallengeEntity.prompt == challenge["prompt"],
            )
        ).first()
        if existing:
            continue

        session.add(
            SentenceChallengeEntity(
                language=challenge["language"],
                prompt_language=challenge["prompt_language"],
                target_language=challenge["target_language"],
                prompt=challenge["prompt"],
                correct_sentence=challenge["correct_sentence"],
                correct_tokens=json.dumps(challenge["correct_tokens"], ensure_ascii=True),
                distractor_tokens=json.dumps(challenge["distractor_tokens"], ensure_ascii=True),
                difficulty=challenge["difficulty"],
                grammar_focus=challenge["grammar_focus"],
                cefr_level=challenge["cefr_level"],
                validation_mode="ground_truth",
                is_active=True,
            )
        )
        inserted += 1

    if inserted:
        session.commit()

    return inserted


def ensure_starter_flashcards(session: Session) -> int:
    inserted = 0
    for card_data in STARTER_FLASHCARD_SEED:
        existing = session.exec(
            select(FlashcardEntity).where(
                FlashcardEntity.word == card_data["word"],
                FlashcardEntity.language == "de",
            )
        ).first()
        if existing:
            continue

        extra_data = card_data.get("extra_data")
        session.add(
            FlashcardEntity(
                word=card_data["word"],
                translation=card_data["translation"],
                image_url="",
                language="de",
                difficulty="easy",
                category=card_data["category"],
                thematic_domain=card_data["thematic_domain"],
                part_of_speech=card_data["part_of_speech"],
                gender=card_data.get("gender"),
                plural_form=card_data.get("plural_form"),
                cefr_level=card_data.get("cefr_level"),
                frequency_band=card_data.get("frequency_band"),
                language_register="neutral",
                extra_data=json.dumps(extra_data, ensure_ascii=True) if extra_data else None,
            )
        )
        inserted += 1

    if inserted:
        session.commit()

    ensure_starter_related_rows(session)
    return inserted


def ensure_starter_related_rows(session: Session) -> None:
    hund = session.exec(
        select(FlashcardEntity).where(
            FlashcardEntity.word == "Hund",
            FlashcardEntity.language == "de",
        )
    ).first()
    if not hund or hund.id is None:
        return

    existing_etymology = session.exec(
        select(EtymologyEntity).where(EtymologyEntity.flashcard_id == hund.id)
    ).first()
    if not existing_etymology:
        session.add(
            EtymologyEntity(
                flashcard_id=hund.id,
                origin_language="Old High German",
                origin_word="hunt",
                etymology_text="Core Germanic animal noun.",
                language_family="Germanic",
                time_period="Old High German",
            )
        )

    existing_example = session.exec(
        select(ExampleSentenceEntity).where(ExampleSentenceEntity.flashcard_id == hund.id)
    ).first()
    if not existing_example:
        session.add_all([
            ExampleSentenceEntity(
                flashcard_id=hund.id,
                sentence="Der Hund laeuft im Garten.",
                translation="The dog runs in the garden.",
                difficulty_level="A1",
                context_type="daily",
            ),
            ExampleSentenceEntity(
                flashcard_id=hund.id,
                sentence="Ich sehe den Hund.",
                translation="I see the dog.",
                difficulty_level="A1",
                context_type="case practice",
            ),
        ])

    existing_collocation = session.exec(
        select(CollocationEntity).where(CollocationEntity.flashcard_id == hund.id)
    ).first()
    if not existing_collocation:
        session.add(
            CollocationEntity(
                flashcard_id=hund.id,
                collocate_word="treuer Hund",
                collocation_type="adjective noun",
                example_phrase="ein treuer Hund",
                frequency="common",
            )
        )

    katze = session.exec(
        select(FlashcardEntity).where(
            FlashcardEntity.word == "Katze",
            FlashcardEntity.language == "de",
        )
    ).first()
    if katze and katze.id is not None:
        existing_katze_example = session.exec(
            select(ExampleSentenceEntity).where(ExampleSentenceEntity.flashcard_id == katze.id)
        ).first()
        if not existing_katze_example:
            session.add(
                ExampleSentenceEntity(
                    flashcard_id=katze.id,
                    sentence="Die Katze schlaeft.",
                    translation="The cat sleeps.",
                    difficulty_level="A1",
                    context_type="daily",
                )
            )

    session.commit()


def check_database_status(session: Session) -> dict:
    """
    Check current database status and return statistics.
    """
    flashcard_count = len(session.exec(select(FlashcardEntity)).all())
    sentence_challenge_count = len(session.exec(select(SentenceChallengeEntity)).all())
    
    return {
        "flashcards": flashcard_count,
        "sentence_challenges": sentence_challenge_count,
    }


def run_seed():
    """
    Run database initialization.
    
    NOTE: This does NOT insert mock data.
    Data is populated by the external 'language_info_extraction' project.
    """
    log.info("=" * 60)
    log.info("DATABASE INITIALIZATION")
    log.info("=" * 60)
    
    try:
        db_connection = DatabaseConnection()
        
        with db_connection.session as session:
            inserted_flashcards = ensure_starter_flashcards(session)
            inserted_challenges = ensure_sentence_challenges(session)
            status = check_database_status(session)
            
        log.info("=" * 60)
        log.info("DATABASE STATUS")
        log.info("=" * 60)
        log.info(f"Flashcards in database: {status['flashcards']}")
        log.info(f"Sentence challenges in database: {status['sentence_challenges']}")
        if inserted_flashcards:
            log.info(f"✓ Inserted {inserted_flashcards} starter flashcards")
        if inserted_challenges:
            log.info(f"✓ Inserted {inserted_challenges} starter sentence challenges")
        
        if status['flashcards'] == 0:
            log.warning("⚠️  Database is empty!")
            log.warning("   Data should be populated by 'language_info_extraction' project.")
        else:
            log.info(f"✓ Database contains {status['flashcards']} flashcards")
        
        log.info("=" * 60)
        
    except Exception as e:
        log.error("=" * 60)
        log.error("DATABASE CHECK FAILED")
        log.error("=" * 60)
        log.error(f"Error: {e}")
        log.error(f"Error type: {type(e).__name__}")
        raise


if __name__ == "__main__":
    run_seed()
