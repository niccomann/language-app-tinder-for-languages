# Database Backup

The active local SQLite database is `backend/app.db`.

Use SQLite's online backup command instead of copying the file directly, because `backend/app.db-wal` can contain committed rows that are not checkpointed into the main file yet.

```bash
sqlite3 backend/app.db ".backup 'backups/db/app-2998-sqlite-backup-$(date +%Y%m%d-%H%M%S).db'"
sqlite3 backups/db/<backup-file>.db "PRAGMA integrity_check; SELECT COUNT(*) FROM flashcards;"
```

The May 9, 2026 backup with 2998 flashcards was uploaded to:

```text
s3://tinder-languages-db-backups-664111151564-eu-central-1/sqlite/app-2998-20260509-201308.db
```

The uploaded object has server-side encryption enabled and metadata:

```text
flashcards=2998
sha256=d1c2db187f58f41389bc2faf66dab64051b568b47a52ed68bd0e4a8acbd93b34
source=backend-app-db-sqlite-backup
```

Restore to a separate file first:

```bash
aws s3 cp s3://tinder-languages-db-backups-664111151564-eu-central-1/sqlite/app-2998-20260509-201308.db /tmp/app-restore.db
sqlite3 /tmp/app-restore.db "PRAGMA integrity_check; SELECT COUNT(*) FROM flashcards;"
```
