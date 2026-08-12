# Rank 4 - Denial-burst Threshold Tuning from Live Telemetry

Slug: denial-burst-threshold-tuning
Steps: 50
Status: parked-blocked-on-field-data (see subtasks/29-denial-burst-threshold-tuning/05-park-decision.md)
Created: 2026-07-14

## Context

Rank 4 in the v2 backlog (`.lovable/memory/v2/01-ranked-backlog.md`). Current denial-burst thresholds in `spec/22-security/` and the enforcing code path are set from initial estimates, not live telemetry. Field data captured since v2.28.0 (Plan 15 shipped the burst counter) shows both false positives (legit operators tripped) and false negatives (attack replays passed under the wire). This plan reads the live telemetry, derives per-tenant + global thresholds, ships them behind a config key + forward-only migration, updates `spec/22-security/*`, adds contract + integration tests, and adds observability so the next tune-up is data-driven.

No AI-01 style open question here. The shell (Plan 28) is closed, so nothing blocks this.

Related:

- Backlog row: `.lovable/memory/v2/01-ranked-backlog.md` (Rank 4).
- Scoring: `.lovable/memory/v2/03-effort-risk-scoring.md` (Rank 4 = M effort, Med risk).
- Predecessor: Plan 15 (burst counter shipped, v2.28.0).
- Spec home (REPATHED): `spec/21-app/69-v2-denial-tuning-contract.md` (locked v2.0.3 contract). No `spec/22-security/` exists.
- Code paths (REPATHED): `app/core/security/remediation.py` (`DenialRateLimiter`), `app/core/security/denial_defaults.py` (`derive_denial_defaults`), `app/core/security/denial_metrics.py` (baseline + candidates + FP/FN evaluator). No `denial_burst.py` exists.
- Tests (REPATHED): `tests/unit/test_denial_defaults_derivation.py`, `tests/unit/test_denial_tuning_hot_reload.py`, `tests/unit/test_denial_tuning_admin_write.py`, `tests/unit/test_denial_replay_harness.py`, `tests/unit/test_settings_driven_thresholds.py`, `tests/unit/test_boot_security_wiring.py`. No `tests/security/` folder.
- Config path (REPATHED): `app/core/config/settings_store.py` (section `security`, keys `denial_threshold` / `denial_window_seconds`, defaults `5` / `60s`). No `app/core/config/loader.py`.
- Telemetry (REPATHED): `app/core/security/audit_sink.py` (`CODE_ROLE_DENIED`, `CODE_NOT_AUTHENTICATED`, `CODE_DENIAL_BURST`). No `app/core/telemetry/` module.

New artifacts (REPATHED): `spec/21-app/69a-v2-denial-tuning-evidence.md` (methodology + numeric evidence, amends §4 of spec 69), config-value change through the existing admin `SettingsStore.write_section("security", ...)` path with a documented rollback (no new schema key, no migration file), subtasks folder `.lovable/plans/subtasks/29-denial-burst-threshold-tuning/`.

## Steps

### Read phase (1-6)

1. Read `spec/22-security/` in full; list every current threshold, its symbolic name, default, and citation `path:line`.
2. Read `app/core/security/denial_burst.py` and enumerate every branch that consumes a threshold, plus the log lines it emits and the error codes (`E_SEC_*`) it raises.
3. Read `tests/security/test_denial_burst*.py` and record which threshold values are asserted, and whether tests use fixtures or hardcoded constants.
4. Read `app/core/telemetry/log_record.py` and the audit sink from Plan 20 (`app/core/telemetry/audit_sink.py`) to confirm the fields available for the tuning analysis (tenant id, event kind, ts, outcome).
5. Read `spec/03-error-manage/` for the log-line contract (`missing-log-is-a-bug`) and any burst-related error codes already registered.
6. Write findings to `.lovable/plans/subtasks/29-denial-burst-threshold-tuning/01-read-findings.md`.

### Data phase (7-15)

7. Define the telemetry export shape (JSON lines) and the query window (rolling 90 days).
8. Add a one-shot exporter script `scripts/security/export_burst_events.py` that reads the audit sink and emits the JSON lines. Log every step; no silent failures.
9. Run the exporter against the local sample dataset checked into `tests/fixtures/security/burst_sample.jsonl` (add if missing).
10. Compute per-tenant p50, p95, p99 of burst rate; compute the same globally.
11. Compute false-positive rate at the current threshold vs candidate thresholds (p95 + 2σ, p99, p99 + 3σ).
12. Choose candidate defaults; document them with the numeric evidence in `subtasks/29-*/02-threshold-proposal.md`.
13. Cross-check candidates against the top 20 audited denial events for narrative sanity.
14. Peer-review checklist appended to `02-threshold-proposal.md` (fields: reviewer, date, decision).
15. Freeze the candidate table.

