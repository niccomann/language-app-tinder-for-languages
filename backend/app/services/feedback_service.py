"""Persistent tester feedback storage.

Production stores feedback in the application database. Local development uses
the same database path and can fall back to a local JSONL file if the database
is unavailable.
"""
from __future__ import annotations

import json
import logging
import os
import tempfile
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlmodel import Session, select

from app.database.connection import DatabaseConnection
from app.database.models import FeedbackEntity

log = logging.getLogger(__name__)

MAX_FEEDBACK_HISTORY_LIMIT = 100
PUBLIC_SENTIMENTS = {"like", "dislike", "neutral"}


def _env_name() -> str:
    return os.getenv("ENV", "dev").strip().lower()


def _truthy(value: str | None) -> bool:
    return value is not None and value.strip().lower() in {"1", "true", "yes", "on"}


def _requires_database() -> bool:
    explicit = os.getenv("FEEDBACK_REQUIRE_DATABASE")
    if explicit is not None:
        return _truthy(explicit)
    return _env_name() == "prod"


def _db_engine():
    return DatabaseConnection().engine


def _feedback_local_path() -> str:
    fallback_dir = os.getenv(
        "FEEDBACK_LOCAL_DIR",
        os.path.join(tempfile.gettempdir(), "language-app-feedback"),
    )
    return os.path.join(fallback_dir, "feedback.jsonl")


