"""
Tracking Database Connection
Database SQLite separato per il tracking delle interazioni utente.
Completamente indipendente dal database principale dell'app.
"""

import logging
import os
from typing import Generator

from sqlmodel import SQLModel, Session, create_engine

from app.database.tracking_models import (
    TrackingSession,
    TrackingAction,
    TrackingWordStats,
    TrackingLanguageFact
)

logger = logging.getLogger(__name__)

# Database file separato per il tracking
TRACKING_DB_PATH = os.getenv("TRACKING_DB_PATH", "./tracking.db")
TRACKING_DATABASE_URL = f"sqlite:///{TRACKING_DB_PATH}"

# Engine separato per il tracking database
_tracking_engine = None


def get_tracking_engine():
    """Get or create the tracking database engine"""
    global _tracking_engine
    
    if _tracking_engine is None:
        logger.info(f"Creating tracking database engine: {TRACKING_DATABASE_URL}")
        _tracking_engine = create_engine(
            TRACKING_DATABASE_URL,
            echo=False,
            connect_args={"check_same_thread": False}  # SQLite specific
        )
    
    return _tracking_engine


def init_tracking_database():
    """
    Initialize the tracking database.
    Creates all tables if they don't exist.
    """
    engine = get_tracking_engine()
    
    logger.info("Initializing tracking database...")
    logger.info(f"  Database path: {TRACKING_DB_PATH}")
    
    # Create all tracking tables
    SQLModel.metadata.create_all(
        engine,
        tables=[
            TrackingSession.__table__,
            TrackingAction.__table__,
            TrackingWordStats.__table__,
            TrackingLanguageFact.__table__
        ]
    )
    
    logger.info("✅ Tracking database initialized successfully")


def get_tracking_session() -> Generator[Session, None, None]:
    """
    Get a database session for the tracking database.
    Use this as a dependency in FastAPI routes.
    """
    engine = get_tracking_engine()
    with Session(engine) as session:
        yield session


class TrackingDatabaseConnection:
    """
    Helper class for tracking database operations.
    Provides convenience methods for common operations.
    """
    
    def __init__(self):
        self.engine = get_tracking_engine()
    
    def create_tables(self):
        """Create all tracking tables"""
        init_tracking_database()
    
    def get_session(self) -> Session:
        """Get a new database session"""
        return Session(self.engine)
    
    def drop_all_tables(self):
        """Drop all tracking tables (use with caution!)"""
        logger.warning("⚠️ Dropping all tracking tables!")
        SQLModel.metadata.drop_all(
            self.engine,
            tables=[
                TrackingSession.__table__,
                TrackingAction.__table__,
                TrackingWordStats.__table__,
                TrackingLanguageFact.__table__
            ]
        )
    
    def reset_database(self):
        """Reset tracking database (drop and recreate)"""
        self.drop_all_tables()
        self.create_tables()
        logger.info("✅ Tracking database reset completed")
