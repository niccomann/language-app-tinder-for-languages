import logging
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.database import SessionDependency
from app.database.models import FlashcardEntity, GrammarSentenceEntity
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
    PRINCIPIO: Salva audio direttamente nel DB (flashcard o grammar_sentence).
    1. Cerca flashcard con questa parola
    2. Se non trovata, cerca frase grammaticale
    3. Se ha audio_base64, restituiscilo
    4. Se no, genera e salva nell'entità corrispondente
    """
    try:
        # 1. Cerca flashcard con questa parola
        flashcard = session.exec(
            select(FlashcardEntity).where(
                FlashcardEntity.word == request.text,
                FlashcardEntity.language == request.language
            )
        ).first()
        
        if flashcard and flashcard.audio_base64:
            log.info(f"Audio found in flashcard for: '{request.text}'")
            return TTSResponse(audio_base64=flashcard.audio_base64, cached=True)
        
        # 2. Se non è una flashcard, cerca frase grammaticale
        grammar_sentence = None
        if not flashcard:
            grammar_sentence = session.exec(
                select(GrammarSentenceEntity).where(
                    GrammarSentenceEntity.german == request.text,
                    GrammarSentenceEntity.language == request.language
                )
            ).first()
            
            if grammar_sentence and grammar_sentence.audio_base64:
                log.info(f"Audio found in grammar_sentence for: '{request.text}'")
                return TTSResponse(audio_base64=grammar_sentence.audio_base64, cached=True)
        
        # 3. Genera audio con OpenAI TTS
        log.info(f"Generating TTS audio for: '{request.text}'")
        audio_base64 = tts_service.generate_audio_only(request.text, request.voice)
        
        # 4. Salva audio nell'entità corrispondente
        if flashcard:
            flashcard.audio_base64 = audio_base64
            session.add(flashcard)
            session.commit()
            log.info(f"Audio saved to flashcard for: '{request.text}'")
        elif grammar_sentence:
            grammar_sentence.audio_base64 = audio_base64
            session.add(grammar_sentence)
            session.commit()
            log.info(f"Audio saved to grammar_sentence for: '{request.text}'")
        else:
            # Fallback: salva in cache solo se non è né flashcard né frase
            log.info(f"No entity found, saving to cache for: '{request.text}'")
            tts_service.save_to_cache(session, request.text, request.language, request.voice, audio_base64)
        
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
