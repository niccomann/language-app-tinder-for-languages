# Database map — where the data lives

> Last updated: 2026-05-14 19:00
> **The DB data is hard-won and must never be deleted.** Always back up before
> any DB operation. The daily Postgres backup cron + `scripts/backup_pg.sh` are
> the safety net — use them.

## TL;DR

As of 2026-05-14 the main database is a **single centralized Postgres** running
as the `language-postgres` container on the EC2. Both prod and local connect to
it — prod directly over the Docker network, local through an SSH tunnel. The old
per-environment SQLite `app.db` files are now frozen backups, not live.

| DB | Location | Engine | Role | State |
|---|---|---|---|---|
| **tinder_languages** (the live DB) | `language-postgres` container on the EC2, Docker network `language-app`, also bound to the EC2 host loopback `127.0.0.1:5432`. Volume `language-pgdata`. | Postgres 16 | **The single source of truth.** Prod + local both use it. | 8069 flashcards (de 2998 / fr 2515 / it 2556), 11760 verb_conjugations, ~30k rows / 17 tables |
| **app.db (frozen)** | prod EC2 `/home/ec2-user/language-deploy/current/backend/app.db` (still bind-mounted but unused); local `backend/app.db` | SQLite | Pre-migration snapshot — instant rollback if Postgres has trouble | 8069 flashcards, identical to what was migrated |
| **tracking.db** | local `backend/tracking.db` · prod volume `language-tracking-data:/app/data/tracking.db` | SQLite | Session/action analytics — **independent, NOT migrated**, stays SQLite | near-empty both sides |
| **tinder_languages_db** | local Docker container `tinder-languages-postgres`, `localhost:5433` | Postgres | *Was* the producer source-of-truth — now unused | empty (5 sample rows) |

## How the backend connects

`backend/app/core/config.py`: `USE_SQLITE=false` → Postgres URL from
`DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_DATABASE`. `USE_SQLITE=true` → SQLite
`sqlite:///./app.db` (the frozen file — offline fallback only).

- **Prod** (`language-backend` container): `USE_SQLITE=false`, `DB_HOST=language-postgres`,
  `DB_PORT=5432` — resolves over the `language-app` Docker network.
- **Local** (`backend/.env`): `USE_SQLITE=false`, `DB_HOST=localhost`, `DB_PORT=5434`
  — points at the SSH tunnel. **Run `scripts/pg_tunnel.sh` first**, then start the
  backend. Without the tunnel the backend can't reach the DB; for offline local
  dev set `USE_SQLITE=true` instead.
- **Tracking DB** stays independent: `TRACKING_DB_PATH` env, SQLite, not in Postgres.

## Local dev workflow

```bash
# terminal 1 — keep open while developing:
scripts/pg_tunnel.sh            # opens SSH tunnel localhost:5434 -> EC2 Postgres
# terminal 2:
cd backend && source .venv/bin/activate && python3 -m app.main
```

The tunnel opens the SSH security-group rule for your IP while running and
revokes it on Ctrl-C. Postgres is bound to the EC2 host loopback only — it is
NOT exposed to the public internet; the tunnel is the only way in from local.

## Backups

- **Daily cron on the EC2** (`03:30`, `/home/ec2-user/pg-backup.sh`): `pg_dump`
  gzipped into `/home/ec2-user/pg-backups/`, 7-day rotation. Protects against
  corruption / bad ops. Does NOT survive full EC2 loss.
- **`scripts/backup_pg.sh`** (run locally, on demand): triggers a fresh dump on
  the EC2 and pulls it down to `./backups/` (gitignored). This is the real
  off-box copy — run it before risky operations and periodically.
- **Frozen SQLite `app.db`** files (prod + local) are the pre-migration snapshot.
- True off-site auto-backup (pg_dump → S3) needs an IAM instance role on the EC2
  — not set up; the EC2 currently has no IAM role (also why feedback falls back
  to a local jsonl instead of S3).

## Schema (17 main tables in Postgres)

`flashcards` (+ child tables FK to flashcard: `example_sentences`, `etymologies`,
`collocations`, `false_friends`, `proverbs`, `dialect_variants`, `audio_cache`),
`verb_conjugations`, `user_progress`, `user_word_statistics`, `learning_snapshots`,
`sentence_challenges`, `grammar_sentences` (+ `_nodes` / `_edges`), `users`.
`tracking_*` tables are NOT in Postgres — tracking lives in the separate SQLite.

Note: `verb_conjugations` has no SQLModel model (created via raw SQL by the
producer) — it was migrated with an explicit DDL, not by `SQLModel.create_all`.

## Migration history (2026-05-14)

1. prod & local SQLite `app.db` had diverged; prod chosen as canonical, local
   synced from a consistent `sqlite3 .backup` snapshot. 344 local-only fr/it
   cards dropped per owner decision (preserved in
   `backend/app.db.before-prod-sync-20260514-175926`).
2. `language-postgres` container started on the EC2 (volume `language-pgdata`).
3. `app.db` → Postgres: 16 SQLModel tables via `create_all` + copy, plus
   `verb_conjugations` (11760 rows) via explicit DDL. All row counts verified.
4. `language-backend` recreated with `USE_SQLITE=false` → Postgres. Old SQLite
   container kept as `language-backend-sqlite-rollback` for instant rollback.
5. 37/37 E2E tests pass against the Postgres-backed prod.

## Gotchas

- **Restarting `language-backend` or `language-postgres` changes the container's
  Docker-network IP** → `language-frontend` (nginx) caches the old IP and starts
  returning 502. Fix: `docker restart language-frontend` after any backend/db
  container restart. (Proper fix would be an nginx `resolver` directive.)
- The `language-backend-sqlite-rollback` container is a stopped fallback. To roll
  back: `docker rm -f language-backend && docker rename
  language-backend-sqlite-rollback language-backend && docker start
  language-backend` then `docker restart language-frontend`. Remove the rollback
  container once confident.
