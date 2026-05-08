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
from app.database.models import FlashcardEntity, SentenceChallengeEntity

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
            inserted_challenges = ensure_sentence_challenges(session)
            status = check_database_status(session)
            
        log.info("=" * 60)
        log.info("DATABASE STATUS")
        log.info("=" * 60)
        log.info(f"Flashcards in database: {status['flashcards']}")
        log.info(f"Sentence challenges in database: {status['sentence_challenges']}")
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
