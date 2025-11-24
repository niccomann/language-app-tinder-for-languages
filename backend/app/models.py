from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Flashcard(BaseModel):
    id: int
    word: str
    translation: str
    image_url: str
    language: str
    difficulty: Optional[str] = None
    category: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ProgressRequest(BaseModel):
    card_id: str
    known: bool


class ProgressResponse(BaseModel):
    cards_reviewed: int
    known_count: int
    unknown_count: int
