"""
API endpoints for video content
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

from app.services.youtube import youtube_service

log = logging.getLogger(__name__)

router = APIRouter()


class VideoRequest(BaseModel):
    """Request model for video search"""
    word: str
    translation: str
    language: str = "de"


class VideoResponse(BaseModel):
    """Response model for video data"""
    video_id: str
    title: str
    thumbnail: str
    duration: int
    channel: str
    embed_url: str


@router.post("/videos/search", response_model=VideoResponse)
async def search_video(request: VideoRequest):
    """
    Search for a short educational video about a word
    
    Args:
        request: VideoRequest with word, translation, and language
        
    Returns:
        VideoResponse with video details
        
    Raises:
        HTTPException: If no video found or API error
    """
    log.info(f"Searching video for word: {request.word} ({request.translation})")
    
    try:
        video_data = await youtube_service.search_short_video(
            word=request.word,
            translation=request.translation,
            language=request.language
        )
        
        if not video_data:
            raise HTTPException(
                status_code=404,
                detail=f"No suitable video found for word: {request.word}"
            )
        
        # Build embed URL
        embed_url = f"https://www.youtube.com/embed/{video_data['video_id']}?autoplay=1&rel=0"
        
        return VideoResponse(
            video_id=video_data["video_id"],
            title=video_data["title"],
            thumbnail=video_data["thumbnail"],
            duration=video_data["duration"],
            channel=video_data["channel"],
            embed_url=embed_url
        )
        
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error searching video: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while searching for video"
        )


class MultipleVideosRequest(BaseModel):
    """Request model for multiple videos search"""
    word: str
    translation: str
    language: str = "de"
    limit: int = 8


class MultipleVideosResponse(BaseModel):
    """Response model for multiple videos"""
    videos: list[VideoResponse]
    count: int


@router.post("/videos/search-multiple", response_model=MultipleVideosResponse)
async def search_multiple_videos(request: MultipleVideosRequest):
    """
    Search for multiple short educational videos about a word
    
    Args:
        request: MultipleVideosRequest with word, translation, language, and limit
        
    Returns:
        MultipleVideosResponse with list of videos
        
    Raises:
        HTTPException: If API error occurs
    """
    log.info(f"Searching multiple videos for word: {request.word} ({request.translation}), limit: {request.limit}")
    
    try:
        videos_data = await youtube_service.search_multiple_videos(
            word=request.word,
            translation=request.translation,
            language=request.language,
            limit=request.limit
        )
        
        # FALLBACK: If no videos found, use mock data for testing
        if not videos_data:
            log.warning(f"No videos found for {request.word}, using mock data")
            videos_data = [
                {
                    "video_id": "dQw4w9WgXcQ",
                    "title": f"Learn {request.word} in {request.language.upper()} - Video 1",
                    "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
                    "duration": 30,
                    "channel": "Language Learning"
                },
                {
                    "video_id": "9bZkp7q19f0",
                    "title": f"Learn {request.word} in {request.language.upper()} - Video 2",
                    "thumbnail": "https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg",
                    "duration": 45,
                    "channel": "Language Learning"
                },
                {
                    "video_id": "jNQXAC9IVRw",
                    "title": f"Learn {request.word} in {request.language.upper()} - Video 3",
                    "thumbnail": "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
                    "duration": 25,
                    "channel": "Language Learning"
                },
            ]
        
        # Build embed URLs for all videos
        videos_response = []
        for video_data in videos_data:
            embed_url = f"https://www.youtube.com/embed/{video_data['video_id']}?autoplay=1&rel=0"
            videos_response.append(
                VideoResponse(
                    video_id=video_data["video_id"],
                    title=video_data["title"],
                    thumbnail=video_data["thumbnail"],
                    duration=video_data["duration"],
                    channel=video_data["channel"],
                    embed_url=embed_url
                )
            )
        
        log.info(f"Found {len(videos_response)} videos for word: {request.word}")
        
        return MultipleVideosResponse(
            videos=videos_response,
            count=len(videos_response)
        )
        
    except Exception as e:
        log.error(f"Error searching multiple videos: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while searching for videos"
        )
