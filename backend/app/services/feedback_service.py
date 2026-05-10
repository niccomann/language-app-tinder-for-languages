"""Persistent feedback storage on AWS S3.

Each feedback is stored as a single JSON object under
  s3://$FEEDBACK_BUCKET/feedback/YYYY/MM/DD/<uuid>.json

S3 is used (instead of DynamoDB) because the credentials available to the
backend have s3:PutObject but not dynamodb:CreateTable. AWS credentials
come from the standard chain (env vars, ~/.aws/credentials, instance role).
"""
from __future__ import annotations

import json
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any

import boto3

log = logging.getLogger(__name__)

FEEDBACK_BUCKET = os.getenv(
    "FEEDBACK_BUCKET",
    "tinder-languages-db-backups-664111151564-eu-central-1",
)
FEEDBACK_PREFIX = os.getenv("FEEDBACK_PREFIX", "feedback")
AWS_REGION = os.getenv("AWS_REGION", os.getenv("AWS_DEFAULT_REGION", "eu-central-1"))


def _s3_client():
    return boto3.client("s3", region_name=AWS_REGION)


def save_feedback(
    *,
    message: str,
    sentiment: str | None = None,
    source_url: str | None = None,
    user_agent: str | None = None,
    app_version: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Persist a feedback row to S3 as a JSON object. Returns the saved item."""
    now = datetime.now(timezone.utc)
    item_id = str(uuid.uuid4())
    item: dict[str, Any] = {
        "id": item_id,
        "created_at": int(time.time() * 1000),
        "created_at_iso": now.isoformat(),
        "message": message,
    }
    if sentiment:
        item["sentiment"] = sentiment
    if source_url:
        item["source_url"] = source_url
    if user_agent:
        item["user_agent"] = user_agent
    if app_version:
        item["app_version"] = app_version
    if extra:
        item["extra"] = extra

    key = f"{FEEDBACK_PREFIX}/{now:%Y/%m/%d}/{item_id}.json"
    body = json.dumps(item, ensure_ascii=False).encode("utf-8")

    _s3_client().put_object(
        Bucket=FEEDBACK_BUCKET,
        Key=key,
        Body=body,
        ContentType="application/json; charset=utf-8",
    )
    log.info("Feedback saved: s3://%s/%s", FEEDBACK_BUCKET, key)
    item["s3_uri"] = f"s3://{FEEDBACK_BUCKET}/{key}"
    return item
