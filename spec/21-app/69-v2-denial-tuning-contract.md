---
title: v2.0.3 Denial-Burst Tuning Contract
spec_id: 69
status: locked
owner: Plan 19 Step 2
depends_on:
  - spec/21-app/62-v2-execution-order.md#v2.0.3
  - app/core/config/settings_store.py:33,75,197
  - app/core/security/remediation.py (DenialRateLimiter)
  - app/core/security/audit_sink.py (CODE_ADMIN_WRITE, CODE_ROLE_DENIED)
---

# v2.0.3 - Denial-Burst Tuning Contract

Locks the surface for making `DenialRateLimiter` thresholds admin-writable
through `SettingsStore` and derived from real `/ops` denial telemetry.

## 1. Section shape

Section: `security` (already reserved in `ALLOWED_SECTIONS`).

```json
{
  "denial_threshold": 5,
  "denial_window_seconds": 60
}
```

- `denial_threshold`: integer, `>= 1`. Number of denials in one window that
  trips a burst refusal.
- `denial_window_seconds`: integer, `>= 1`. Rolling window in seconds.
- Missing keys fall back to `SECURITY_DEFAULTS` in `settings_store.py:45-48`.
- Invalid types or non-positive ints MUST raise `UnknownSectionError`-adjacent
  `E_CFG_INVALID_SECURITY`. NEVER coerce to 1 silently.

## 2. Admin-write path

- Writer: `SettingsStore.write_section("security", payload, token=...)`.
- Role check: existing admin gate on `write_section` (must be `admin` per
  `user_roles` table). Non-admin -> `PermissionError` with `code = "E_SEC_DENIED"`.
- On successful commit, `apply_security_settings(store, token, limiter)` is
  invoked in-process so `DenialRateLimiter.reload(...)` retunes for the very
  next request. No process restart is permitted as a workaround.
- Audit: emit `I_SEC_ADMIN_WRITE` (`CODE_ADMIN_WRITE`) with
  `subject="settings.security.denial"`, `detail = {"prior": <old>, "next": <new>}`
  (JSON-serialized). Prior value is read under the same transaction so a
  concurrent writer cannot smear the audit trail.

## 3. Burst refusal + audit code

- Runtime refusal: `DenialRateLimiter` raises `RateLimitedError` (existing),
  `code = CODE_RATE_LIMITED = "E_SEC_RATE_LIMITED"`. This is the code the
  caller sees.
- Audit code (new): `CODE_DENIAL_BURST = "E_SEC_DENIAL_BURST"` in
  `app/core/security/audit_sink.py`. Emitted at most once per
  `(user_id, window_start)` tuple so a bursting caller cannot flood the
  audit log at request rate. `subject = "security.denial_burst"`,
  `detail = {"threshold": T, "window_seconds": W, "count": N}`.

## 4. Default derivation

Shipped defaults MUST come from real `/ops` telemetry, not guessed numbers.

- Helper: `derive_denial_defaults(audit_sink, window_hours=24) -> dict`.
- Reads audit rows where `code IN (CODE_ROLE_DENIED, CODE_NOT_AUTHENTICATED)`
  in the trailing 24h window.
- Returns `{denial_threshold, denial_window_seconds, sample_size, derivation}`
  where `derivation` is a short string citing the window (`"24h @ <ts>"`) and
  the percentile rule used (`"p95 per-actor per-minute + 2"`).
- MUST NOT write anything. Defaults are recorded in the release memo, then
  applied via a normal admin `write_section` call.
- If `sample_size == 0`, helper returns `SECURITY_DEFAULTS` verbatim and sets
  `derivation = "no-telemetry-fallback"`. This path is explicitly logged.

## 5. Error taxonomy

| Code                     | Where           | Trigger                           |
| ------------------------ | --------------- | --------------------------------- |
| `E_SEC_DENIED`           | write path      | non-admin caller                  |
| `E_SEC_RATE_LIMITED`     | runtime refusal | caller currently bursting         |
| `E_SEC_DENIAL_BURST`     | audit sink      | burst window tripped (deduped)    |
| `E_CFG_INVALID_SECURITY` | write path      | non-positive int / bad type       |
| `E_CFG_UNKNOWN_SECTION`  | write path      | section not in `ALLOWED_SECTIONS` |

No raw `ValueError` / `PermissionError` may escape the write path without a
`code` attribute.

## 6. Non-goals for v2.0.3

- No UI admin controls. `/ops` shows current threshold + window + last
  derivation timestamp read-only. Writes are CLI / server-function only.
- No per-actor thresholds. Single global threshold this release.
- No adaptive auto-tuning. Derivation runs offline, operator applies.

## 7. Test surface (mandatory)

- `tests/unit/test_denial_tuning_admin_write.py` - admin write success +
  non-admin denied + invalid ints.
- `tests/unit/test_denial_tuning_hot_reload.py` - write, next request trips
  new limit, exactly one `E_SEC_DENIAL_BURST` audit row.
- `tests/unit/test_denial_defaults_derivation.py` - seeded audit -> bounded
  thresholds + `sample_size` reported; zero-sample -> fallback path logged.

## 8. DenialTuningFacade binding

| Facade member                 | Source                                         | Output                                          | Error code                               |
| ----------------------------- | ---------------------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| `ReadTuning()`                | `SettingsStore.read_section("security")`       | threshold, window seconds, derivation timestamp | `E_CFG_UNKNOWN_SECTION`                  |
| `WriteTuning(payload, token)` | `SettingsStore.write_section("security", ...)` | committed threshold and window                  | `E_CFG_INVALID_SECURITY`, `E_SEC_DENIED` |
| `ReloadLimiter()`             | `apply_security_settings`                      | in-memory limiter settings                      | `E_CONFIG_KEY_INVALID`                   |
| `DeriveDefaults(windowHours)` | audit sink query                               | derived defaults and sample size                | `E_AUDIT_STORE_UNAVAILABLE`              |

The facade is the only path that mutates denial tuning. UI panels remain read-only unless a later spec adds an admin editor.

## 9. Contract back-links

| Target                                          | Required use                                                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `spec/21-app/40-error-manage.md`                | Registers `E_SEC_DENIED`, `E_SEC_RATE_LIMITED`, `E_SEC_DENIAL_BURST`, `E_CFG_INVALID_SECURITY`, and `W_DENIAL_RELOAD_FAILED`. |
| `spec/21-app/27-config-surface.md`              | Owns the `security.denial_threshold` and `security.denial_window_seconds` keys plus admin-write constraints.                  |
| `.lovable/memory/09-enums-and-results-shape.md` | Keeps `DenialTuningKey` values PascalCase while preserving boundary `E_*` wire codes.                                         |

## 10. Implementation checklist

- [ ] Non-positive `denial_threshold` is rejected with `E_CFG_INVALID_SECURITY`.
- [ ] Non-positive `denial_window_seconds` is rejected with `E_CFG_INVALID_SECURITY`.
- [ ] Non-admin write returns `E_SEC_DENIED` and does not mutate settings.
- [ ] Successful write emits `I_SEC_ADMIN_WRITE` with subject `settings.security.denial`.
- [ ] Audit detail contains `prior` and `next` JSON from the same transaction.
- [ ] Hot-reload applies before the next limiter decision.
- [ ] `/ops` shows threshold, window, and last derivation timestamp read-only.

## Acceptance Checklist

- [ ] Hot-reload path cited; failure emits `W_DENIAL_RELOAD_FAILED` in spec 40.
- [ ] Every tunable key declared in spec 27 config surface.
- [ ] Admin-write audit event `DenialTuned` registered per spec 72.
