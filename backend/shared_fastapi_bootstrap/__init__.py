import logging
import os
from typing import Callable, Optional, Sequence

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

logger = logging.getLogger("shared_fastapi_bootstrap")


def create_app(
    title: str,
    version: str = "1.0.0",
    description: str = "",
    cors_origins: Sequence[str] = ("*",),
    lifespan: Optional[Callable] = None,
    static_dirs: Optional[dict[str, str]] = None,
    load_env: bool = True,
    include_root: bool = True,
    include_health: bool = True,
) -> FastAPI:
    if load_env:
        from dotenv import load_dotenv

        load_dotenv()

    app = FastAPI(
        title=title,
        description=description,
        version=version,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    if include_root:

        @app.get("/")
        async def root():
            return {"name": title, "version": version, "docs": "/docs"}

    if include_health:

        @app.get("/health")
        async def health_check():
            return {"status": "healthy"}

    if static_dirs:
        for mount_path, directory in static_dirs.items():
            if os.path.isdir(directory):
                app.mount(mount_path, StaticFiles(directory=directory), name=mount_path.strip("/"))
            else:
                logger.warning("Static directory not found, skipping mount: %s", directory)

    return app


def _parse_port(port_default: int) -> int:
    raw = os.getenv("PORT")
    if raw is None:
        return port_default
    try:
        port = int(raw)
    except ValueError:
        logger.warning("PORT='%s' is not a valid integer, using default %s", raw, port_default)
        return port_default
    if not 1 <= port <= 65535:
        logger.warning("PORT=%s out of range, using default %s", port, port_default)
        return port_default
    return port


def run(app_or_import: str | FastAPI, port: int = 8000, reload: bool = False, host: str = "0.0.0.0") -> None:
    import uvicorn

    parsed_port = _parse_port(port)
    debug_env = os.getenv("DEBUG", "").lower()
    should_reload = debug_env in ("true", "1", "yes", "on") or reload
    uvicorn.run(app_or_import, host=host, port=parsed_port, reload=should_reload)
