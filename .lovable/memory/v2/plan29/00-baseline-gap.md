# Plan 29 baseline gap matrix (Plan 33 / Plan 47 read-phase)

Version: v3.206.0
Date: 2026-07-16
Scope: docs only, no code changes.

## Landed vs open (parent Plan 29)

|                                                                                                                                                   Plan 29 step | Status         | Evidence on disk                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------: | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|                                                                                                               1-7 (exporter + fixture + basic percentile calc) | landed         | `scripts/security/export_denial_events.py:1-117`, `tests/fixtures/security/denial_sample.jsonl` (12 rows), `app/core/security/denial_metrics.py::percentile` (line 216) and `percentiles_by_window` (line 259)                                         |
|                                                                                                                           8-11 (evidence CLI, tradeoff report) | landed         | `scripts/security/denial_evidence_cli.py:1-151`, `scripts/security/tradeoff_report.py`, `.lovable/plans/subtasks/29-denial-burst-threshold-tuning/04-candidate-evaluation.md`                                                                          |
|                                                                                                                                    12-15 (rollout status memo) | landed         | `.lovable/plans/subtasks/29-denial-burst-threshold-tuning/03-steps-12-15-status.md`                                                                                                                                                                    |
|                                                                                                                   16-19 (evidence spec 69a + synthetic corpus) | landed         | `spec/21-app/69a-v2-denial-tuning-evidence.md`                                                                                                                                                                                                         |
|                                                                                                                   20-21 (park decision, blocked on field data) | landed         | `05-park-decision.md`, status flipped to `parked-blocked-on-field-data`                                                                                                                                                                                |
| 22-31 (`W_SEC_BURST_APPROACHING`, `I_SEC_BURST_THRESHOLDS_LOADED`, tuning_version metadata, `W_SEC_TUNING_EVIDENCE_LOAD_FAILED`, contract + integration tests) | landed         | v3.199.0 - v3.203.0. See `app/core/security/audit_sink.py:36,41,47`, `app/core/security/remediation.py:151-227`, `app/supervisor/boot.py:147`, `tests/contract/test_denial_evidence_schema.py`, `tests/integration/test_denial_evidence_end_to_end.py` |
|                                Plan 33 slice 2 (getDenialBurstWindow server-fn + exporter `--percentiles` extension + windows.json snapshot + derivation memo) | open           | Plan file: `.lovable/plans/pending/48-plan33-server-fn-and-percentiles.md`                                                                                                                                                                             |
|                                                                                                                                  Field 90-day replay to unpark | open (blocked) | `evidence/90d.jsonl` at `.lovable/plans/subtasks/29-denial-burst-threshold-tuning/evidence/` is gitignored and empty locally. Cannot proceed without a real export.                                                                                    |

## Files read for this baseline

- Parent plan: `.lovable/plans/pending/29-denial-burst-threshold-tuning.md`
- Subtasks: `.lovable/plans/subtasks/29-denial-burst-threshold-tuning/{01,02,03,04,05}-*.md`
- Chain plan: `.lovable/plans/pending/33-plan-29-denial-burst-tuning-read-phase.md`
- This-slice plan: `.lovable/plans/pending/47-plan33-read-phase-kickoff.md`
- Next-slice plan: `.lovable/plans/pending/48-plan33-server-fn-and-percentiles.md`

## Appendix A: current `E_SEC_DENIAL_BURST` contract

From `spec/21-app/40-error-manage.md` A.1 (Security) and `app/core/security/audit_sink.py:31`:

- Constant: `CODE_DENIAL_BURST = "E_SEC_DENIAL_BURST"` (audit_sink.py:31).
- Emitter: `app/core/security/remediation.py::DenialRateLimiter.observe` at line 127 (via `_emit_burst`). Dedupe key `(user_id, window_start)`.
- Subject: `user:<user_id>`.
- Detail schema (space-separated `k=v`, since v3.203.0): `phase=burst`, `count=<n>`, `window=<s>s`, `threshold=<t>`, `margin=<APPROACHING_MARGIN>`, `tuning_version=plan-29-v1`.
- Related codes anchored by 69a: `W_SEC_BURST_APPROACHING` (audit_sink.py:36), `I_SEC_BURST_THRESHOLDS_LOADED` (audit_sink.py:41), `W_SEC_TUNING_EVIDENCE_LOAD_FAILED` (audit_sink.py:47).

## Appendix B: CLI surface today

### `scripts/security/export_denial_events.py`

- Flags (argparse): `--db PATH` (required), `--out PATH` (required), `--window-hours INT` (default 2160), `--percentiles` (flag), `--percentiles-out PATH`.
- Reads: `E_SEC_ROLE_DENIED`, `E_SEC_NOAUTH` from `AuditSink` (via `app.core.security.audit_sink`).
- Output: JSONL, one dict per row, no mutation of the sink.
- Percentile support: partial. `--percentiles` flag exists (line 100) and `percentiles_by_window` is imported, but Plan 48 step 3 still asks for a documented `--percentiles` extension producing p50/p95/p99 for 1m/5m/15m windows with deterministic ordering and a JSONL golden snapshot. Verifying end-to-end coverage is Plan 48 slice 2, not this read-phase.
- Windows constant: `WINDOWS = (("window_1m", 60), ("window_5m", 300), ("window_15m", 900))`.

### `scripts/security/denial_evidence_cli.py`

- Flags: `--in PATH | --db PATH` (source, mutually exclusive), `--window-hours INT` (default 2160), `--out-dir PATH` (required), `--no-html`, `--pdf`.
- Owns the tradeoff-report rendering path.

## Appendix C: fixture row shape

`tests/fixtures/security/denial_sample.jsonl` (12 rows). Every row is a JSON object with:

- `ts` (int, unix seconds)
- `code` (one of `E_SEC_ROLE_DENIED`, `E_SEC_NOAUTH`)
- `user_id` (string or null; null only for `E_SEC_NOAUTH`)
- `subject` (string, `<area>:<action>`)
- `detail` (string, free-form)

Fixture is deliberately small so unit tests append synthetic rows in-test (see Plan 48 step 4: 200 synthetic rows).

## What this baseline does NOT do

- Does NOT change any code under `app/`, `src/`, `scripts/`, `tests/`, or `spec/`.
- Does NOT create the server function; that is Plan 48 slice 2 step 1.
- Does NOT extend the exporter; that is Plan 48 slice 2 step 3.
