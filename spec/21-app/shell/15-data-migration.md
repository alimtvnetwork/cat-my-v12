# Data migration

Status: Draft (Plan 28)
Related: `app/core/io/migrate.py`, `app/core/io/migrations/`, `spec/14-update/`

## Ordering

Migrations run only during boot (see `03-boot-lifecycle.md`) or during an
update (see `08-updates-binding.md`), never lazily on first query.

Order: filename-sorted (`NNN_name.sql` or `NNN_name.py`). Each migration:

1. Runs in a transaction.
2. Records `applied_at`, `sha256`, `duration_ms` in the `schema_migrations` table.
3. Fails the whole boot on error; no partial application.

## Backup before migrate

Shell copies `audit.db` and `app.db` to `<data-dir>/backups/<ts>-pre-<version>/`
before running any migration. Retention: 30 days or last 5 versions,
whichever is greater.

## Rollback

- Failed migration → shell restores backup, marks update as `E_SHELL_UPDATE_FAILED`,
  reverts binary to prior staged copy.
- Successful boot then failed `/healthz` within 60 s → same rollback path.

## Compatibility rule

Migrations MUST be forward-only. Never edit a shipped migration file; add a
new one. Down-migration is not supported (rollback uses backup restore).

## Testing

- `tests/unit/test_migrate.py` runs every migration against a fresh DB in CI.
- Golden schema snapshots committed under `spec/23-app-db/` and diffed on PR.
