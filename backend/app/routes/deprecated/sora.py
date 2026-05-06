"""
Deprecated AI video generation endpoints.

Kept for reference only. The router is intentionally not mounted by app.main.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import logging

# Use Gemini/Veo service for real video generation
from app.services.deprecated.gemini_video import get_gemini_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sora", tags=["sora"])


class VideoGenerationRequest(BaseModel):
    """Request model for video generation"""
    word: str = Field(..., description="Word in target language (e.g., 'Hund')")
    translation: str = Field(..., description="English translation (e.g., 'dog')")
    language: str = Field(default="de", description="Language code")
    category: Optional[str] = Field(None, description="Category for context")
    model: str = Field(default="sora-2", description="Sora model to use")
    duration: int = Field(default=5, ge=1, le=20, description="Video duration in seconds")
    resolution: str = Field(default="1280x720", description="Video resolution")


class VideoGenerationResponse(BaseModel):
    """Response model for video generation initiation"""
    job_id: str
    status: str
    word: str
    translation: str
    model: str
    message: str


class JobStatusResponse(BaseModel):
    """Response model for job status"""
    job_id: str
    status: str
    video_url: Optional[str] = None
    duration: Optional[int] = None
    resolution: Optional[str] = None
    error: Optional[str] = None


@router.post("/generate", response_model=VideoGenerationResponse)
async def generate_video(request: VideoGenerationRequest):
    """
    Initiate video generation for a flashcard word
    
    This endpoint starts the video generation process and returns a job_id.
    Use the /status/{job_id} endpoint to poll for completion.
    
    Note: Video generation can take several minutes.
    """
    try:
        sora_service = get_gemini_service()
        
        logger.info(f"Received video generation request for word: {request.word}")
        
        job_info = await sora_service.generate_video(
            word=request.word,
            translation=request.translation,
            language=request.language,
            category=request.category,
            model=request.model,
            duration=request.duration,
            resolution=request.resolution
        )
        
        return VideoGenerationResponse(
            job_id=job_info["job_id"],
            status=job_info["status"],
            word=request.word,
            translation=request.translation,
            model=request.model,
            message=f"Video generation started. Use job_id to check status."
        )
        
    except ValueError as error:
        logger.error(f"Configuration error: {str(error)}")
        raise HTTPException(
            status_code=500,
            detail=f"Configuration error: {str(error)}. Please check OPENAI_API_KEY."
        )
    except Exception as error:
        logger.error(f"Error generating video: {str(error)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate video: {str(error)}"
        )


@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """
    Get the current status of a video generation job
    
    Status can be: "pending", "processing", "completed", "failed", or "timeout"
    
    When status is "completed", the response includes video_url.
    """
    try:
        sora_service = get_gemini_service()
        
        logger.info(f"Checking status for job: {job_id}")
        
        status_info = await sora_service.get_job_status(job_id)
        
        return JobStatusResponse(**status_info)
        
    except Exception as error:
        logger.error(f"Error getting job status: {str(error)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get job status: {str(error)}"
        )


@router.post("/generate-and-wait", response_model=JobStatusResponse)
async def generate_video_and_wait(request: VideoGenerationRequest, timeout: int = 300):
    """
    Generate video and wait for completion (blocking endpoint)
    
    This endpoint will block until the video is generated or timeout is reached.
    Use this for simpler integration, but be aware of long response times.
    
    Args:
        timeout: Maximum wait time in seconds (default: 300 = 5 minutes)
    """
    try:
        sora_service = get_gemini_service()
        
        logger.info(f"Received blocking video generation request for word: {request.word}")
        
        # Start generation
        job_info = await sora_service.generate_video(
            word=request.word,
            translation=request.translation,
            language=request.language,
            category=request.category,
            model=request.model,
            duration=request.duration,
            resolution=request.resolution
        )
        
        # Poll until completion
        result = await sora_service.poll_job_status(
            job_id=job_info["job_id"],
            timeout=timeout
        )
        
        if result["status"] == "completed":
            return JobStatusResponse(**result)
        elif result["status"] == "failed":
            raise HTTPException(
                status_code=500,
                detail=f"Video generation failed: {result.get('error', 'Unknown error')}"
            )
        else:  # timeout
            raise HTTPException(
                status_code=408,
                detail=f"Video generation timed out after {timeout} seconds. "
                       f"Use job_id {job_info['job_id']} to check status later."
            )
        
    except HTTPException:
        raise
    except ValueError as error:
        logger.error(f"Configuration error: {str(error)}")
        raise HTTPException(
            status_code=500,
            detail=f"Configuration error: {str(error)}. Please check OPENAI_API_KEY."
        )
    except Exception as error:
        logger.error(f"Error in blocking video generation: {str(error)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate video: {str(error)}"
        )


@router.post("/generate-multiple", response_model=Dict[str, Any])
async def generate_multiple_videos(request: VideoGenerationRequest, count: int = 3):
    """
    Generate multiple AI videos for a word (for reel-style viewing)
    
    This endpoint starts generation of multiple videos and returns job IDs.
    Use the /status/{job_id} endpoint to poll for completion of each video.
    
    Args:
        request: VideoGenerationRequest with word details
        count: Number of videos to generate (default: 3, max: 5)
    
    Returns:
        Dict with list of job_ids and their initial status
    """
    try:
        if count > 5:
            raise HTTPException(
                status_code=400,
                detail="Maximum 5 videos can be generated at once"
            )
        
        sora_service = get_gemini_service()
        
        logger.info(f"Received request to generate {count} videos for word: {request.word}")
        
        jobs = []
        for index in range(count):
            try:
                job_info = await sora_service.generate_video(
                    word=request.word,
                    translation=request.translation,
                    language=request.language,
                    category=request.category,
                    model=request.model,
                    duration=request.duration,
                    resolution=request.resolution
                )
                
                jobs.append({
                    "job_id": job_info["job_id"],
                    "status": job_info["status"],
                    "index": index
                })
                
                logger.info(f"Started video generation {index + 1}/{count}: {job_info['job_id']}")
                
            except Exception as error:
                logger.error(f"Failed to start video generation {index + 1}: {str(error)}")
                # Continue with other videos even if one fails
                continue
        
        if not jobs:
            raise HTTPException(
                status_code=500,
                detail="Failed to start any video generation"
            )
        
        return {
            "word": request.word,
            "translation": request.translation,
            "count": len(jobs),
            "jobs": jobs,
            "message": f"Started generation of {len(jobs)} videos. Poll each job_id for status."
        }
        
    except HTTPException:
        raise
    except ValueError as error:
        logger.error(f"Configuration error: {str(error)}")
        raise HTTPException(
            status_code=500,
            detail=f"Configuration error: {str(error)}. Please check OPENAI_API_KEY."
        )
    except Exception as error:
        logger.error(f"Error generating multiple videos: {str(error)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate videos: {str(error)}"
        )


@router.get("/health")
async def health_check():
    """Check if Sora service is configured correctly"""
    try:
        sora_service = get_gemini_service()
        return {
            "status": "healthy",
            "service": "sora",
            "api_key_configured": bool(sora_service.api_key)
        }
    except ValueError as error:
        return {
            "status": "unhealthy",
            "service": "sora",
            "error": str(error),
            "api_key_configured": False
        }
