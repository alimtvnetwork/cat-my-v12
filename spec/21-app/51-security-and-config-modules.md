# 51 — Security & Config Modules (post-v1 anchor)

Anchors post-v1 security/config modules that ship with tests but previously
lacked a dedicated `spec/21-app/**` section. Complements
`44-security-privacy.md`, `40-error-manage.md` Appendix A, and `27-config-surface.md`.

## Scope

| Module             | File                                | Contract                                                                                                                                                                                                                                                |
| ------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth surface       | `app/core/security/auth_surface.py` | Typed `AuthError`, `NotAuthenticatedError`, `RoleDeniedError`; `require_role(token, role)` gate. `StubAuthSurface` is the in-repo default.                                                                                                              |
| Audit sink         | `app/core/security/audit_sink.py`   | Append-only SQLite `audit_log`; emits `E_SEC_ROLE_DENIED`, `E_SEC_NOAUTH`, `I_SEC_ADMIN_WRITE`, `E_SEC_RATE_LIMITED`, `E_SEC_DENIAL_BURST`. Mutations/deletes are contract violations and rejected at the sink API.                                     |
| Audit CLI          | `app/core/security/audit_cli.py`    | Read-only JSON reader with `--since`, `--code`, `--user` filters. MUST NOT open the DB in write mode.                                                                                                                                                   |
| Denial remediation | `app/core/security/remediation.py`  | `DenialRateLimiter` detects denial bursts per subject and emits `E_SEC_DENIAL_BURST` before locking out with `E_SEC_RATE_LIMITED`.                                                                                                                      |
| Settings store     | `app/core/config/settings_store.py` | SQLite-backed `settings` + `user_roles`. All writes go through `require_role(token, "admin")`, are rate-limited by `DenialRateLimiter`, and are recorded to the audit sink as `I_SEC_ADMIN_WRITE`; denials record `E_SEC_ROLE_DENIED` / `E_SEC_NOAUTH`. |

## Rules

- Roles live only in `user_roles`; never on a user/profile row (privilege-escalation risk — see `44-security-privacy.md`).
- Every privileged write MUST be observable: one audit row per accept, one per deny.
- The audit log is append-only; retention/rotation is out of scope for v1 and MUST NOT delete rows in place.
- Rate limits are per-subject and time-windowed; thresholds are configurable via the settings store (admin-only, itself audited).

## Proving tests

- `tests/unit/test_auth_surface.py`
- `tests/unit/test_audit_sink.py`
- `tests/unit/test_audit_cli.py`
- `tests/unit/test_remediation.py`
- `tests/unit/test_settings_store.py`
- `tests/unit/test_settings_audit_wire.py`
- `tests/unit/test_settings_rate_limit.py`

## Facade Binding

Per spec 52 (SDK Facade Pattern), every security/config module binds to third-party services through a facade we own. No module in this anchor may import a vendor SDK type (Supabase client, cloud secrets client, OS keyring) directly outside `app/core/security/facades/` or `app/core/config/facades/`.

| Business module                     | Bound facade                                                      | Domain object crossing the seam    |
| ----------------------------------- | ----------------------------------------------------------------- | ---------------------------------- |
| `app/core/security/auth_surface.py` | `SupabaseAuthSdkFacade` (via `StubAuthSurface` in-repo default)   | `CatAuthToken`, `CatUserRoleGrant` |
| `app/core/security/audit_sink.py`   | `SqliteAuditSdkFacade` (in-repo SQLite is the SDK boundary)       | `CatAuditEvent`                    |
| `app/core/security/audit_cli.py`    | Read-only view over `SqliteAuditSdkFacade`                        | `CatAuditEvent` (read)             |
| `app/core/security/remediation.py`  | Pure logic over `SqliteAuditSdkFacade` counters                   | `CatDenialWindow`                  |
| `app/core/config/settings_store.py` | `SqliteSettingsSdkFacade` + `SupabaseAuthSdkFacade` for role gate | `CatSetting`, `CatUserRoleGrant`   |

Enforcement: any Supabase or DB-driver type appearing in a signature, return, field, or `isinstance` check outside the facade folder is `E_BUG_SDK_LEAK` at lint time (spec 52 §2). Every privileged write records one `I_SEC_ADMIN_WRITE` (accept) or `E_SEC_ROLE_DENIED` / `E_SEC_NOAUTH` (deny) through the audit facade (spec 40 Appendix A).

## Retention

Deep contract: `spec/21-app/71-audit-retention.md` (windows, category map, worker cadence, event shape). This section pins the module-level invariants only.

- Policy shape lives in `app/core/audit/retention_policy.py::RetentionPolicy` (§71.2). Categories map many-to-one to a policy; per-row overrides are `E_AUDIT_RETENTION_ROW_OVERRIDE`.
- Admin-only mutation. `SettingsStore.write_retention_policy(policy, *, actor)` gates on `has_role(actor, 'admin')`; success emits `I_SEC_ADMIN_WRITE` subject `settings.audit.retention` with prior/next JSON, denial emits `E_SEC_ROLE_DENIED` and never persists.
- Deterministic clock hook. Worker takes `now_fn` + `monotonic_fn` (spec 40 A.1 row for `I_SEC_AUDIT_PRUNED`); tests inject frozen clocks.
- Prune-is-audited invariant. Every deletion emits exactly one `I_SEC_AUDIT_PRUNED` row (subject `audit_log`, detail `removed=<n> horizon=<ts>`); failure emits `E_SEC_RETENTION_FAILED` with cid + policy + last SQLite error class. No silent deletion; no double-log.
- Sink seam. `app/core/security/audit_sink.py` stays append-only. Deletion lives in `app/core/audit/retention_worker.py`; the sink exposes a read-only handle to the worker. Any DELETE issued through the sink is `E_BUG_SDK_LEAK`.

## Acceptance Checklist

- [ ] Config loader reads only keys declared in spec 27.
- [ ] Secrets fetched via `secrets` connector, never from env at module scope.
- [ ] Role checks use `has_role()` per user-roles memory; no client-side role state.
- [ ] `SettingsStore.write_retention_policy` admin-gated; denial path never persists (test: `tests/unit/test_denial_tuning_admin_write.py` pattern).
- [ ] Retention worker emits `I_SEC_AUDIT_PRUNED` on success and `E_SEC_RETENTION_FAILED` on exhausted back-off; sink stays append-only.
