# SS-02 — Persistence + Migrations Audit

Slug: persistence
Parent: 06-spec-vs-code-audit
Status: pending
Created: 2026-07-12

## Scope

Audit `spec/21-app/20-*.md`..`23-*.md`, `26-migrations.md`, plus `spec/04-database-conventions/**` and `spec/23-app-db/**` against:

- `app/core/io/migrations/root/000_init.sql`
- `app/core/io/migrate.py`
- `app/supervisor/boot.py` (DB verification path)

## Checks

1. Split-DB pattern (Root / Task / Rules) — only Root implemented so far; confirm Task + Rules migrations are absent and flagged as deferred, not missing-by-drift.
2. Table set in `000_init.sql` matches spec (Job, Task, RunSession, WorkerRun, AppSetting): verify columns, types, PascalCase, nullability defaults.
3. Grants block present per public-schema-grants rule (N/A for SQLite — record if spec assumes Postgres and code uses SQLite; that is a drift).
4. Migration idempotency (A-07): re-running `migrate.py` yields identical schema.
5. Atomic write on crash (A-06): induced-crash test path exists or is listed as PENDING.
6. Reference-image content-addressing (Q-08): storage location + hash algorithm documented and implemented?

## Output

Findings appended to `.lovable/memory/audit/22-persistence.md` with Severity/Impact and proposed correction per finding.
