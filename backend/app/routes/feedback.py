"""Tester feedback endpoints — persisted to AWS DynamoDB."""
from __future__ import annotations

import logging
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.services.feedback_service import save_feedback

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


class FeedbackPayload(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    sentiment: Optional[Literal["like", "dislike", "neutral"]] = None
    source_url: Optional[str] = Field(default=None, max_length=2000)
    app_version: Optional[str] = Field(default=None, max_length=64)


class FeedbackResponse(BaseModel):
    id: str
    created_at: int


@router.post("", response_model=FeedbackResponse)
async def submit_feedback(payload: FeedbackPayload, request: Request) -> FeedbackResponse:
    user_agent = request.headers.get("user-agent")
    try:
        item = save_feedback(
            message=payload.message,
            sentiment=payload.sentiment,
            source_url=payload.source_url,
            user_agent=user_agent,
            app_version=payload.app_version,
        )
    except Exception as exc:  # noqa: BLE001 — surface AWS errors to caller
        log.exception("Failed to save feedback")
        raise HTTPException(status_code=502, detail=f"feedback storage failed: {exc}") from exc

    return FeedbackResponse(id=item["id"], created_at=item["created_at"])
