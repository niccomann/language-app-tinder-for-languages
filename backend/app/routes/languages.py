"""Languages endpoint: list languages available in the app."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["languages"])


class LanguageInfo(BaseModel):
    code: str
    label: str
    flag: str


SUPPORTED_LANGUAGES = [
    LanguageInfo(code="de", label="Deutsch", flag="🇩🇪"),
    LanguageInfo(code="fr", label="Français", flag="🇫🇷"),
    LanguageInfo(code="it", label="Italiano", flag="🇮🇹"),
]


@router.get("/languages", response_model=list[LanguageInfo])
async def list_languages():
    return SUPPORTED_LANGUAGES
