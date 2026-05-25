from datetime import UTC, datetime
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import SessionDependency
from app.database.models import UserMissionProgressEntity, UserWordStatisticsEntity
from app.services.adaptive_learning import build_learning_summary
from app.services.path_missions import (
    CEFR_PATH_PHASES,
    TOTAL_PATH_LEVELS,
    PathMissionDefinition,
    build_path_mission_definitions,
)


router = APIRouter(prefix="/api/missions", tags=["missions"])

MissionStatus = Literal["locked", "available", "completed"]
PhaseStatus = Literal["locked", "active", "completed"]


class CefrPathPhaseResponse(BaseModel):
    code: str
    start_level: int
    end_level: int
    label: str
    completed_count: int
    total_count: int
    status: PhaseStatus


class PathMissionResponse(BaseModel):
    mission_id: str
    level: int
    title: str
    detail: str
    objective: str
    action: str
    route: str
    cefr_phase: str
    phase_label: str
    phase_start_level: int
    phase_end_level: int
    status: MissionStatus
    completed_at: Optional[datetime]
    progress_value: int
    target_value: int
    is_checkpoint: bool


class PathMissionsResponse(BaseModel):
    total_levels: int
    completed_count: int
    current_level: int
    current_mission_id: Optional[str]
    phases: list[CefrPathPhaseResponse]
    missions: list[PathMissionResponse]


def _resolve_user_id(request: Request, fallback_user_id: str) -> str:
    return getattr(request.state, "user_id", None) or fallback_user_id


def _mission_rows(
    session: Session,
    *,
    user_id: str,
    language: str,
) -> list[UserMissionProgressEntity]:
    return list(
        session.exec(
            select(UserMissionProgressEntity).where(
                UserMissionProgressEntity.user_id == user_id,
                UserMissionProgressEntity.language == language,
            )
        ).all()
    )


def _row_by_level(
    rows: list[UserMissionProgressEntity],
) -> dict[int, UserMissionProgressEntity]:
    result: dict[int, UserMissionProgressEntity] = {}
    for row in rows:
        result.setdefault(row.level, row)
    return result


def _upsert_mission_row(
    session: Session,
    *,
    user_id: str,
    language: str,
    mission: PathMissionDefinition,
    status: MissionStatus,
    completed_at: Optional[datetime] = None,
) -> UserMissionProgressEntity:
    row = session.exec(
        select(UserMissionProgressEntity).where(
            UserMissionProgressEntity.user_id == user_id,
            UserMissionProgressEntity.language == language,
            UserMissionProgressEntity.level == mission.level,
        )
    ).first()

    if row is None:
        row = UserMissionProgressEntity(
            user_id=user_id,
            language=language,
            mission_id=mission.mission_id,
            level=mission.level,
            target_value=mission.target_value,
        )
        session.add(row)

    row.mission_id = mission.mission_id
    row.status = status
    row.target_value = mission.target_value
    row.completed_at = completed_at if status == "completed" else row.completed_at
    row.progress_value = mission.target_value if status == "completed" else min(row.progress_value, mission.target_value - 1)
    return row


def _bootstrap_completed_count(
    session: Session,
    *,
    user_id: str,
    language: str,
) -> int:
    stats = list(
        session.exec(
            select(UserWordStatisticsEntity).where(
                UserWordStatisticsEntity.user_id == user_id,
                UserWordStatisticsEntity.language == language,
            )
        ).all()
    )
    summary = build_learning_summary(stats)
    return max(0, min(TOTAL_PATH_LEVELS - 1, int(summary["path_level"]) - 1))


def _ensure_registered_path_state(
    session: Session,
    *,
    user_id: str,
    language: str,
    definitions: list[PathMissionDefinition],
) -> list[UserMissionProgressEntity]:
    rows = _mission_rows(session, user_id=user_id, language=language)
    now = datetime.now(UTC)

    if not rows:
        completed_count = _bootstrap_completed_count(session, user_id=user_id, language=language)
        for mission in definitions[:completed_count]:
            _upsert_mission_row(
                session,
                user_id=user_id,
                language=language,
                mission=mission,
                status="completed",
                completed_at=now,
            )
        if completed_count < TOTAL_PATH_LEVELS:
            _upsert_mission_row(
                session,
                user_id=user_id,
                language=language,
                mission=definitions[completed_count],
                status="available",
            )
        session.flush()
        return _mission_rows(session, user_id=user_id, language=language)

    completed_levels = {
        row.level
        for row in rows
        if row.status == "completed"
    }
    if len(completed_levels) < TOTAL_PATH_LEVELS:
        next_level = next(
            mission.level
            for mission in definitions
            if mission.level not in completed_levels
        )
        current = definitions[next_level - 1]
        _upsert_mission_row(
            session,
            user_id=user_id,
            language=language,
            mission=current,
            status="available",
        )
        session.flush()
        return _mission_rows(session, user_id=user_id, language=language)

    return rows


