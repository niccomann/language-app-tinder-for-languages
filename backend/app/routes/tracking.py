"""
Tracking API Routes
Endpoints per registrare le interazioni utente e recuperare i dati sessione.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging

from app.services.tracking_service import (
    get_tracking_service,
    TrackingService
)
from app.database.tracking_models import ActionType, SessionStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tracking", tags=["tracking"])


# ==================== REQUEST/RESPONSE MODELS ====================

class StartSessionRequest(BaseModel):
    user_id: Optional[str] = None
    device_type: Optional[str] = None
    app_version: Optional[str] = None


class StartSessionResponse(BaseModel):
    session_uuid: str
    user_id: str
    started_at: str
    status: str


class TrackActionRequest(BaseModel):
    session_uuid: str
    action_type: str
    word: Optional[str] = None
    word_id: Optional[int] = None
    translation: Optional[str] = None
    language: str = "de"
    sentence_de: Optional[str] = None
    sentence_en: Optional[str] = None
    from_section: Optional[str] = None
    to_section: Optional[str] = None
    success: Optional[bool] = None
    score: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None


class TrackActionResponse(BaseModel):
    success: bool
    action_id: Optional[int] = None
    message: Optional[str] = None


class TrackFactRequest(BaseModel):
    session_uuid: str
    fact_type: str
    fact_text: str
    related_word: Optional[str] = None
    language: str = "de"
    extra_data: Optional[Dict[str, Any]] = None


class EndSessionRequest(BaseModel):
    session_uuid: str
    status: str = "completed"  # completed, abandoned


class SessionSummaryResponse(BaseModel):
    session_uuid: str
    user_id: str
    started_at: Optional[str]
    ended_at: Optional[str]
    status: str
    duration_minutes: int
    total_actions: int
    total_swipes: int
    correct_swipes: int
    accuracy_percent: float
    sentences_built: int
    sentences_validated: int
    words_viewed: int
    videos_watched: int
    audio_played: int
    unique_words_practiced: int
    words_learned: List[Dict[str, Any]]
    words_to_practice: List[Dict[str, Any]]
    language_facts: List[Dict[str, Any]]
    device_type: Optional[str]
    app_version: Optional[str]


# ==================== ENDPOINTS ====================

@router.post("/session/start", response_model=StartSessionResponse)
async def start_session(payload: StartSessionRequest, request: Request):
    """
    Start a new tracking session.
    Call this when the user opens the app or starts a learning session.
    """
    try:
        user_id = payload.user_id or getattr(request.state, "user_id", None) or "default_user"
        service = get_tracking_service()
        session = service.start_session(
            user_id=user_id,
            device_type=payload.device_type,
            app_version=payload.app_version
        )
        
        return StartSessionResponse(
            session_uuid=session.session_uuid,
            user_id=session.user_id,
            started_at=session.started_at.isoformat(),
            status=session.status
        )
        
    except Exception as error:
        logger.error(f"Error starting session: {error}")
        raise HTTPException(status_code=500, detail=str(error))


@router.post("/session/end")
async def end_session(request: EndSessionRequest):
    """
    End a tracking session.
    Call this when the user closes the app or finishes learning.
    """
    try:
        service = get_tracking_service()
        
        status = SessionStatus.COMPLETED
        if request.status == "abandoned":
            status = SessionStatus.ABANDONED
        
        session = service.end_session(
            session_uuid=request.session_uuid,
            status=status
        )
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {
            "success": True,
            "session_uuid": session.session_uuid,
            "status": session.status,
            "duration_seconds": session.duration_seconds
        }
        
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"Error ending session: {error}")
        raise HTTPException(status_code=500, detail=str(error))


@router.get("/session/active")
async def get_active_session(request: Request, user_id: Optional[str] = None):
    """
    Get the active session for a user, if any.
    Useful for resuming a session after app restart.
    """
    try:
        user_id = user_id or getattr(request.state, "user_id", None) or "default_user"
        service = get_tracking_service()
        session = service.get_active_session(user_id=user_id)
        
        if not session:
            return {"active_session": None}
        
        return {
            "active_session": {
                "session_uuid": session.session_uuid,
                "user_id": session.user_id,
                "started_at": session.started_at.isoformat(),
                "total_actions": session.total_actions,
                "total_swipes": session.total_swipes
            }
        }
        
    except Exception as error:
        logger.error(f"Error getting active session: {error}")
        raise HTTPException(status_code=500, detail=str(error))


@router.post("/action", response_model=TrackActionResponse)
async def track_action(request: TrackActionRequest):
    """
    Track a user action.
    Call this for every significant user interaction.
    """
    try:
        service = get_tracking_service()
        
        # Validate action type
        try:
            action_type = ActionType(request.action_type)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid action_type: {request.action_type}. Valid types: {[a.value for a in ActionType]}"
            )
        
        action = service.track_action(
            session_uuid=request.session_uuid,
            action_type=action_type,
            word=request.word,
            word_id=request.word_id,
            translation=request.translation,
            language=request.language,
            sentence_de=request.sentence_de,
            sentence_en=request.sentence_en,
            from_section=request.from_section,
            to_section=request.to_section,
            success=request.success,
            score=request.score,
            extra_data=request.extra_data
        )
        
        if not action:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return TrackActionResponse(
            success=True,
            action_id=action.id
        )
        
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"Error tracking action: {error}")
        raise HTTPException(status_code=500, detail=str(error))


@router.post("/fact")
async def track_language_fact(request: TrackFactRequest):
    """
    Track a language fact shown to the user.
    Useful for including interesting facts in the infographic.
    """
    try:
        service = get_tracking_service()
        
        fact = service.track_language_fact(
            session_uuid=request.session_uuid,
            fact_type=request.fact_type,
            fact_text=request.fact_text,
            related_word=request.related_word,
            language=request.language,
            extra_data=request.extra_data
        )
        
        if not fact:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {"success": True, "fact_id": fact.id}
        
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"Error tracking fact: {error}")
        raise HTTPException(status_code=500, detail=str(error))


@router.get("/session/{session_uuid}/summary", response_model=SessionSummaryResponse)
async def get_session_summary(session_uuid: str):
    """
    Get a complete summary of a session.
    Use this data to generate the infographic.
    """
    try:
        service = get_tracking_service()
        summary = service.get_session_summary(session_uuid)
        
        if not summary:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return SessionSummaryResponse(**summary)
        
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"Error getting session summary: {error}")
        raise HTTPException(status_code=500, detail=str(error))


@router.get("/action-types")
async def get_action_types():
    """
    Get all available action types.
    Useful for frontend integration.
    """
    return {
        "action_types": [
            {"value": action.value, "name": action.name}
            for action in ActionType
        ]
    }
