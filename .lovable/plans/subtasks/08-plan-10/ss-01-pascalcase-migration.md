# SS-01 — PascalCase rename migration

Slug: pascalcase-migration
Parent: 08-plan-10
Status: pending
Created: 2026-07-12

## Goal

Rename every column in `app/core/io/migrations/root/000_init.sql` output from camelCase to PascalCase per `spec/04-database-conventions` and audit finding F-76.

## Files

- New: `app/core/io/migrations/root/001_pascalcase_rename.sql`
- Edit: `app/core/io/migrate.py` (add `PRAGMA table_info` self-check, enforce `PRAGMA foreign_keys=ON`, `IF NOT EXISTS` on `SchemaVersion` seed — folds F-78/F-79).

## Approach

1. For each affected table (`Job`, `Task`, `RunSession`, `WorkerRun`, `AppSetting`), emit `ALTER TABLE ... RENAME COLUMN <camel> TO <Pascal>` statements. SQLite ≥ 3.25 supports column rename; migrate.py already pins ≥ 3.35.
2. Primary keys become `{TableName}Id` per guideline §"Data & Schema Rules" rule 4.
3. Add `PRAGMA foreign_keys=ON` at connection open in `migrate.py`.
4. After migration apply, run `PRAGMA table_info(<T>)` and assert every column matches `^[A-Z][A-Za-z0-9]*$`; raise `InfraError(E_MIGRATION_SCHEMA_DRIFT)` on mismatch.

## Verification

- `sqlite3 <root.db> "PRAGMA table_info(Task)"` → `TaskId, JobId, Status, ...` (all PascalCase).
- `pytest tests/unit/test_migrate.py::test_pascalcase_enforced` green (added in Step 8).
- `.lovable/memory/audit/30-db-conventions.md` rescored ≥ 80.

## Guideline compliance

- Function length ≤ 15 lines; no nested `if`; boolean names prefixed `is`/`has`.
- Catch → log → rethrow at migration boundary; no swallowed errors.
