"""
Sora AI Video Generation Service
Integrates with OpenAI's Sora API to generate educational videos for flashcards.
"""

import os
import time
import logging
from typing import Optional, Dict, Any
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class SoraVideoService:
    """Service for generating videos using OpenAI's Sora API"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Sora service with OpenAI API key
        
        Args:
            api_key: OpenAI API key (defaults to OPENAI_API_KEY env var)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")
        
        self.client = OpenAI(api_key=self.api_key)
        self.max_retries = 3
        self.poll_interval = 5  # seconds
        self.default_timeout = 300  # 5 minutes
        
        logger.info("SoraVideoService initialized")
    
    def generate_prompt_for_word(
        self, 
        word: str, 
        translation: str, 
        language: str = "de",
        category: Optional[str] = None
    ) -> str:
        """
        Generate an educational prompt for Sora based on the word
        
        Args:
            word: The word in the target language (e.g., "Hund")
            translation: English translation (e.g., "dog")
            language: Language code (default: "de" for German)
            category: Optional category for context (e.g., "animals")
        
        Returns:
            Optimized prompt for Sora video generation
        """
        category_context = f" in a {category} context" if category else ""
        
        prompt = (
            f"A short, clear, educational video showing a {translation} ({word} in German). "
            f"The video should be simple, visually appealing, and help someone learn the word. "
            f"Cinematic quality, well-lit, focused on the subject{category_context}. "
            f"No text overlays, just the visual representation."
        )
        
        logger.info(f"Generated prompt for '{word}': {prompt}")
        return prompt
    
    async def generate_video(
        self,
        word: str,
        translation: str,
        language: str = "de",
        category: Optional[str] = None,
        model: str = "sora-2",
        duration: int = 5,
        resolution: str = "1280x720"
    ) -> Dict[str, Any]:
        """
        Generate a video for a flashcard word
        
        Args:
            word: The word in target language
            translation: English translation
            language: Language code
            category: Optional category
            model: Sora model ("sora-2" or "sora-2-pro")
            duration: Video duration in seconds (max 20 for sora-2, 90 for sora-2-pro)
            resolution: Video resolution
        
        Returns:
            Dict with job information including job_id for status polling
        """
        try:
            prompt = self.generate_prompt_for_word(word, translation, language, category)
            
            logger.info(f"Creating video generation job for '{word}' with model {model}")
            
            response = self.client.videos.create(
                model=model,
                prompt=prompt,
                duration=duration,
                resolution=resolution
            )
            
            job_info = {
                "job_id": response.id,
                "status": response.status,
                "model": model,
                "word": word,
                "translation": translation,
                "created_at": response.created_at
            }
            
            logger.info(f"✓ Video generation job created: {response.id}")
            return job_info
            
        except Exception as error:
            logger.error(f"✗ Error creating video job for '{word}': {str(error)}")
            raise
    
    async def poll_job_status(
        self, 
        job_id: str, 
        timeout: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Poll job status until completion or timeout
        
        Args:
            job_id: Job ID from generate_video()
            timeout: Maximum wait time in seconds (default: 300)
        
        Returns:
            Dict with final job status and video URL if successful
        """
        timeout = timeout or self.default_timeout
        start_time = time.time()
        
        logger.info(f"Polling job status for {job_id} (timeout: {timeout}s)")
        
        while (time.time() - start_time) < timeout:
            try:
                job = self.client.videos.retrieve(job_id)
                elapsed = int(time.time() - start_time)
                
                if job.status == "completed":
                    logger.info(f"✓ Video generation completed for job {job_id}")
                    return {
                        "status": "completed",
                        "video_url": job.video_url,
                        "duration": job.duration,
                        "resolution": job.resolution,
                        "job_id": job_id
                    }
                
                elif job.status == "failed":
                    error_msg = getattr(job, 'error', 'Unknown error')
                    logger.error(f"✗ Video generation failed for job {job_id}: {error_msg}")
                    return {
                        "status": "failed",
                        "error": error_msg,
                        "job_id": job_id
                    }
                
                else:
                    logger.debug(f"⏳ Job {job_id} status: {job.status} (elapsed: {elapsed}s)")
                    time.sleep(self.poll_interval)
                    
            except Exception as error:
                logger.error(f"✗ Error polling job status for {job_id}: {str(error)}")
                raise
        
        logger.warning(f"✗ Timeout after {timeout} seconds for job {job_id}")
        return {
            "status": "timeout",
            "job_id": job_id,
            "elapsed": timeout
        }
    
    async def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """
        Get current status of a video generation job without polling
        
        Args:
            job_id: Job ID to check
        
        Returns:
            Dict with current job status
        """
        try:
            job = self.client.videos.retrieve(job_id)
            
            result = {
                "job_id": job_id,
                "status": job.status
            }
            
            if job.status == "completed":
                result.update({
                    "video_url": job.video_url,
                    "duration": job.duration,
                    "resolution": job.resolution
                })
            elif job.status == "failed":
                result["error"] = getattr(job, 'error', 'Unknown error')
            
            return result
            
        except Exception as error:
            logger.error(f"Error getting job status for {job_id}: {str(error)}")
            raise


# Singleton instance
_sora_service: Optional[SoraVideoService] = None


def get_sora_service() -> SoraVideoService:
    """Get or create singleton SoraVideoService instance"""
    global _sora_service
    if _sora_service is None:
        _sora_service = SoraVideoService()
    return _sora_service
