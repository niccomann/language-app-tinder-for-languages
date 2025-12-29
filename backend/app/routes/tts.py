import logging
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import SessionDependency
from app.services.openai_tts import tts_service

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tts", tags=["tts"])


class TTSRequest(BaseModel):
    text: str
    language: str = "de"
    voice: str = "nova"


class TTSResponse(BaseModel):
    audio_base64: str
    cached: bool


class TTSCheckRequest(BaseModel):
    texts: List[str]
    language: str = "de"
    voice: str = "nova"


class TTSCheckResponse(BaseModel):
    results: dict[str, bool]


@router.post("/speak", response_model=TTSResponse)
async def generate_speech(request: TTSRequest, session: SessionDependency):
    """
    Generate TTS audio for the given text.
    Returns base64 encoded audio. Caches result in database.
    """
    try:
        cached_audio = tts_service.get_cached_audio(
            session, 
            request.text, 
            request.language, 
            request.voice
        )
        
        if cached_audio:
            return TTSResponse(audio_base64=cached_audio, cached=True)
        
        audio_base64 = tts_service.generate_and_cache_audio(
            session,
            request.text,
            request.language,
            request.voice
        )
        
        return TTSResponse(audio_base64=audio_base64, cached=False)
        
    except Exception as e:
        log.error(f"TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")


@router.post("/check", response_model=TTSCheckResponse)
async def check_audio_exists(request: TTSCheckRequest, session: SessionDependency):
    """
    Check if audio exists in cache for multiple texts.
    Returns a dict mapping text -> exists (boolean).
    """
    results = {}
    
    for text in request.texts:
        exists = tts_service.check_audio_exists(
            session,
            text,
            request.language,
            request.voice
        )
        results[text] = exists
    
    return TTSCheckResponse(results=results)


@router.get("/cached/{text_hash}")
async def get_cached_audio(text_hash: str, session: SessionDependency):
    """
    Get cached audio by its hash (for direct access if needed).
    """
    from sqlmodel import select
    from app.database.models import AudioCacheEntity
    
    statement = select(AudioCacheEntity).where(
        AudioCacheEntity.text_hash == text_hash
    )
    cached = session.exec(statement).first()
    
    if not cached:
        raise HTTPException(status_code=404, detail="Audio not found in cache")
    
    return TTSResponse(audio_base64=cached.audio_base64, cached=True)