def _phase_status(
    *,
    completed_count: int,
    current_level: int,
    start_level: int,
    end_level: int,
) -> PhaseStatus:
    if completed_count >= end_level:
        return "completed"
    if start_level <= current_level <= end_level:
        return "active"
    return "locked"


def _build_path_response(
    *,
    definitions: list[PathMissionDefinition],
    rows: list[UserMissionProgressEntity],
) -> PathMissionsResponse:
    rows_by_level = _row_by_level(rows)
    completed_levels = {
        row.level
        for row in rows
        if row.status == "completed"
    }
    completed_count = len(completed_levels)
    all_completed = completed_count >= TOTAL_PATH_LEVELS
    current_level = TOTAL_PATH_LEVELS if all_completed else next(
        mission.level
        for mission in definitions
        if mission.level not in completed_levels
    )
    current_mission_id = None if all_completed else definitions[current_level - 1].mission_id

    missions: list[PathMissionResponse] = []
    for mission in definitions:
        row = rows_by_level.get(mission.level)
        if mission.level in completed_levels:
            status: MissionStatus = "completed"
        elif not all_completed and mission.level == current_level:
            status = "available"
        else:
            status = "locked"

        missions.append(
            PathMissionResponse(
                mission_id=mission.mission_id,
                level=mission.level,
                title=mission.title,
                detail=mission.detail,
                objective=mission.objective,
                action=mission.action,
                route=mission.route,
                cefr_phase=mission.cefr_phase,
                phase_label=mission.phase_label,
                phase_start_level=mission.phase_start_level,
                phase_end_level=mission.phase_end_level,
                status=status,
                completed_at=row.completed_at if row and status == "completed" else None,
                progress_value=mission.target_value if status == "completed" else (row.progress_value if row else 0),
                target_value=mission.target_value,
                is_checkpoint=mission.is_checkpoint,
            )
        )

    phases = [
        CefrPathPhaseResponse(
            code=phase.code,
            start_level=phase.start_level,
            end_level=phase.end_level,
            label=phase.label,
            completed_count=len([
                level
                for level in completed_levels
                if phase.start_level <= level <= phase.end_level
            ]),
            total_count=phase.end_level - phase.start_level + 1,
            status=_phase_status(
                completed_count=completed_count,
                current_level=current_level,
                start_level=phase.start_level,
                end_level=phase.end_level,
            ),
        )
        for phase in CEFR_PATH_PHASES
    ]

    return PathMissionsResponse(
        total_levels=TOTAL_PATH_LEVELS,
        completed_count=completed_count,
        current_level=current_level,
        current_mission_id=current_mission_id,
        phases=phases,
        missions=missions,
    )


@router.get("/path", response_model=PathMissionsResponse)
async def get_path_missions(
    session: SessionDependency,
    request: Request,
    language: str = Query("de", description="Language code"),
    user_id: str = Query("default_user", description="User ID fallback"),
) -> PathMissionsResponse:
    resolved_user_id = _resolve_user_id(request, user_id)
    definitions = build_path_mission_definitions(language)
    rows = _ensure_registered_path_state(
        session,
        user_id=resolved_user_id,
        language=language,
        definitions=definitions,
    )
    return _build_path_response(definitions=definitions, rows=rows)


@router.post("/path/{mission_id}/complete", response_model=PathMissionsResponse)
async def complete_path_mission(
    session: SessionDependency,
    request: Request,
    mission_id: str,
    language: str = Query("de", description="Language code"),
    user_id: str = Query("default_user", description="User ID fallback"),
) -> PathMissionsResponse:
    resolved_user_id = _resolve_user_id(request, user_id)
    definitions = build_path_mission_definitions(language)
    mission_by_id = {mission.mission_id: mission for mission in definitions}
    target = mission_by_id.get(mission_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Mission not found")

    rows = _ensure_registered_path_state(
        session,
        user_id=resolved_user_id,
        language=language,
        definitions=definitions,
    )
    response = _build_path_response(definitions=definitions, rows=rows)

    if mission_id != response.current_mission_id:
        if any(mission.mission_id == mission_id and mission.status == "completed" for mission in response.missions):
            return response
        raise HTTPException(status_code=409, detail="Complete the current mission first")

    now = datetime.now(UTC)
    _upsert_mission_row(
        session,
        user_id=resolved_user_id,
        language=language,
        mission=target,
        status="completed",
        completed_at=now,
    )
    if target.level < TOTAL_PATH_LEVELS:
        _upsert_mission_row(
            session,
            user_id=resolved_user_id,
            language=language,
            mission=definitions[target.level],
            status="available",
        )
    session.flush()

    rows = _mission_rows(session, user_id=resolved_user_id, language=language)
    return _build_path_response(definitions=definitions, rows=rows)

