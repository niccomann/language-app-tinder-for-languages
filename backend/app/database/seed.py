"""
Database seed module.

NOTE: This project does NOT seed data from mock files.
All linguistic data is populated by the external 'language_info_extraction' project.
This module only ensures database tables are created.
"""
import logging

from sqlmodel import Session, select

from app.database.connection import DatabaseConnection
from app.database.models import FlashcardEntity

log = logging.getLogger(__name__)


def check_database_status(session: Session) -> dict:
    """
    Check current database status and return statistics.
    """
    flashcard_count = len(session.exec(select(FlashcardEntity)).all())
    
    return {
        "flashcards": flashcard_count,
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
            status = check_database_status(session)
            
        log.info("=" * 60)
        log.info("DATABASE STATUS")
        log.info("=" * 60)
        log.info(f"Flashcards in database: {status['flashcards']}")
        
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
