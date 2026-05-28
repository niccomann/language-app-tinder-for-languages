from fastapi import HTTPException, Request

DEFAULT_USER_ID = "default_user"


async def attach_user_id_middleware(request: Request, call_next):
    """Stash X-User-Id (if present) on request.state for downstream handlers."""
    request.state.user_id = request.headers.get("X-User-Id")
    return await call_next(request)


def resolve_user_id(request: Request, explicit_user_id: str | None = None) -> str:
    """Resolve explicit legacy user_id, then X-User-Id, then local fallback."""
    if explicit_user_id:
        return explicit_user_id
    return getattr(request.state, "user_id", None) or DEFAULT_USER_ID


def require_user_id(request: Request) -> str:
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=400, detail="X-User-Id header required")
    return user_id
