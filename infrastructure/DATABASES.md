# Database map — where the data lives

> Last updated: 2026-05-14 18:05
> **The DB data is hard-won and must never be deleted.** Always `--skip-db` on deploys
> unless you have explicitly decided to overwrite, and always back up first.

## TL;DR

There are **four** distinct databases. They are NOT in sync. The real
vocabulary data lives in the **two SQLite `app.db` files** (local + prod),
and they have **diverged in both directions**.

| DB | Location | Engine | Role | State |
|---|---|---|---|---|
| **app.db (prod)** | EC2 `/home/ec2-user/language-deploy/current/backend/app.db`, bind-mounted into `language-backend` at `/app/app.db` | SQLite, 284 MB | What the live site reads/writes | **8069 flashcards** — most complete card set |
| **app.db (local)** | `backend/app.db` | SQLite, 122 MB | Local dev backend reads/writes | 3823 flashcards, but more example_sentences/etymologies |
| **tracking.db** | local `backend/tracking.db` (56 KB) · prod volume `language-tracking-data:/app/data/tracking.db` (57 KB) | SQLite | Session/action analytics, separate from main DB | near-empty both sides |
| **tinder_languages_db** | local Docker container `tinder-languages-postgres`, `localhost:5433`, user `tinder_user`, db `tinder_languages_db` | Postgres | *Was* the producer source-of-truth | **effectively empty** — 5 sample rows, 0 flashcards |

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

## The divergence problem (as of 2026-05-14)

`app.db` local vs prod — neither is a superset:

| Table | local | prod |
|---|---|---|
| flashcards | 3823 (de 2998 / fr 403 / it 422) | **8069** |
| example_sentences | 3825 | 3400 |
| etymologies | 3823 | 3398 |
| collocations | 3822 | 3397 |
| verb_conjugations | 11760 | 11760 |
| users | 24 (mostly E2E test users) | 3 |
| user_progress | 43 | 61 |
| user_word_statistics | 65 | 85 |

Cause: deploys have used `--skip-db` (correctly — to avoid clobbering prod),
so the two files drifted independently. Prod grew the kaikki-expanded card set;
local kept richer enrichment tables. **Merging requires a human decision** about
which seeding runs are authoritative — do not auto-merge.

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
