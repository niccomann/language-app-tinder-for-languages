from typing import Optional

from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.database.connection import DatabaseConnection
from app.database.user_models import UserEntity

router = APIRouter(prefix="/api/users", tags=["users"])

_db = DatabaseConnection()


class UserCreate(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)
    display_name: str = Field(min_length=1, max_length=40)
    age: Optional[int] = Field(default=None, ge=5, le=120)
    target_language: str = Field(default="de", max_length=8)
    proficiency_level: str = Field(default="beginner", max_length=16)
    daily_goal_minutes: int = Field(default=10, ge=1, le=240)


class UserPatch(BaseModel):
    display_name: Optional[str] = Field(default=None, min_length=1, max_length=40)
    age: Optional[int] = Field(default=None, ge=5, le=120)
    target_language: Optional[str] = Field(default=None, max_length=8)
    proficiency_level: Optional[str] = Field(default=None, max_length=16)
    daily_goal_minutes: Optional[int] = Field(default=None, ge=1, le=240)
    onboarding_completed: Optional[bool] = None


class UserOut(BaseModel):
    user_id: str
    display_name: str
    age: Optional[int]
    target_language: str
    proficiency_level: str
    daily_goal_minutes: int
    onboarding_completed: bool


def _to_out(entity: UserEntity) -> UserOut:
    return UserOut(
        user_id=entity.user_id,
        display_name=entity.display_name,
        age=entity.age,
        target_language=entity.target_language,
        proficiency_level=entity.proficiency_level,
        daily_goal_minutes=entity.daily_goal_minutes,
        onboarding_completed=entity.onboarding_completed,
    )


@router.post("", response_model=UserOut)
def create_or_get_user(payload: UserCreate, response: Response):
    with Session(_db.engine) as session:
        existing = session.get(UserEntity, payload.user_id)
        if existing is not None:
            response.status_code = status.HTTP_200_OK
            return _to_out(existing)
        entity = UserEntity(**payload.model_dump())
        session.add(entity)
        session.commit()
        session.refresh(entity)
        response.status_code = status.HTTP_201_CREATED
        return _to_out(entity)


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: str):
    with Session(_db.engine) as session:
        entity = session.get(UserEntity, user_id)
        if entity is None:
            raise HTTPException(status_code=404, detail="User not found")
        return _to_out(entity)


@router.patch("/{user_id}", response_model=UserOut)
def patch_user(user_id: str, payload: UserPatch):
    with Session(_db.engine) as session:
        entity = session.get(UserEntity, user_id)
        if entity is None:
            raise HTTPException(status_code=404, detail="User not found")
        data = payload.model_dump(exclude_unset=True)
        for k, v in data.items():
            setattr(entity, k, v)
        session.add(entity)
        session.commit()
        session.refresh(entity)
        return _to_out(entity)
