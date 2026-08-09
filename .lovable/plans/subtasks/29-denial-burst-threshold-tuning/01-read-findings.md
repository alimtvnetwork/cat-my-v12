# Plan 29 Steps 1-6 - Read Phase Findings

Date: 2026-07-14
Source plan: `.lovable/plans/pending/29-denial-burst-threshold-tuning.md`

## Correction to plan assumptions

The plan header assumed `spec/22-security/`, `app/core/security/denial_burst.py`, and `tests/security/`. None of these exist. The actual layout is:

- Spec home: `spec/21-app/69-v2-denial-tuning-contract.md` (v2.0.3 locked contract, Plan 19 Step 2).
- Code paths: `app/core/security/remediation.py` (`DenialRateLimiter`) + `app/core/security/denial_defaults.py` (derivation).
- Config path: `app/core/config/settings_store.py` (section `security`, keys `denial_threshold`, `denial_window_seconds`, defaults `5` / `60s`).
- Tests: `tests/unit/test_denial_defaults_derivation.py`, `tests/unit/test_denial_tuning_hot_reload.py`, `tests/unit/test_denial_tuning_admin_write.py`, `tests/unit/test_settings_driven_thresholds.py`, `tests/unit/test_boot_security_wiring.py`.
- Telemetry: `app/core/security/audit_sink.py` (codes `CODE_ROLE_DENIED`, `CODE_NOT_AUTHENTICATED`).
- Boot wiring: `app/supervisor/boot.py`.

Rank 4 in v2 execution order is Denial-burst threshold TUNING from live telemetry: revisit the derivation constants (`window_hours=24`, `percentile=95.0`, `margin=+2`, per-minute bucket) with 90 days of field data, decide whether the p95+2 heuristic still holds, and either lock it or replace it. This is a tuning of an existing shipped feature, not a greenfield build.

## Step 1 - Current thresholds and their citations

- Fallback defaults: `app/core/security/denial_defaults.py:38` -> `{"denial_threshold": 5, "denial_window_seconds": 60}` (comment notes duplicated to avoid circular import with `settings_store`).
- Canonical defaults: `app/core/config/settings_store.py:45-48` (per `spec/21-app/69-v2-denial-tuning-contract.md:31`).
- Section schema: `spec/21-app/69-v2-denial-tuning-contract.md:20-33` locks the two-key payload shape and the invalid-type error `E_CFG_INVALID_SECURITY`.

## Step 2 - Consumer branches in the limiter

- `DenialRateLimiter` lives in `app/core/security/remediation.py`. Consumes both keys; enforced via `SettingsStore.write_section("security", ...)` admin path.
- Deferred: enumerate exact branches + log lines in the Data phase (Step 8 exporter needs them anyway).

## Step 3 - Test coverage

- `tests/unit/test_denial_defaults_derivation.py` asserts `derive_denial_defaults` against the p95+2 rule and the `no-telemetry-fallback` path.
- `tests/unit/test_denial_tuning_hot_reload.py` covers the write -> reload cycle.
- `tests/unit/test_denial_tuning_admin_write.py` covers admin gate + `E_SEC_DENIED`.
- `tests/unit/test_settings_driven_thresholds.py` covers threshold resolution precedence.
- `tests/unit/test_boot_security_wiring.py` covers the boot wiring.
- All tests use fixtures, not hard-coded constants; safe to reparametrise for Rank 4.

## Step 4 - Telemetry surface

- `app/core/security/audit_sink.py` exposes `CODE_ROLE_DENIED` + `CODE_NOT_AUTHENTICATED` as the sample source (already the contract in `denial_defaults.py:24-30`).
- `app/core/telemetry/log_record.py` + `metrics.py` provide the structured shape. No `tenant_id` field in the current record. Rank 4 must decide whether to add tenant dimension or stay global.

## Step 5 - Error-manage rules

- `spec/03-error-manage/03-error-code-registry/*` owns the code catalog. Rank 4 must register any new codes (candidate: `W_SEC_BURST_APPROACHING`, `I_SEC_BURST_THRESHOLDS_LOADED`) before use.
- Missing-log-is-a-bug rule per `spec/21-app/shell/11-observability.md` applies.

## Step 6 - Consequences for the plan

- Rename the plan's spec target from `spec/22-security/threshold-tuning.md` to `spec/21-app/69-v2-denial-tuning-contract.md` §4 amendment + new `spec/21-app/69a-v2-denial-tuning-evidence.md` for the numeric evidence.
- Reroute code paths to `remediation.py` + `denial_defaults.py`.
- Drop the "greenfield migration" framing. The migration in Steps 25-27 is a config-value change with a documented rollback, not a schema change. Keep the audit trail requirement.
- SH-Q-07 in `spec/21-app/shell/24-open-questions.md` (Rank 4 telemetry sample size) still open. Data phase must resolve it.

## Read-phase status

- Steps 1-6 complete for read scope; no code touched.
- Data phase (Steps 7-15) unblocked with the corrected path map above.
