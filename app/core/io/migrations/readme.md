# Migrations

Forward-only, additive SQL migrations for the three SQLite databases.

Anchors: `spec/21-app/26-migrations.md` (runner contract), `spec/21-app/21-root-db.md`, `spec/21-app/22-task-db.md`, `spec/21-app/23-rules-db-overrides.md`.

## Layout

```
migrations/
  root/   NNN_*.sql   → applied to backend/db/root.db
  task/   NNN_*.sql   → applied to every backend/db/tasks/<TaskId>/task.db
  rules/  NNN_*.sql   → applied to every backend/db/tasks/<TaskId>/rules.db
```

## Invariants (per 26 §1)

- File names: `NNN_<slug>.sql`, zero-padded 3 digits, strictly increasing, no gaps.
- One file = one atomic transaction (runner wraps `BEGIN`/`COMMIT`).
- Every migration ends with `INSERT INTO SchemaVersion(version, appliedAt) VALUES (N, <now>);`.
- Idempotent: `IF NOT EXISTS` on all `CREATE TABLE` / `CREATE INDEX`.
- Additive-only in v1 — no `DROP`, no `RENAME`, no `ALTER … DROP COLUMN`.

## Failure Modes (26 §5)

`E_MIGRATION_GAP`, `E_MIGRATION_FAILED`, `E_SCHEMA_AHEAD`, `E_MIGRATION_TIMEOUT` — all cause Supervisor to refuse boot.

## Milestone Scope

- **M1 (this milestone):** `root/000_init.sql` only.
- **M2:** `task/000_init.sql` lands with capture pipeline.
- **M3:** `rules/000_init.sql` lands with dispatcher/worker snapshot.

Runner implementation (`app/core/io/migrate.py`) is scaffolded in M1 and reused unchanged by M2/M3.
