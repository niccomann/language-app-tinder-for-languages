"""
Infographics API Routes
Endpoints for generating lesson summary infographics using Gemini
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging

from app.services.gemini_image import (
    get_gemini_image_service,
    LessonSummaryData,
    GeneratedInfographic
)
from app.services.tracking_service import get_tracking_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/infographics", tags=["infographics"])


class WordLearned(BaseModel):
    word: str
    translation: str
    confidence: Optional[int] = 0


class LessonSummaryRequest(BaseModel):
    words_learned: List[WordLearned]
    sentences_built: List[str] = []
    total_swipes: int
    correct_swipes: int
    session_duration_minutes: int
    language: str = "de"
    user_id: str = "default_user"
    use_pro_model: bool = True


class CustomImageRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "1:1"
    use_pro_model: bool = False


class InfographicResponse(BaseModel):
    success: bool
    image_base64: Optional[str] = None
    prompt_used: Optional[str] = None
    model: Optional[str] = None
    metadata: Optional[dict] = None
    error: Optional[str] = None


@router.post("/lesson-summary", response_model=InfographicResponse)
async def generate_lesson_summary_infographic(request: LessonSummaryRequest):
    """
    Generate an infographic summarizing a completed lesson.
    
    This creates a visually appealing image showing:
    - Words learned
    - Sentences built
    - Accuracy percentage
    - Time spent
    """
    try:
        service = get_gemini_image_service()
        
        lesson_data = LessonSummaryData(
            words_learned=[w.model_dump() for w in request.words_learned],
            sentences_built=request.sentences_built,
            total_swipes=request.total_swipes,
            correct_swipes=request.correct_swipes,
            session_duration_minutes=request.session_duration_minutes,
            language=request.language,
            user_id=request.user_id
        )
        
        result = await service.generate_lesson_infographic(
            data=lesson_data,
            use_pro_model=request.use_pro_model
        )
        
        return InfographicResponse(
            success=True,
            image_base64=result.image_base64,
            prompt_used=result.prompt_used,
            model=result.model,
            metadata=result.metadata
        )
        
    except ImportError as error:
        logger.error(f"Missing dependency: {error}")
        raise HTTPException(
            status_code=500,
            detail="google-genai package not installed. Run: pip install google-genai"
        )
    except ValueError as error:
        logger.error(f"Value error: {error}")
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as error:
        logger.error(f"Error generating infographic: {error}")
        raise HTTPException(status_code=500, detail=str(error))


@router.post("/custom", response_model=InfographicResponse)
async def generate_custom_image(request: CustomImageRequest):
    """
    Generate a custom image from a text prompt.
    
    Useful for testing or generating specific educational images.
    """
    try:
        service = get_gemini_image_service()
        
        result = await service.generate_custom_image(
            prompt=request.prompt,
            aspect_ratio=request.aspect_ratio,
            use_pro_model=request.use_pro_model
        )
        
        return InfographicResponse(
            success=True,
            image_base64=result.image_base64,
            prompt_used=result.prompt_used,
            model=result.model,
            metadata=result.metadata
        )
        
    except ImportError as error:
        logger.error(f"Missing dependency: {error}")
        raise HTTPException(
            status_code=500,
            detail="google-genai package not installed. Run: pip install google-genai"
        )
    except Exception as error:
        logger.error(f"Error generating custom image: {error}")
        raise HTTPException(status_code=500, detail=str(error))


class SessionInfographicRequest(BaseModel):
    session_uuid: str
    use_pro_model: bool = True


@router.post("/from-session", response_model=InfographicResponse)
async def generate_infographic_from_session(request: SessionInfographicRequest):
    """
    Generate an infographic from a tracked session.
    Uses the session data collected via /api/tracking endpoints.
    Returns image as base64.
    """
    try:
        tracking_service = get_tracking_service()
        image_service = get_gemini_image_service()
        
        summary = tracking_service.get_session_summary(request.session_uuid)
        if not summary:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if summary["total_actions"] == 0:
            raise HTTPException(
                status_code=400,
                detail="Session has no actions to summarize"
            )
        
        words_learned = summary.get("words_learned", [])
        words_to_practice = summary.get("words_to_practice", [])
        all_words = words_learned + words_to_practice
        
        lesson_data = LessonSummaryData(
            words_learned=all_words[:10],
            sentences_built=[],
            total_swipes=summary["total_swipes"],
            correct_swipes=summary["correct_swipes"],
            session_duration_minutes=summary["duration_minutes"],
            language="de",
            user_id=summary["user_id"]
        )
        
        result = await image_service.generate_lesson_infographic(
            data=lesson_data,
            use_pro_model=request.use_pro_model
        )
        
        return InfographicResponse(
            success=True,
            image_base64=result.image_base64,
            prompt_used=result.prompt_used,
            model=result.model,
            metadata={
                "session_uuid": request.session_uuid,
                "accuracy_percent": summary["accuracy_percent"],
                "words_learned_count": len(words_learned),
                "words_to_practice_count": len(words_to_practice),
                "total_actions": summary["total_actions"]
            }
        )
        
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"Error generating session infographic: {error}")
        raise HTTPException(status_code=500, detail=str(error))


@router.get("/test")
async def test_image_generation():
    """
    Test endpoint to verify Gemini image generation is working.
    Generates a simple test image.
    """
    try:
        service = get_gemini_image_service()
        
        result = await service.generate_custom_image(
            prompt="A simple, colorful illustration of a German flag with the word 'Hallo' written in friendly handwriting style. Minimalist design, white background.",
            aspect_ratio="1:1",
            use_pro_model=False
        )
        
        return InfographicResponse(
            success=True,
            image_base64=result.image_base64,
            prompt_used=result.prompt_used,
            model=result.model,
            metadata={"test": True}
        )
        
    except ImportError as error:
        return InfographicResponse(
            success=False,
            error=f"Missing dependency: {error}. Run: pip install google-genai"
        )
    except Exception as error:
        return InfographicResponse(
            success=False,
            error=str(error)
        )
