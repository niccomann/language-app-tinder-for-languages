from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import cards, videos, sora
import os
import logging
from dotenv import load_dotenv

from app.core.config import config
from app.database.connection import DatabaseConnection
from app.database.seed import run_seed

load_dotenv()

log = logging.getLogger(__name__)

app = FastAPI(
    title="Tinder for Languages API",
    description="Backend API for language learning swipe app",
    version="1.0.0"
)


@app.on_event("startup")
async def startup_event():
    """Initialize database on application startup"""
    log.info("Application startup - Initializing database...")
    
    try:
        db_connection = DatabaseConnection()
        
        # Recreate schema if configured
        if config.database.recreate_db:
            log.warning("RECREATE_DB is True - Recreating database schema...")
            db_connection.recreate_schema()
        
        # Create tables if they don't exist
        db_connection.create_database_and_tables()
        
        # Seed initial data
        run_seed()
        
        log.info("✓ Database initialization completed successfully")
        
    except Exception as e:
        log.error(f"Failed to initialize database: {e}")
        raise

# CORS configuration to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(cards.router)
app.include_router(videos.router)
app.include_router(sora.router)


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
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
