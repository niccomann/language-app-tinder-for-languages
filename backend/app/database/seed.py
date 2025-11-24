import logging

from sqlmodel import Session, select

from app.database.connection import DatabaseConnection
from app.database.models import FlashcardEntity
from app.data.mock_cards import MOCK_FLASHCARDS

log = logging.getLogger(__name__)


def seed_flashcards(session: Session) -> int:
    """
    Seed the database with flashcards from mock data.
    
    Returns the number of flashcards inserted.
    """
    log.info("Starting flashcard seeding...")
    
    # Check if flashcards already exist
    existing_count = session.exec(select(FlashcardEntity)).all()
    if len(existing_count) > 0:
        log.info(f"Database already contains {len(existing_count)} flashcards. Skipping seed.")
        return 0
    
    inserted_count = 0
    
    for card_data in MOCK_FLASHCARDS:
        flashcard = FlashcardEntity(
            word=card_data["word"],
            translation=card_data["translation"],
            image_url=card_data["image_url"],
            language=card_data["language"],
            difficulty=card_data.get("difficulty"),
            category=card_data.get("category")
        )
        session.add(flashcard)
        inserted_count += 1
    
    session.commit()
    log.info(f"✓ Successfully seeded {inserted_count} flashcards")
    
    return inserted_count


def run_seed():
    """
    Run the seed process.
    """
    log.info("=" * 60)
    log.info("STARTING DATABASE SEED")
    log.info("=" * 60)
    
    try:
        db_connection = DatabaseConnection()
        
        with db_connection.session as session:
            flashcard_count = seed_flashcards(session)
            
        log.info("=" * 60)
        log.info("SEED COMPLETED SUCCESSFULLY")
        log.info(f"Total flashcards inserted: {flashcard_count}")
        log.info("=" * 60)
        
    except Exception as e:
        log.error("=" * 60)
        log.error("SEED FAILED")
        log.error("=" * 60)
        log.error(f"Error: {e}")
        log.error(f"Error type: {type(e).__name__}")
        raise


if __name__ == "__main__":
    run_seed()