def save_feedback(
    *,
    message: str,
    sentiment: str | None = None,
    source_url: str | None = None,
    user_agent: str | None = None,
    app_version: str | None = None,
    persona: dict[str, Any] | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Persist a feedback row. Production requires the application database."""
    now = datetime.now(timezone.utc)
    item_id = str(uuid.uuid4())
    fallback_item = _feedback_item(
        item_id=item_id,
        created_at=now,
        message=message,
        sentiment=sentiment,
        source_url=source_url,
        user_agent=user_agent,
        app_version=app_version,
        persona=persona,
        extra=extra,
    )

    try:
        return _write_database_feedback(
            _feedback_entity(
                item_id=item_id,
                created_at=now,
                message=message,
                sentiment=sentiment,
                source_url=source_url,
                user_agent=user_agent,
                app_version=app_version,
                persona=persona,
                extra=extra,
            )
        )
    except Exception as exc:  # noqa: BLE001 - local dev can run with JSONL if DB is unavailable
        if _requires_database():
            raise RuntimeError(f"database feedback storage failed: {exc}") from exc
        log.warning("Database feedback write failed (%s); falling back to local jsonl", exc)

    return _write_local_feedback(fallback_item)


def list_feedback(*, limit: int = MAX_FEEDBACK_HISTORY_LIMIT) -> list[dict[str, Any]]:
    """Read public feedback history from database plus local dev fallback."""
    safe_limit = _clamp_history_limit(limit)
    items_by_id: dict[str, dict[str, Any]] = {}

    database_items = _read_database_feedback(limit=safe_limit)
    local_items = [] if _requires_database() else _read_local_feedback()
    for raw_item in (*database_items, *local_items):
        item = _normalize_feedback_item(raw_item)
        if item is None:
            continue
        items_by_id[item["id"]] = item

    return sorted(
        items_by_id.values(),
        key=lambda item: item["created_at"],
        reverse=True,
    )[:safe_limit]


def _feedback_entity(
    *,
    item_id: str,
    created_at: datetime,
    message: str,
    sentiment: str | None,
    source_url: str | None,
    user_agent: str | None,
    app_version: str | None,
    persona: dict[str, Any] | None,
    extra: dict[str, Any] | None,
) -> FeedbackEntity:
    return FeedbackEntity(
        external_id=item_id,
        created_at=created_at,
        updated_at=created_at,
        message=message,
        sentiment=sentiment,
        source_url=source_url,
        user_agent=user_agent,
        app_version=app_version,
        persona_data=_public_mapping(persona),
        extra_data=extra or None,
    )


def _feedback_item(
    *,
    item_id: str,
    created_at: datetime,
    message: str,
    sentiment: str | None,
    source_url: str | None,
    user_agent: str | None,
    app_version: str | None,
    persona: dict[str, Any] | None,
    extra: dict[str, Any] | None,
) -> dict[str, Any]:
    return _compact_mapping(
        {
            "id": item_id,
            "created_at": _datetime_to_epoch_ms(created_at),
            "created_at_iso": _datetime_to_iso(created_at),
            "message": message,
            "sentiment": sentiment,
            "source_url": source_url,
            "user_agent": user_agent,
            "app_version": app_version,
            "persona": _public_mapping(persona),
            "extra": extra or None,
        }
    )


def _write_database_feedback(entity: FeedbackEntity) -> dict[str, Any]:
    with Session(_db_engine()) as session:
        session.add(entity)
        session.commit()
        session.refresh(entity)
        item = _entity_to_feedback_item(entity)
    item["storage"] = "database"
    return item


def _write_local_feedback(item: dict[str, Any]) -> dict[str, Any]:
    fallback_dir = os.path.dirname(_feedback_local_path())
    os.makedirs(fallback_dir, exist_ok=True)
    fallback_path = _feedback_local_path()
    with open(fallback_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(item, ensure_ascii=False) + "\n")
    log.info("Feedback saved locally: %s", fallback_path)
    item["storage"] = "local"
    item["local_path"] = fallback_path
    return item


def _read_database_feedback(*, limit: int) -> list[dict[str, Any]]:
    try:
        with Session(_db_engine()) as session:
            entities = session.exec(
                select(FeedbackEntity)
                .order_by(FeedbackEntity.created_at.desc())
                .limit(limit)
            ).all()
    except Exception as exc:  # noqa: BLE001 - local dev can run with JSONL if DB is unavailable
        if _requires_database():
            raise RuntimeError(f"database feedback history failed: {exc}") from exc
        log.warning("Database feedback listing failed (%s)", exc)
        return []

    return [_entity_to_feedback_item(entity) for entity in entities]


def _entity_to_feedback_item(entity: FeedbackEntity) -> dict[str, Any]:
    return _compact_mapping(
        {
            "id": entity.external_id,
            "created_at": _datetime_to_epoch_ms(entity.created_at),
            "created_at_iso": _datetime_to_iso(entity.created_at),
            "message": entity.message,
            "sentiment": entity.sentiment,
            "source_url": entity.source_url,
            "app_version": entity.app_version,
            "persona": _public_mapping(entity.persona_data),
        }
    )


def _datetime_to_epoch_ms(value: datetime) -> int:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return int(value.timestamp() * 1000)


def _datetime_to_iso(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


def _read_local_feedback() -> list[dict[str, Any]]:
    path = _feedback_local_path()
    if not os.path.exists(path):
        return []

    records: list[dict[str, Any]] = []
    try:
        with open(path, encoding="utf-8") as f:
            for line_number, line in enumerate(f, start=1):
                stripped = line.strip()
                if not stripped:
                    continue
                try:
                    record = json.loads(stripped)
                except json.JSONDecodeError:
                    log.warning("Skipping malformed local feedback line %s", line_number)
                    continue
                if isinstance(record, dict):
                    records.append(record)
    except OSError as exc:
        log.warning("Local feedback read failed (%s)", exc)
    return records


def _normalize_feedback_item(raw_item: dict[str, Any]) -> dict[str, Any] | None:
    item_id = raw_item.get("id")
    message = raw_item.get("message")
    if not isinstance(item_id, str) or not item_id.strip():
        return None
    if not isinstance(message, str) or not message.strip():
        return None

    try:
        created_at = int(raw_item.get("created_at"))
    except (TypeError, ValueError):
        return None

    sentiment = raw_item.get("sentiment")
    return _compact_mapping(
        {
            "id": item_id,
            "created_at": created_at,
            "message": message,
            "created_at_iso": _string_value(raw_item.get("created_at_iso")),
            "sentiment": sentiment if sentiment in PUBLIC_SENTIMENTS else None,
            "source_url": _string_value(raw_item.get("source_url")),
            "app_version": _string_value(raw_item.get("app_version")),
            "persona": _public_mapping(raw_item.get("persona")),
        }
    )


def _clamp_history_limit(limit: int) -> int:
    return max(1, min(int(limit), MAX_FEEDBACK_HISTORY_LIMIT))


def _string_value(value: Any) -> str | None:
    return value if isinstance(value, str) and value else None


def _public_mapping(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    public = {
        str(key): field_value
        for key, field_value in value.items()
        if field_value is not None and field_value != ""
    }
    return public or None


def _compact_mapping(values: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in values.items()
        if value is not None and value != "" and value != {}
    }
