"""
Mock Sora Video Service for Testing
Since Sora API is not publicly available yet, this provides a mock implementation
"""

import os
import time
import logging
import asyncio
import random
import uuid
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class MockSoraVideoService:
    """Mock service for testing video generation without real API"""
    
    def __init__(self):
        logger.warning("⚠️  Using MOCK Sora service - Sora API not publicly available yet")
        self.api_key = os.getenv("OPENAI_API_KEY", "mock_key")
        self.poll_interval = 5
        self.default_timeout = 300
    
    async def _mock_video_generation(self, job_id: str):
        """Simulate video generation delay"""
        delay = random.uniform(2, 5)
        logger.info(f"🎭 MOCK: Simulating video generation for {job_id} ({delay:.1f}s)")
        await asyncio.sleep(delay)
        logger.info(f"🎭 MOCK: Video generation completed for {job_id}")
    
    def generate_prompt_for_word(
        self, 
        word: str, 
        translation: str, 
        language: str = "de",
        category: Optional[str] = None
    ) -> str:
        """Generate prompt (mock)"""
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
        """Generate mock video job"""
        prompt = self.generate_prompt_for_word(word, translation, language, category)
        job_id = f"mock_job_{uuid.uuid4().hex[:12]}"
        
        job_info = {
            "job_id": job_id,
            "status": "pending",
            "model": model,
            "word": word,
            "translation": translation,
            "created_at": int(time.time()),
            "mock": True
        }
        
        logger.info(f"✓ MOCK video generation job created: {job_id}")
        return job_info
    
    async def poll_job_status(
        self, 
        job_id: str, 
        timeout: Optional[int] = None
    ) -> Dict[str, Any]:
        """Poll mock job status with simulated delay"""
        await self._mock_video_generation(job_id)
        
        # Return mock completed job with sample video URL
        return {
            "job_id": job_id,
            "status": "completed",
            "video_url": "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            "duration": 5,
            "resolution": "1280x720",
            "mock": True
        }
    
    async def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Get mock job status (instant completion)"""
        return {
            "job_id": job_id,
            "status": "completed",
            "video_url": "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            "duration": 5,
            "resolution": "1280x720",
            "mock": True
        }


# Singleton instance
_mock_sora_service: Optional[MockSoraVideoService] = None


def get_mock_sora_service() -> MockSoraVideoService:
    """Get or create singleton MockSoraVideoService instance"""
    global _mock_sora_service
    if _mock_sora_service is None:
        _mock_sora_service = MockSoraVideoService()
    return _mock_sora_service
