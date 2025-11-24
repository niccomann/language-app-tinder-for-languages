import logging
from typing import Annotated, Generator

from fastapi import Depends
from sqlmodel import Session

from app.database.connection import DatabaseConnection

log = logging.getLogger(__name__)


def get_database_session() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a database session.
    
    This function includes comprehensive error logging to help identify
    the exact location and cause of database-related errors.
    """
    session = DatabaseConnection().session
    try:
        session.begin()
        log.debug("Database session started successfully")
        yield session
        session.commit()
        log.debug("Database session committed successfully")
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        
        log.error("=" * 60)
        log.error("DATABASE SESSION ERROR DETECTED")
        log.error("=" * 60)
        log.error(f"Error message: {e}")
        log.error(f"Error type: {type(e).__name__}")
        log.error("")
        log.error("Full traceback:")
        log.error(error_trace)
        log.error("=" * 60)
        
        session.rollback()
        log.debug("Database session rolled back")
        raise
    finally:
        session.close()
        log.debug("Database session closed")


SessionDependency = Annotated[Session, Depends(get_database_session)]
