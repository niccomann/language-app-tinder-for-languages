from fastapi import FastAPI
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from app.routes import cards, grammar, tts, library, statistics, feedback, users
import logging

from shared_fastapi_bootstrap import create_app, run

from app.core.config import config
from app.core.user_middleware import attach_user_id_middleware
from app.database.connection import DatabaseConnection
from app.database.seed import run_seed

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on application startup"""
    log.info("Application startup - Initializing database...")

    try:
        db_connection = DatabaseConnection()

        if config.database.recreate_db:
            log.warning("RECREATE_DB is True - Recreating database schema...")
            db_connection.recreate_schema()

        db_connection.create_database_and_tables()
        run_seed()

        log.info("Database initialization completed successfully")

    except Exception as e:
        log.error(f"Failed to initialize database: {e}")
        raise

    yield


app = create_app(
    title="Tinder for Languages API",
    description="Backend API for language learning swipe app",
    cors_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:5174",
        "http://localhost",
        "capacitor://localhost",
        "ionic://localhost",
        "*",
    ],
    lifespan=lifespan,
)

app.include_router(cards.router)
app.include_router(grammar.router)
app.include_router(tts.router)
app.include_router(library.router)
app.include_router(statistics.router)
app.include_router(feedback.router)
app.include_router(users.router)

app.middleware("http")(attach_user_id_middleware)


if __name__ == "__main__":
    run("app.main:app", port=8500, reload=True)
