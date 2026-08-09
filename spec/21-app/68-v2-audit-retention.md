# 68. v2 Audit Retention Index (Plan 20)

Status: Locked. Owner: platform. Version pinned: v2.0.9 target.

This is a pointer spec. The substantive retention contract (windows, category map, event shape, worker cadence, export, storage bounds) lives in `spec/21-app/71-audit-retention.md`. This file exists so Plan 20's Step 4 anchor stays discoverable at the `6x-` band alongside the v2 execution sequence in `spec/21-app/62-v2-execution-order.md`.

## §68.1 Worker Contract (summary)

- Module: `app/core/audit/retention_worker.py` (locked seam, Plan 20 Step 5 hardening).
- Cadence: daily at 02:00 UTC via pg_cron entry `audit-retention-daily`, hitting `src/routes/api/public/hooks/audit-retention.ts` (Plan 20 Step 16). Manual `/ops` re-run is admin-gated.
- Injection: `now_fn` + `monotonic_fn` for deterministic tests; `AuditSink` handle for read + append; explicit connection for the transactional DELETE (worker owns the write path, not the sink).
- Batch shape: one transactional DELETE per policy, per-policy budget in wall time, capped batch size (`DELETE ... LIMIT`), exponential back-off on SQLite `OperationalError` locks, clock-skew guard trips `E_SEC_RETENTION_FAILED` without partial state.

## §68.2 Resolve-before-persist Invariant

Retention policy state read from `SettingsStore.read_retention_policy()` is resolved to a concrete `RetentionPolicy` enum value BEFORE the worker begins any DELETE. Reading mid-run is forbidden. Rationale: a config hot-reload between the first policy read and the last DELETE would silently reclassify rows.

## §68.3 Facade Binding

Retention crosses two facades from `spec/21-app/52-sdk-facade-pattern.md`:

| Consumer                                               | Facade                                                                     | Cat objects                        |
| ------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------- |
| `app/core/audit/retention_worker.py`                   | `SqliteAuditSdkFacade` (read + transactional DELETE)                       | `CatAuditEvent`, `CatRetentionRun` |
| `app/core/audit/retention_worker.py`                   | `ClockSdkFacade` (injected `now_fn`/`monotonic_fn`)                        | `CatClock`                         |
| `src/lib/retention.functions.ts::writeRetentionPolicy` | `SupabaseAuthSdkFacade` (admin gate) + `SqliteSettingsSdkFacade` (persist) | `CatUserRoleGrant`, `CatSetting`   |

Any DELETE against `audit_log` originating outside `retention_worker.py` is `E_BUG_SDK_LEAK` (spec 52 §2). `app/core/security/audit_sink.py` stays append-only; there is no `prune_by_policy` on the sink itself, and adding one is a lint failure.

## §68.4 Cross-refs

- `spec/21-app/71-audit-retention.md` — full contract (windows, categories, event shape, export, SLOs).
- `spec/21-app/51-security-and-config-modules.md` §Retention — module-level invariants.
- `spec/21-app/40-error-manage.md` A.1 — `I_SEC_AUDIT_PRUNED`, `E_SEC_RETENTION_FAILED` rows.
- `spec/21-app/52-sdk-facade-pattern.md` — SDK Facade rules the worker binds to.

## Acceptance Checklist

- [ ] `retention_worker.py` is the only DELETE emitter against `audit_log`; lint rule wired in `linter-scripts/check-forbidden-strings.py` waiver list (add `audit_log` DELETE outside `app/core/audit/`).
- [ ] `AuditSink` has no public deletion method; grep for `def prune` in `app/core/security/audit_sink.py` returns zero.
- [ ] Policy resolved before first DELETE; unit test `tests/unit/test_retention_scheduler.py` covers hot-reload race.
- [ ] Cron entry `audit-retention-daily` registered; first run visible in `cron.job_run_details`.
