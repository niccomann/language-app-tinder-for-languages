"""
Gemini Image Generation Service
Uses Gemini 2.5 Flash Image (Nano Banana) or Gemini 3 Pro Image (Nano Banana Pro)
for generating lesson summary infographics.
"""

import os
import base64
import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


@dataclass
class LessonSummaryData:
    """Data structure for lesson summary to generate infographic"""
    words_learned: List[Dict[str, str]]  # [{word, translation, confidence}]
    sentences_built: List[str]
    total_swipes: int
    correct_swipes: int
    session_duration_minutes: int
    language: str = "de"
    user_id: str = "default_user"


@dataclass
class GeneratedInfographic:
    """Result of infographic generation"""
    image_base64: str
    prompt_used: str
    model: str
    metadata: Dict[str, Any]


class GeminiImageService:
    """Service for generating infographics using Gemini Image Generation"""
    
    # Available models for image generation
    MODEL_NANO_BANANA = "gemini-2.5-flash-image"  # Nano Banana - faster, 1024px
    MODEL_NANO_BANANA_PRO = "gemini-3-pro-image-preview"  # Nano Banana Pro - 4K, thinking
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Gemini Image service
        
        Args:
            api_key: Gemini API key (defaults to GEMINI_API_KEY env var)
        """
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        self._client = None
        logger.info("✅ GeminiImageService initialized")
    
    @property
    def client(self):
        """Lazy initialization of Gemini client"""
        if self._client is None:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
                logger.info("✅ Gemini client initialized successfully")
            except ImportError:
                logger.error("google-genai package not installed. Run: pip install google-genai")
                raise ImportError("google-genai package required. Install with: pip install google-genai")
        return self._client
    
    # Global style instructions for all infographics
    STYLE_INSTRUCTIONS = """
MANDATORY STYLE - SCHOOLTEACHER HANDWRITTEN:
- Everything must look HANDWRITTEN with pen/marker on paper or whiteboard
- Use a teacher's handwriting style - clear but personal, like a school blackboard
- Warm, educational aesthetic like a classroom poster made by a caring teacher
- Paper texture background (cream/off-white, like notebook paper or kraft paper)
- Hand-drawn decorative elements: underlines, arrows, stars, checkmarks
- Colors: chalk-like pastels, marker colors (red, blue, green, orange)
- Doodles and sketches around the content (small drawings related to words)
- NO digital/modern fonts - everything handwritten style
- Feel like it was made with love by a language teacher for their student
"""

    def _build_infographic_prompt(self, data: LessonSummaryData) -> str:
        """
        Build a prompt for generating a lesson summary infographic
        
        Args:
            data: Lesson summary data
            
        Returns:
            Optimized prompt for infographic generation
        """
        words_text = ", ".join([f"{w['word']} ({w['translation']})" for w in data.words_learned[:5]])
        accuracy = (data.correct_swipes / data.total_swipes * 100) if data.total_swipes > 0 else 0
        
        prompt = f"""{self.STYLE_INSTRUCTIONS}

Create a lesson summary infographic for a German language learning session.

CONTENT TO DISPLAY:
- Title: "Lezione completata!" or "Bravo!" written big at top with underline
- Words Learned: {len(data.words_learned)} words (draw small icons next to each)
- Featured Words: {words_text} (in speech bubbles or boxed)
- Sentences Built: {len(data.sentences_built)} sentences
- Accuracy: {accuracy:.0f}% (as a hand-drawn progress bar or pie chart)
- Time Spent: {data.session_duration_minutes} minutes (with clock doodle)
- Total Practice: {data.total_swipes} flashcards reviewed

LAYOUT:
- Vertical format (9:16) like a page from a teacher's notebook
- Hand-drawn borders and dividers
- Small celebratory doodles (stars, hearts, smiley faces)
- A motivational message at bottom: "Continua così!" or "Weiter so!"
- Teacher's signature or stamp-like element in corner

The overall feeling should be warm, encouraging, and personal - like a note 
from a favorite teacher congratulating a student on their progress.
"""
        return prompt
    
    async def generate_lesson_infographic(
        self,
        data: LessonSummaryData,
        use_pro_model: bool = True
    ) -> GeneratedInfographic:
        """
        Generate an infographic summarizing a lesson
        
        Args:
            data: Lesson summary data
            use_pro_model: Ignored - uses gemini-2.5-flash-image
            
        Returns:
            GeneratedInfographic with base64 image and metadata
        """
        from google.genai import types
        
        model = self.MODEL_NANO_BANANA_PRO if use_pro_model else self.MODEL_NANO_BANANA
        prompt = self._build_infographic_prompt(data)
        
        logger.info(f"Generating infographic with model: {model}")
        logger.debug(f"Prompt: {prompt[:200]}...")
        
        try:
            response = self.client.models.generate_content(
                model=model,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_modalities=['Image', 'Text'],
                )
            )
            
            image_base64 = None
            response_text = None
            
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'text') and part.text:
                    response_text = part.text
                    logger.info(f"Model response text: {response_text[:100]}...")
                elif hasattr(part, 'inline_data') and part.inline_data:
                    image_data = part.inline_data.data
                    if isinstance(image_data, bytes):
                        image_base64 = base64.b64encode(image_data).decode('utf-8')
                    else:
                        image_base64 = image_data
                    logger.info("✅ Image generated successfully")
            
            if not image_base64:
                raise ValueError("No image was generated in the response")
            
            return GeneratedInfographic(
                image_base64=image_base64,
                prompt_used=prompt,
                model=model,
                metadata={
                    "words_count": len(data.words_learned),
                    "sentences_count": len(data.sentences_built),
                    "accuracy": (data.correct_swipes / data.total_swipes * 100) if data.total_swipes > 0 else 0,
                    "response_text": response_text
                }
            )
            
        except Exception as error:
            logger.error(f"Error generating infographic: {error}")
            raise
    
    async def generate_custom_image(
        self,
        prompt: str,
        aspect_ratio: str = "1:1",
        use_pro_model: bool = False
    ) -> GeneratedInfographic:
        """
        Generate a custom image from a prompt
        
        Args:
            prompt: Text prompt for image generation
            aspect_ratio: Aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4)
            use_pro_model: Ignored - uses gemini-2.5-flash-image
            
        Returns:
            GeneratedInfographic with base64 image
        """
        from google.genai import types
        
        model = self.MODEL_NANO_BANANA_PRO if use_pro_model else self.MODEL_NANO_BANANA
        
        logger.info(f"Generating custom image with model: {model}, aspect_ratio: {aspect_ratio}")
        
        try:
            response = self.client.models.generate_content(
                model=model,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_modalities=['Image'],
                )
            )
            
            image_base64 = None
            
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'inline_data') and part.inline_data:
                    image_data = part.inline_data.data
                    if isinstance(image_data, bytes):
                        image_base64 = base64.b64encode(image_data).decode('utf-8')
                    else:
                        image_base64 = image_data
                    break
            
            if not image_base64:
                raise ValueError("No image was generated in the response")
            
            return GeneratedInfographic(
                image_base64=image_base64,
                prompt_used=prompt,
                model=model,
                metadata={"aspect_ratio": aspect_ratio}
            )
            
        except Exception as error:
            logger.error(f"Error generating custom image: {error}")
            raise


# Singleton instance
_gemini_image_service: Optional[GeminiImageService] = None


def get_gemini_image_service() -> GeminiImageService:
    """Get or create singleton GeminiImageService instance"""
    global _gemini_image_service
    if _gemini_image_service is None:
        _gemini_image_service = GeminiImageService()
    return _gemini_image_service
