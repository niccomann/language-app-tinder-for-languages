import base64
import hashlib
import logging
import os
from typing import Optional

from openai import OpenAI
from sqlmodel import Session, select

from app.database.models import AudioCacheEntity

log = logging.getLogger(__name__)

# Language code -> human name, used to steer pronunciation through the
# gpt-4o-mini-tts `instructions` channel. Covers both UI source locales
# (narration) and learnable target languages (word/sentence audio).
LANGUAGE_NAMES = {
    "en": "English",
    "it": "Italian",
    "fr": "French",
    "es": "Spanish",
    "de": "German",
    "pt": "Portuguese",
}


class TextToSpeechService:
    """Generate and cache OpenAI TTS audio, steering pronunciation by language.

    Audio is stored as a base64 data URI in the database to avoid repeated API calls.
    """

    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        self.client = OpenAI(api_key=api_key) if api_key else None
        # gpt-4o-mini-tts honours the `instructions` field (accent/language/tone);
        # tts-1/tts-1-hd ignore it and only auto-detect the language from the text,
        # which is what made narration mispronounce mixed-language copy.
        self.default_model = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
        self.default_voice = "nova"

    def _supports_instructions(self) -> bool:
        return self.default_model.startswith("gpt-")

    def _voice_instructions(self, language: str) -> Optional[str]:
        name = LANGUAGE_NAMES.get((language or "").lower()[:2])
        if not name:
            return None
        return (
            f"Read the text aloud in {name} with a natural, native accent and clear, "
            f"warm pronunciation, at a calm pace suited to a language-learning app. "
            f"Pronounce any embedded foreign or product names naturally within {name}."
        )

    def _compute_hash(self, text: str, language: str, voice: str) -> str:
        """Compute the SHA256 cache key.

        The model is part of the key so a model/quality change regenerates audio
        instead of serving stale lower-quality entries; old rows are kept, not deleted.
        """
        key = f"{self.default_model}:{text}:{language}:{voice}"
        return hashlib.sha256(key.encode()).hexdigest()

    def _synthesize(self, text: str, language: str, voice: str) -> str:
        """Call OpenAI TTS once and return a `data:audio/mpeg;base64,...` URI."""
        if self.client is None:
            raise RuntimeError("OpenAI TTS disabled: no OPENAI_API_KEY configured")

        kwargs = {"model": self.default_model, "voice": voice, "input": text}
        instructions = self._voice_instructions(language)
        if instructions and self._supports_instructions():
            kwargs["instructions"] = instructions

        log.info(
            f"Generating TTS ({self.default_model}, lang={language}) for: '{text[:40]}'"
        )
        response = self.client.audio.speech.create(**kwargs)
        audio_base64 = base64.b64encode(response.content).decode()
        return f"data:audio/mpeg;base64,{audio_base64}"

    def get_cached_audio(
        self,
        session: Session,
        text: str,
        language: str = "de",
        voice: str = "nova",
    ) -> Optional[str]:
        """Return cached audio for this text/language/voice, or None."""
        text_hash = self._compute_hash(text, language, voice)
        cached = session.exec(
            select(AudioCacheEntity).where(AudioCacheEntity.text_hash == text_hash)
        ).first()
        if cached:
            log.info(f"Cache HIT for: '{text[:30]}...'")
            return cached.audio_base64
        log.info(f"Cache MISS for: '{text[:30]}...'")
        return None

    def generate_and_cache_audio(
        self,
        session: Session,
        text: str,
        language: str = "de",
        voice: str = "nova",
    ) -> str:
        """Return cached audio if present, otherwise synthesize, cache, and return it."""
        cached = self.get_cached_audio(session, text, language, voice)
        if cached:
            return cached
        audio_data_uri = self._synthesize(text, language, voice)
        self.save_to_cache(session, text, language, voice, audio_data_uri)
        return audio_data_uri

    def check_audio_exists(
        self,
        session: Session,
        text: str,
        language: str = "de",
        voice: str = "nova",
    ) -> bool:
        """Check if audio exists in cache without returning it."""
        text_hash = self._compute_hash(text, language, voice)
        cached = session.exec(
            select(AudioCacheEntity).where(AudioCacheEntity.text_hash == text_hash)
        ).first()
        return cached is not None

    def generate_audio_only(
        self,
        text: str,
        language: str = "de",
        voice: str = "nova",
    ) -> str:
        """Synthesize audio without caching (entity-column callers persist it themselves)."""
        return self._synthesize(text, language, voice)

    def save_to_cache(
        self,
        session: Session,
        text: str,
        language: str,
        voice: str,
        audio_base64: str,
    ) -> None:
        """Idempotently insert into AudioCacheEntity.

        If an entry for this text/language/voice already exists we skip the insert,
        so retries/races never hit the unique text_hash constraint (500).
        """
        text_hash = self._compute_hash(text, language, voice)
        existing = session.exec(
            select(AudioCacheEntity).where(AudioCacheEntity.text_hash == text_hash)
        ).first()
        if existing:
            return

        session.add(
            AudioCacheEntity(
                text_hash=text_hash,
                text=text,
                language=language,
                voice=voice,
                audio_base64=audio_base64,
            )
        )
        session.commit()
        log.info(f"Audio saved to cache for: '{text[:30]}...'")


tts_service = TextToSpeechService()
