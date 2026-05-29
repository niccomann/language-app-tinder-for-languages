#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import replace
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.opensubtitles_importer import (  # noqa: E402
    OpenSubtitlesConfig,
    import_movie_batch,
    import_movie_batch_with_engine,
    load_movie_manifest,
)


DEFAULT_MANIFEST_PATH = ROOT / "app" / "data" / "movie_manifest_de.json"


def main() -> int:
    parser = argparse.ArgumentParser(description="Import subtitles from a versioned movie manifest.")
    parser.add_argument("--db", default=str(ROOT / "app.db"), help="SQLite DB path when --app-database is not used")
    parser.add_argument(
        "--app-database",
        action="store_true",
        help="Use the configured app database engine; required for Postgres-backed prod",
    )
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST_PATH), help="Movie manifest JSON path")
    parser.add_argument("--language", default="de", choices=["de", "en", "fr", "it"])
    parser.add_argument("--limit", type=int, default=None, help="Maximum number of manifest movies to import")
    parser.add_argument(
        "--delay",
        type=float,
        default=None,
        help="Delay between movie imports; defaults to OPENSUBTITLES_REQUEST_DELAY_SECONDS",
    )
    parser.add_argument("--min-word-count", type=int, default=None, help="Reject subtitles below this word count")
    parser.add_argument("--user-agent", default=None, help="Override OPENSUBTITLES_USER_AGENT")
    parser.add_argument("--fail-fast", action="store_true", help="Stop at the first failed movie")
    args = parser.parse_args()

    movies = load_movie_manifest(args.manifest)
    if args.limit is not None:
        movies = movies[: args.limit]

    config = OpenSubtitlesConfig.from_env()
    if args.min_word_count is not None:
        config = replace(config, min_word_count=args.min_word_count)
    if args.user_agent:
        config = replace(config, user_agent=args.user_agent)

    if args.app_database:
        from app.database.connection import DatabaseConnection  # noqa: WPS433

        report = import_movie_batch_with_engine(
            DatabaseConnection().engine,
            movies,
            language=args.language,
            delay_seconds=args.delay,
            continue_on_error=not args.fail_fast,
            config=config,
        )
        target_database = "app-config"
    else:
        report = import_movie_batch(
            args.db,
            movies,
            language=args.language,
            delay_seconds=args.delay,
            continue_on_error=not args.fail_fast,
            config=config,
        )
        target_database = args.db
    print(
        json.dumps(
            {
                "manifest": str(Path(args.manifest).resolve()),
                "database": target_database,
                "language": args.language,
                "requested": len(movies),
                "imported": [result.__dict__ for result in report.results],
                "failed": [failure.__dict__ for failure in report.failures],
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
