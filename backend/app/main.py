from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routes import cards, videos, sora, grammar, tts, library, statistics, infographics, tracking
import os
import logging
from dotenv import load_dotenv

from app.core.config import config
from app.database.connection import DatabaseConnection
from app.database.seed import run_seed
from app.database.tracking_connection import init_tracking_database

load_dotenv()

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
        
        log.info("✓ Database initialization completed successfully")
        
        # Initialize tracking database (separate from main DB)
        log.info("Initializing tracking database...")
        init_tracking_database()
        log.info("✓ Tracking database initialized")
        
    except Exception as e:
        log.error(f"Failed to initialize database: {e}")
        raise
    
    yield


app = FastAPI(
    title="Tinder for Languages API",
    description="Backend API for language learning swipe app",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000", 
        "http://localhost:5174",
        "http://localhost",
        "capacitor://localhost",
        "ionic://localhost",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(cards.router)
app.include_router(videos.router)
app.include_router(sora.router)
app.include_router(grammar.router)
app.include_router(tts.router)
app.include_router(library.router)
app.include_router(statistics.router)
app.include_router(infographics.router)
app.include_router(tracking.router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to Tinder for Languages API",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8500))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
