# 23 — Migrations

**Status:** Locked (Plan 04 Step 23). Governs schema evolution for all three DB files (`root.db`, per-Task `task.db`, per-Task `rules.db`).

Anchors: 21 (`root.db:SchemaVersion`), 22 (`task.db:SchemaVersion`), 20 (`rules.db:SchemaVersion`), 12 (`core/io` is the only SQLite caller).

## 1. Rules

1. **Forward-only.** No down-migrations. Recovery from a bad migration is restore-from-backup, not roll-back.
2. **Additive-only in v1.** Allowed: `CREATE TABLE`, `CREATE INDEX`, `ALTER TABLE ADD COLUMN` (with default), new `CHECK` constraints on new columns. Forbidden: `DROP TABLE`, `DROP COLUMN`, `RENAME COLUMN`, altering an existing `CHECK`.
3. **One migration file = one atomic transaction.** `BEGIN` → statements → `COMMIT`. Any error → `ROLLBACK` → Supervisor refuses to start.
4. **Idempotent-safe.** Use `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` so a re-run against an at-version DB is a no-op.
5. **Deterministic order.** File names are `NNN_<slug>.sql`, sorted lexically. `NNN` is a strictly increasing integer (zero-padded to 3). No gaps allowed except the initial `000`.
6. **Per-DB namespace.** Migrations for each DB file live in their own directory. A migration never touches more than one DB file.

## 2. Layout

```
app/core/io/migrations/
  root/
    000_init.sql
    001_...sql
  task/
    000_init.sql
    001_...sql
  rules/
    000_init.sql
    001_...sql
```

## 3. `SchemaVersion` Table (locked shape, all three DBs)

```sql
CREATE TABLE IF NOT EXISTS SchemaVersion (
  version    INTEGER PRIMARY KEY,
  appliedAt  TEXT NOT NULL
);
```

- Highest `version` row = current version of that DB file.
- The `000_init.sql` migration inserts `(0, <now>)` as its last statement.
- Every subsequent migration `NNN_*.sql` ends with `INSERT INTO SchemaVersion(version, appliedAt) VALUES (N, <now>);`.

## 4. Runner Contract (`core/io.migrate`)

Called by Supervisor at boot (per 11 §Runtime, 20 §5).

```
def migrate(dbPath, migrationsDir):
    open dbPath in WAL mode
    ensure SchemaVersion exists (bootstrap only if empty)
    current = SELECT max(version) FROM SchemaVersion   # -1 if empty
    files = sort(listdir(migrationsDir))               # NNN_*.sql
    for f in files:
        n = int(f.split('_')[0])
        if n <= current:
            continue
        if n != current + 1:
            raise E_MIGRATION_GAP(expected=current+1, found=n)
        BEGIN
          exec(read(f))
          # (file itself inserts SchemaVersion row)
        COMMIT   # any error → ROLLBACK → raise E_MIGRATION_FAILED
        current = n
```

- Per-Task DBs: runner is invoked for every `TaskId` directory found under `backend/db/tasks/` at boot.
- New Tasks: `Job/Task` creation calls `migrate` on the newly created `task.db` + `rules.db` before returning.

## 5. Failure Modes

| Code                  | Cause                                    | Supervisor behavior                                           |
| --------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| `E_MIGRATION_GAP`     | Numbered migration missing               | Refuse to start; log with the missing number                  |
| `E_MIGRATION_FAILED`  | Statement raised                         | Refuse to start; log full statement + SQLite message          |
| `E_SCHEMA_AHEAD`      | DB `version` > highest shipped migration | Refuse to start; instructs operator to upgrade the app binary |
| `E_MIGRATION_TIMEOUT` | Any single migration > 60 s              | Refuse to start; log slow statement                           |

No `try/except` around a migration to keep going. Silent forward-motion on a partial DB is worse than not booting.

## 6. Testing (referenced by 45)

- Every new migration ships with an at-version fixture DB and a `test_migrate_<NNN>.py` that:
  1. Opens the fixture, runs the runner, asserts new schema.
  2. Runs the runner **twice** — second call MUST be a no-op (`IF NOT EXISTS`).
  3. Runs against an already-at-N DB — MUST be a no-op.
- Fixtures live in `tests/fixtures/db/{root,task,rules}/vNNN.sqlite`.

## 7. Additive-Only Escape Hatches

Because column/table renames are forbidden in v1, evolve by addition:

- **Rename a column** → add the new column, dual-write for one release, backfill, deprecate reads of the old column, drop only in a v2 breaking release.
- **Change a `CHECK` enum** → add a new column with the new constraint, migrate values, deprecate the old.
- **Split a table** → add the new table, dual-write, migrate readers.

The reasoning is field-safety: an inspection line cannot afford a schema downgrade path that hides data.

## 8. Non-Goals

- No online migrations mid-run. Migrations run only at Supervisor boot, when no writer is attached.
- No cross-DB transactions. Each migration touches exactly one DB file.
- No pluggable migration engine (Alembic, sqlite-utils, etc.) in v1 — the runner is ~50 lines and lives in `core/io`.
- No auto-backup before migration in v1 (belongs in ops runbook — 46).

## Acceptance Checklist

- [ ] Every public table migration includes GRANT + RLS in the same file.
- [ ] Migrations are idempotent and forward-only; no destructive rewrites.
- [ ] Every referenced enum type exists prior to its first table use.
