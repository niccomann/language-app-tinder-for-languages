"""
Tracking Service
Gestisce la logica di business per il tracking delle interazioni utente.
"""

import logging
import json
import uuid
from datetime import UTC, datetime
from typing import Optional, List, Dict, Any

from sqlmodel import Session, select, func

from app.database.tracking_connection import get_tracking_engine
from app.database.tracking_models import (
    TrackingSession,
    TrackingAction,
    TrackingWordStats,
    TrackingLanguageFact,
    ActionType,
    SessionStatus
)

logger = logging.getLogger(__name__)


class TrackingService:
    """Service for tracking user interactions"""
    
    def __init__(self):
        self.engine = get_tracking_engine()
    
    def _get_session(self) -> Session:
        """Get a database session"""
        return Session(self.engine)
    
    # ==================== SESSION MANAGEMENT ====================
    
    def start_session(
        self,
        user_id: str = "default_user",
        device_type: Optional[str] = None,
        app_version: Optional[str] = None
    ) -> TrackingSession:
        """
        Start a new tracking session.
        Returns the created session.
        """
        with self._get_session() as db:
            session = TrackingSession(
                session_uuid=str(uuid.uuid4()),
                user_id=user_id,
                device_type=device_type,
                app_version=app_version,
                status=SessionStatus.ACTIVE.value
            )
            db.add(session)
            db.commit()
            db.refresh(session)
            
            logger.info(f"✅ Started tracking session: {session.session_uuid}")
            return session
    
    def get_session_by_uuid(self, session_uuid: str) -> Optional[TrackingSession]:
        """Get a session by its UUID"""
        with self._get_session() as db:
            statement = select(TrackingSession).where(
                TrackingSession.session_uuid == session_uuid
            )
            return db.exec(statement).first()
    
    def get_active_session(self, user_id: str = "default_user") -> Optional[TrackingSession]:
        """Get the active session for a user, if any"""
        with self._get_session() as db:
            statement = select(TrackingSession).where(
                TrackingSession.user_id == user_id,
                TrackingSession.status == SessionStatus.ACTIVE.value
            ).order_by(TrackingSession.started_at.desc())
            return db.exec(statement).first()
    
    def end_session(
        self,
        session_uuid: str,
        status: SessionStatus = SessionStatus.COMPLETED
    ) -> Optional[TrackingSession]:
        """
        End a tracking session.
        Calculates duration and updates status.
        """
        with self._get_session() as db:
            statement = select(TrackingSession).where(
                TrackingSession.session_uuid == session_uuid
            )
            session = db.exec(statement).first()
            
            if not session:
                logger.warning(f"Session not found: {session_uuid}")
                return None
            
            session.ended_at = datetime.now(UTC)
            session.status = status.value
            
            # Calculate duration
            if session.started_at:
                started = session.started_at
                ended = session.ended_at
                # Handle timezone-naive datetime from SQLite
                if started.tzinfo is None:
                    started = started.replace(tzinfo=UTC)
                if ended.tzinfo is None:
                    ended = ended.replace(tzinfo=UTC)
                delta = ended - started
                session.duration_seconds = int(delta.total_seconds())
            
            db.add(session)
            db.commit()
            db.refresh(session)
            
            logger.info(f"✅ Ended session {session_uuid} - Duration: {session.duration_seconds}s")
            return session
    
    # ==================== ACTION TRACKING ====================
    
    def track_action(
        self,
        session_uuid: str,
        action_type: ActionType,
        word: Optional[str] = None,
        word_id: Optional[int] = None,
        translation: Optional[str] = None,
        language: str = "de",
        sentence_de: Optional[str] = None,
        sentence_en: Optional[str] = None,
        from_section: Optional[str] = None,
        to_section: Optional[str] = None,
        success: Optional[bool] = None,
        score: Optional[int] = None,
        extra_data: Optional[Dict[str, Any]] = None
    ) -> Optional[TrackingAction]:
        """
        Track a user action.
        Also updates session statistics and word stats.
        """
        with self._get_session() as db:
            # Get session
            statement = select(TrackingSession).where(
                TrackingSession.session_uuid == session_uuid
            )
            session = db.exec(statement).first()
            
            if not session:
                logger.warning(f"Cannot track action - session not found: {session_uuid}")
                return None
            
            # Create action
            action = TrackingAction(
                session_id=session.id,
                action_type=action_type.value,
                word=word,
                word_id=word_id,
                translation=translation,
                language=language,
                sentence_de=sentence_de,
                sentence_en=sentence_en,
                from_section=from_section,
                to_section=to_section,
                success=success,
                score=score,
                extra_data=json.dumps(extra_data) if extra_data else None
            )
            db.add(action)
            
            # Update session stats
            session.total_actions += 1
            session.last_activity_at = datetime.now(UTC)
            
            if action_type == ActionType.SWIPE_RIGHT:
                session.total_swipes += 1
                session.correct_swipes += 1
            elif action_type == ActionType.SWIPE_LEFT:
                session.total_swipes += 1
            elif action_type == ActionType.SENTENCE_BUILD_COMPLETE:
                session.sentences_built += 1
            elif action_type == ActionType.SENTENCE_VALIDATED:
                session.sentences_validated += 1
            elif action_type == ActionType.WORD_VIEW:
                session.words_viewed += 1
            elif action_type == ActionType.VIDEO_COMPLETE:
                session.videos_watched += 1
            elif action_type == ActionType.PLAY_AUDIO:
                session.audio_played += 1
            
            db.add(session)
            
            # Update word stats if word is provided
            if word and action_type in [
                ActionType.SWIPE_RIGHT,
                ActionType.SWIPE_LEFT,
                ActionType.PLAY_AUDIO,
                ActionType.WORD_VIEW
            ]:
                self._update_word_stats(
                    db, session.id, word, word_id, translation, language, action_type
                )
            
            db.commit()
            db.refresh(action)
            
            logger.debug(f"Tracked action: {action_type.value} for session {session_uuid}")
            return action
    
    def _update_word_stats(
        self,
        db: Session,
        session_id: int,
        word: str,
        word_id: Optional[int],
        translation: Optional[str],
        language: str,
        action_type: ActionType
    ):
        """Update word statistics for a session"""
        # Find or create word stats
        statement = select(TrackingWordStats).where(
            TrackingWordStats.session_id == session_id,
            TrackingWordStats.word == word
        )
        word_stats = db.exec(statement).first()
        
        if not word_stats:
            word_stats = TrackingWordStats(
                session_id=session_id,
                word=word,
                word_id=word_id,
                translation=translation,
                language=language
            )
        
        word_stats.times_seen += 1
        word_stats.last_seen_at = datetime.now(UTC)
        
        if action_type == ActionType.SWIPE_RIGHT:
            word_stats.times_correct += 1
        elif action_type == ActionType.SWIPE_LEFT:
            word_stats.times_incorrect += 1
        elif action_type == ActionType.PLAY_AUDIO:
            word_stats.times_audio_played += 1
        elif action_type == ActionType.WORD_VIEW:
            word_stats.times_detail_viewed += 1
        
        # Calculate session confidence
        total = word_stats.times_correct + word_stats.times_incorrect
        if total > 0:
            word_stats.session_confidence = int(
                (word_stats.times_correct / total) * 100
            )
        
        db.add(word_stats)
    
    # ==================== LANGUAGE FACTS ====================
    
    def track_language_fact(
        self,
        session_uuid: str,
        fact_type: str,
        fact_text: str,
        related_word: Optional[str] = None,
        language: str = "de",
        extra_data: Optional[Dict[str, Any]] = None
    ) -> Optional[TrackingLanguageFact]:
        """Track a language fact shown to the user"""
        with self._get_session() as db:
            statement = select(TrackingSession).where(
                TrackingSession.session_uuid == session_uuid
            )
            session = db.exec(statement).first()
            
            if not session:
                return None
            
            fact = TrackingLanguageFact(
                session_id=session.id,
                fact_type=fact_type,
                fact_text=fact_text,
                related_word=related_word,
                language=language,
                extra_data=json.dumps(extra_data) if extra_data else None
            )
            db.add(fact)
            db.commit()
            db.refresh(fact)
            
            return fact
    
    # ==================== SESSION SUMMARY ====================
    
    def get_session_summary(self, session_uuid: str) -> Optional[Dict[str, Any]]:
        """
        Get a complete summary of a session for infographic generation.
        """
        with self._get_session() as db:
            # Get session
            statement = select(TrackingSession).where(
                TrackingSession.session_uuid == session_uuid
            )
            session = db.exec(statement).first()
            
            if not session:
                return None
            
            # Get word stats
            word_stats_stmt = select(TrackingWordStats).where(
                TrackingWordStats.session_id == session.id
            ).order_by(TrackingWordStats.times_seen.desc())
            word_stats = db.exec(word_stats_stmt).all()
            
            # Get language facts
            facts_stmt = select(TrackingLanguageFact).where(
                TrackingLanguageFact.session_id == session.id
            )
            facts = db.exec(facts_stmt).all()
            
            # Calculate derived stats
            accuracy = 0
            if session.total_swipes > 0:
                accuracy = (session.correct_swipes / session.total_swipes) * 100
            
            duration_minutes = 0
            if session.duration_seconds:
                duration_minutes = session.duration_seconds // 60
            elif session.started_at:
                now = datetime.now(UTC)
                started = session.started_at
                # Handle timezone-naive datetime from SQLite
                if started.tzinfo is None:
                    started = started.replace(tzinfo=UTC)
                delta = now - started
                duration_minutes = int(delta.total_seconds()) // 60
            
            # Words learned well (confidence >= 70%)
            words_learned = [
                {
                    "word": ws.word,
                    "translation": ws.translation,
                    "confidence": ws.session_confidence or 0
                }
                for ws in word_stats
                if (ws.session_confidence or 0) >= 70
            ]
            
            # Words to practice more (confidence < 70%)
            words_to_practice = [
                {
                    "word": ws.word,
                    "translation": ws.translation,
                    "confidence": ws.session_confidence or 0
                }
                for ws in word_stats
                if (ws.session_confidence or 0) < 70
            ]
            
            return {
                "session_uuid": session.session_uuid,
                "user_id": session.user_id,
                "started_at": session.started_at.isoformat() if session.started_at else None,
                "ended_at": session.ended_at.isoformat() if session.ended_at else None,
                "status": session.status,
                "duration_minutes": duration_minutes,
                
                "total_actions": session.total_actions,
                "total_swipes": session.total_swipes,
                "correct_swipes": session.correct_swipes,
                "accuracy_percent": round(accuracy, 1),
                
                "sentences_built": session.sentences_built,
                "sentences_validated": session.sentences_validated,
                "words_viewed": session.words_viewed,
                "videos_watched": session.videos_watched,
                "audio_played": session.audio_played,
                
                "unique_words_practiced": len(word_stats),
                "words_learned": words_learned,
                "words_to_practice": words_to_practice,
                
                "language_facts": [
                    {
                        "type": f.fact_type,
                        "text": f.fact_text,
                        "word": f.related_word
                    }
                    for f in facts
                ],
                
                "device_type": session.device_type,
                "app_version": session.app_version
            }


# Singleton instance
_tracking_service: Optional[TrackingService] = None


def get_tracking_service() -> TrackingService:
    """Get or create singleton TrackingService instance"""
    global _tracking_service
    if _tracking_service is None:
        _tracking_service = TrackingService()
    return _tracking_service