### Spec phase (16-22)

16. Draft `spec/22-security/threshold-tuning.md` covering methodology, evidence pointers, decision rule, review cadence (quarterly).
17. Update existing `spec/22-security/*.md` files that quote the old thresholds; replace numbers with a table reference; annotate `path:line` deltas.
18. Add error-code rows to `spec/03-error-manage/` if new codes are introduced (`W_SEC_BURST_APPROACHING`, `E_SEC_BURST_TRIPPED_V2`).
19. Cross-link the new spec from `spec/21-app/62-v2-execution-order.md` Rank 4 row.
20. Update `spec/21-app/shell/24-open-questions.md` SH-Q-07 status if the sample size question is resolved.
21. Linter dry-run: enumerate all references and confirm no broken anchors.
22. Draft change log delta for `changelog.md` covering spec changes.

### Config + migration phase (23-30)

23. Add config key `security.denial_burst.thresholds.v2` to the config schema.
24. Add loader logic in `app/core/config/loader.py` with default = candidate table; log the resolved value at boot.
25. Add forward-only migration `app/core/io/migrations/NNNN_denial_burst_thresholds_v2.py` that seeds the new key without touching v1.
26. Backup-before-migrate hook confirmed per `spec/21-app/shell/15-data-migration.md`.
27. Wire the new key into `app/core/security/denial_burst.py`; keep the v1 key readable for one release for rollback.
28. Emit `I_SEC_BURST_THRESHOLDS_LOADED` at boot with the resolved values.
29. Emit `W_SEC_BURST_APPROACHING` when a tenant crosses p95 but not the trip line.
30. Ensure the trip line still raises `E_SEC_BURST_TRIPPED` (existing code) plus the new `E_SEC_BURST_TRIPPED_V2` when the v2 table is in effect.

### Test phase (31-40)

31. Contract test: `tests/contract/test_denial_burst_thresholds_v2.py` asserts the config schema shape and default table.
32. Unit tests: parametrize `test_denial_burst.py` over the candidate table; assert exact log lines are emitted.
33. Fixture: `tests/fixtures/security/burst_sample.jsonl` with the anonymized real-shape sample used in the data phase.
34. Integration test: full boot with the migration applied, verify `I_SEC_BURST_THRESHOLDS_LOADED` appears in logs.
35. Regression test: v1 config still loads and warns via `W_SEC_BURST_V1_DEPRECATED`.
36. Rollback test: revert migration, confirm v1 thresholds take over.
37. Perf test: burst check overhead p95 stays under 200 μs.
38. A11y check: no UI changes, but confirm operator-facing error copy is localised (en/de/zh-Hans per `spec/21-app/shell/18-i18n.md`).
39. Observability test: assert every branch in `denial_burst.py` emits at least one log line (missing-log-is-a-bug enforcement).
40. Run full test suite; record before/after coverage delta.

### Ship phase (41-50)

41. Update `.lovable/memory/index.md` and `v2/02-status-audit.md` with Rank 4 landing evidence.
42. Update `spec/25-app-audit/latest/40-signoff.md` if the audit banner threshold changes.
43. Bump minor version and refresh `changelog.md` + `release_notes.md`.
44. Pin the new version in `readme.md`.
45. Move plan file to `.lovable/plans/done/29-denial-burst-threshold-tuning.md`.
46. Rescore 100/100 with citation to test coverage + evidence files.
47. Draft the next plan (Rank 5) header stub only.
48. Post-ship monitor: capture 7 days of `W_SEC_BURST_APPROACHING` counts and add to the audit trail.
49. Retro note: what the field data told us that the estimates missed.
50. Close.

## Acceptance criteria

- All 50 steps executed; each has an artifact or a commit citation.
- Test suite green; coverage did not drop.
- `I_SEC_BURST_THRESHOLDS_LOADED` appears in a fresh cold-boot log.
- `spec/22-security/threshold-tuning.md` cross-referenced from Rank 4 row in `62-v2-execution-order.md`.
- Rollback path exercised.

## Rollback

Revert the migration (Step 36 verified), restore the v1 config key, and redeploy the previous release. The v1 code path was intentionally kept readable for one release.

## Status: BLOCKED-PARKED (v3.236.0)

Blocked pending real 90-day denial-event export at `.lovable/plans/subtasks/29-denial-burst-threshold-tuning/evidence/90d.jsonl` (gitignored, not yet on disk). Current fixture is 12 rows: too small for a meaningful sigma, so the shipped default of `denial_threshold=5, denial_window_seconds=60` in `app/core/security/denial_defaults.py` stays as-is. Rebuild path is documented in `.lovable/memory/v2/plan29/30-derivation-inputs.md`. Read+data phase (plans 33, 47, 48) is CLOSED in v3.236.0.
