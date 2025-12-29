import base64
import hashlib
import logging
from typing import Optional

from openai import OpenAI
from sqlmodel import Session, select

from app.database.models import AudioCacheEntity

log = logging.getLogger(__name__)


class TextToSpeechService:
    """
    Service for generating and caching TTS audio using OpenAI API.
    Audio is stored as base64 in PostgreSQL to avoid repeated API calls.
    """
    
    def __init__(self):
        self.client = OpenAI()
        self.default_model = "tts-1"
        self.default_voice = "nova"
    
    def _compute_hash(self, text: str, language: str, voice: str) -> str:
        """Compute SHA256 hash for cache key"""
        key = f"{text}:{language}:{voice}"
        return hashlib.sha256(key.encode()).hexdigest()
    
    def get_cached_audio(
        self, 
        session: Session, 
        text: str, 
        language: str = "de", 
        voice: str = "nova"
    ) -> Optional[str]:
        """Check if audio exists in cache"""
        text_hash = self._compute_hash(text, language, voice)
        
        statement = select(AudioCacheEntity).where(
            AudioCacheEntity.text_hash == text_hash
        )
        cached = session.exec(statement).first()
        
        if cached:
            log.info(f"Cache HIT for text: '{text[:30]}...'")
            return cached.audio_base64
        
        log.info(f"Cache MISS for text: '{text[:30]}...'")
        return None
    
    def generate_and_cache_audio(
        self,
        session: Session,
        text: str,
        language: str = "de",
        voice: str = "nova"
    ) -> str:
        """
        Generate audio with OpenAI TTS and cache it in database.
        Returns base64 encoded audio with data URI prefix.
        """
        cached = self.get_cached_audio(session, text, language, voice)
        if cached:
            return cached
        
        log.info(f"Generating TTS audio for: '{text}'")
        
        response = self.client.audio.speech.create(
            model=self.default_model,
            voice=voice,
            input=text,
        )
        
        audio_bytes = response.content
        audio_base64 = base64.b64encode(audio_bytes).decode()
        audio_data_uri = f"data:audio/mpeg;base64,{audio_base64}"
        
        text_hash = self._compute_hash(text, language, voice)
        new_cache = AudioCacheEntity(
            text_hash=text_hash,
            text=text,
            language=language,
            voice=voice,
            audio_base64=audio_data_uri
        )
        
        session.add(new_cache)
        session.flush()
        
        log.info(f"Audio cached successfully for: '{text[:30]}...'")
        return audio_data_uri
    
    def check_audio_exists(
        self,
        session: Session,
        text: str,
        language: str = "de",
        voice: str = "nova"
    ) -> bool:
        """Check if audio exists in cache without returning it"""
        text_hash = self._compute_hash(text, language, voice)
        
        statement = select(AudioCacheEntity).where(
            AudioCacheEntity.text_hash == text_hash
        )
        cached = session.exec(statement).first()
        
        return cached is not None


tts_service = TextToSpeechService()
