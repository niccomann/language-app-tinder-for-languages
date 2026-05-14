# Database map — where the data lives

> Last updated: 2026-05-14 18:10
> **The DB data is hard-won and must never be deleted.** Always `--skip-db` on deploys
> unless you have explicitly decided to overwrite, and always back up first.

## TL;DR

There are **four** distinct databases. As of 2026-05-14 the prod `app.db` was
made the **single canonical source** and pulled down to local — local and prod
`app.db` are now identical (8069 flashcards). The Postgres instance is empty
and unused.

| DB | Location | Engine | Role | State |
|---|---|---|---|---|
| **app.db (prod)** | EC2 `/home/ec2-user/language-deploy/current/backend/app.db`, bind-mounted into `language-backend` at `/app/app.db` | SQLite, 284 MB | What the live site reads/writes — **the canonical** | 8069 flashcards (de 2998 / fr 2515 / it 2556) |
| **app.db (local)** | `backend/app.db` | SQLite, 284 MB | Local dev backend — synced from prod 2026-05-14 | identical to prod (8069 flashcards) |
| **tracking.db** | local `backend/tracking.db` (56 KB) · prod volume `language-tracking-data:/app/data/tracking.db` (57 KB) | SQLite | Session/action analytics, separate from main DB | near-empty both sides, NOT synced (independent) |
| **tinder_languages_db** | local Docker container `tinder-languages-postgres`, `localhost:5433`, user `tinder_user`, db `tinder_languages_db` | Postgres | *Was* the producer source-of-truth | **effectively empty** — 5 sample rows, 0 flashcards. Unused. |

## How the backend picks a DB

`backend/app/core/config.py`:
- `USE_SQLITE=true` (default, and what prod runs) → hardcoded `sqlite:///./app.db`
  — a **relative path**, resolved against the process CWD: `backend/app.db` locally,
  `/app/app.db` in the container.
- `USE_SQLITE=false` → Postgres URL from `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_DATABASE`
  (`.env` points these at `localhost:5433` / `tinder_languages_db`).
- Tracking DB is independent: `TRACKING_DB_PATH` env (`./tracking.db` local,
  `/app/data/tracking.db` in the container, on the `language-tracking-data` volume).

So the backend **already supports Postgres** — switching is a config change
(`USE_SQLITE=false` + creds), not a code change. But the Postgres instance is
currently empty.

## The divergence — investigated and resolved (2026-05-14)

Before the sync, `app.db` local vs prod had diverged in both directions:
- **Overlap**: 3479 cards (the 2998-card German set had identical ids; 480 fr/it
  overlapping cards had different ids).
- **Prod-only**: 4590 fr/it cards (kaikki-expanded set local never had).
- **Local-only**: 344 fr/it cards (all enriched, only 98 with images).
- Local `users` were all E2E test garbage ("Nico" ×20, "E2E Tester", "smoke-…").

**Decision (project owner):** prod's `app.db` is the canonical; the 344 local-only
cards were dropped (likely an older curated set superseded by prod's kaikki run).
Prod was snapshotted via `sqlite3 .backup` (consistent), pulled down, and now is
`backend/app.db`. The pre-sync local DB is preserved at
`backend/app.db.before-prod-sync-20260514-175926` (still contains the 344 cards).

**Going forward:** to avoid re-divergence, do NOT let local and prod drift —
either re-pull prod after prod-side seeding, or pick the centralization model below.

## Backups

`backend/app.before-*.db`, `app.db.before-*`, `app.interrupted-*.db` — ~22 files,
100–300 MB each, ~2 GB total. Pre-operation snapshots. Excluded from the Docker
image via `backend/.dockerignore`. **Keep them** — they are the safety net.
Prod also snapshots `app.db.before-deploy-<timestamp>` before any DB swap.

## app.db schema (main tables)

`flashcards` (+ child tables FK to flashcard: `example_sentences`, `etymologies`,
`collocations`, `false_friends`, `proverbs`, `dialect_variants`, `audio_cache`),
`verb_conjugations`, `user_progress`, `user_word_statistics`, `learning_snapshots`,
`sentence_challenges`, `grammar_sentences` (+ `_nodes` / `_edges`), `users`.
(`tracking_*` tables exist in app.db too but the live tracking data goes to the
separate `tracking.db`.)

## Centralization — not done yet, needs a decision

The goal ("one DB, always interface with AWS") is sound but blocked on the
divergence above. Options, for the record:
1. **Postgres as single source** (RDS, or a `postgres` container on the EC2):
   migrate the chosen `app.db` into it, set `USE_SQLITE=false` on both local
   and prod. Backend already supports it. Cleanest "connect to one DB" model.
2. **Pick prod's `app.db` as canonical**, pull it to local, deploy *with* the DB
   from then on. Lower effort, still file-based (SQLite can't be a shared remote DB).

Either way, **step 0 is deciding how to reconcile the diverged rows** — that is
a data-ownership call for the project owner, not something to automate.
