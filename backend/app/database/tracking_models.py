"""
Tracking Database Models
Database separato per tracciare tutte le interazioni utente
Usato per generare infografiche di riepilogo lezione
"""

import logging
from datetime import UTC, datetime
from typing import Optional
from enum import Enum

from sqlmodel import Field, SQLModel, Column, Text

logger = logging.getLogger(__name__)


class ActionType(str, Enum):
    """Tipi di azioni che l'utente può fare"""
    # Flashcard actions
    SWIPE_RIGHT = "swipe_right"  # Conosce la parola
    SWIPE_LEFT = "swipe_left"    # Non conosce la parola
    PLAY_AUDIO = "play_audio"    # Ascolta pronuncia
    
    # Grammar Lab actions
    SENTENCE_BUILD_START = "sentence_build_start"  # Inizia a costruire frase
    SENTENCE_BUILD_COMPLETE = "sentence_build_complete"  # Completa frase
    SENTENCE_VALIDATED = "sentence_validated"  # Frase validata da AI
    GRAMMAR_NODE_DRAG = "grammar_node_drag"  # Trascina nodo grammaticale
    
    # Library actions
    WORD_VIEW = "word_view"  # Visualizza dettaglio parola
    WORD_SEARCH = "word_search"  # Cerca parola
    FILTER_APPLY = "filter_apply"  # Applica filtro
    
    # Video actions
    VIDEO_PLAY = "video_play"  # Avvia video
    VIDEO_COMPLETE = "video_complete"  # Completa video
    
    # Navigation actions
    TAB_SWITCH = "tab_switch"  # Cambia tab/sezione
    
    # Session actions
    SESSION_START = "session_start"
    SESSION_END = "session_end"
    APP_BACKGROUND = "app_background"
    APP_FOREGROUND = "app_foreground"


class SessionStatus(str, Enum):
    """Stati possibili di una sessione"""
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class TrackingSession(SQLModel, table=True):
    """
    Sessione di apprendimento dell'utente.
    Una sessione raggruppa tutte le azioni fatte in un periodo continuo.
    """
    __tablename__ = "tracking_sessions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    session_uuid: str = Field(nullable=False, unique=True, index=True)
    user_id: str = Field(default="default_user", nullable=False, index=True)
    
    started_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    ended_at: Optional[datetime] = Field(default=None)
    last_activity_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    
    status: str = Field(default=SessionStatus.ACTIVE.value)
    
    # Summary stats (aggiornati incrementalmente)
    total_actions: int = Field(default=0)
    total_swipes: int = Field(default=0)
    correct_swipes: int = Field(default=0)
    sentences_built: int = Field(default=0)
    sentences_validated: int = Field(default=0)
    words_viewed: int = Field(default=0)
    videos_watched: int = Field(default=0)
    audio_played: int = Field(default=0)
    
    # Duration in seconds (calcolato a fine sessione)
    duration_seconds: Optional[int] = Field(default=None)
    
    # Device/context info
    device_type: Optional[str] = Field(default=None)  # web, ios, android
    app_version: Optional[str] = Field(default=None)
    
    # Extra data JSON
    extra_data: Optional[str] = Field(default=None, sa_column=Column(Text))


class TrackingAction(SQLModel, table=True):
    """
    Singola azione dell'utente.
    Ogni interazione viene registrata qui.
    """
    __tablename__ = "tracking_actions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="tracking_sessions.id", index=True)
    
    action_type: str = Field(nullable=False, index=True)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC), index=True)
    
    # Contesto dell'azione
    word: Optional[str] = Field(default=None, index=True)
    word_id: Optional[int] = Field(default=None)
    translation: Optional[str] = Field(default=None)
    language: str = Field(default="de")
    
    # Per frasi
    sentence_de: Optional[str] = Field(default=None)
    sentence_en: Optional[str] = Field(default=None)
    
    # Per navigazione
    from_section: Optional[str] = Field(default=None)
    to_section: Optional[str] = Field(default=None)
    
    # Risultato (per azioni con esito)
    success: Optional[bool] = Field(default=None)
    score: Optional[int] = Field(default=None)
    
    # Extra data JSON per dati specifici dell'azione
    extra_data: Optional[str] = Field(default=None, sa_column=Column(Text))


class TrackingWordStats(SQLModel, table=True):
    """
    Statistiche aggregate per parola per sessione.
    Permette di sapere quali parole sono state praticate di più/meno.
    """
    __tablename__ = "tracking_word_stats"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="tracking_sessions.id", index=True)
    
    word: str = Field(nullable=False, index=True)
    word_id: Optional[int] = Field(default=None)
    translation: Optional[str] = Field(default=None)
    language: str = Field(default="de")
    
    times_seen: int = Field(default=0)
    times_correct: int = Field(default=0)
    times_incorrect: int = Field(default=0)
    times_audio_played: int = Field(default=0)
    times_detail_viewed: int = Field(default=0)
    
    # Confidence per questa sessione (0-100)
    session_confidence: Optional[int] = Field(default=None)
    
    first_seen_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_seen_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class TrackingLanguageFact(SQLModel, table=True):
    """
    Fatti/curiosità sulla lingua mostrati durante la sessione.
    Per includere nell'infografica.
    """
    __tablename__ = "tracking_language_facts"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="tracking_sessions.id", index=True)
    
    fact_type: str = Field(nullable=False)  # etymology, false_friend, proverb, dialect, etc.
    fact_text: str = Field(nullable=False)
    related_word: Optional[str] = Field(default=None)
    language: str = Field(default="de")
    
    shown_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    
    extra_data: Optional[str] = Field(default=None, sa_column=Column(Text))
