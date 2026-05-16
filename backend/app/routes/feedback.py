"""Tester feedback endpoints — persisted to AWS DynamoDB."""
from __future__ import annotations

import logging
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.services.feedback_service import save_feedback

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


Profession = Literal["artist", "humanist", "scientific", "technical", "student", "other"]
Gender = Literal["woman", "man", "other", "undisclosed"]
NativeLanguage = Literal["it", "en", "es", "de", "fr", "pt", "other"]
ProficiencyLevel = Literal["a1", "a2", "b1", "b2", "c1", "c2", "none"]


class FeedbackPayload(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    sentiment: Optional[Literal["like", "dislike", "neutral"]] = None
    source_url: Optional[str] = Field(default=None, max_length=2000)
    app_version: Optional[str] = Field(default=None, max_length=64)
    nickname: Optional[str] = Field(default=None, max_length=64)
    age: Optional[int] = Field(default=None, ge=5, le=120)
    profession: Optional[Profession] = None
    gender: Optional[Gender] = None
    native_language: Optional[NativeLanguage] = None
    target_level: Optional[ProficiencyLevel] = None
    learning_motivation: Optional[str] = Field(default=None, max_length=500)


class FeedbackResponse(BaseModel):
    id: str
    created_at: int


@router.post("", response_model=FeedbackResponse)
async def submit_feedback(payload: FeedbackPayload, request: Request) -> FeedbackResponse:
    user_agent = request.headers.get("user-agent")
    persona = {
        "nickname": payload.nickname,
        "age": payload.age,
        "profession": payload.profession,
        "gender": payload.gender,
        "native_language": payload.native_language,
        "target_level": payload.target_level,
        "learning_motivation": payload.learning_motivation,
    }
    persona = {k: v for k, v in persona.items() if v is not None}
    try:
        item = save_feedback(
            message=payload.message,
            sentiment=payload.sentiment,
            source_url=payload.source_url,
            user_agent=user_agent,
            app_version=payload.app_version,
            persona=persona or None,
        )
    except Exception as exc:  # noqa: BLE001 — surface AWS errors to caller
        log.exception("Failed to save feedback")
        raise HTTPException(status_code=502, detail=f"feedback storage failed: {exc}") from exc

    return FeedbackResponse(id=item["id"], created_at=item["created_at"])
