# Plan 33 read-phase summary

Version: v3.206.0
Date: 2026-07-16
Predecessor: `47-plan33-read-phase-kickoff.md` (this slice).
Successor: `48-plan33-server-fn-and-percentiles.md` (Plan 33 steps 8-15).

## What this read-phase established

1. `E_SEC_DENIAL_BURST` has one emit site: `app/core/security/remediation.py:127` via `DenialRateLimiter._emit_burst`. Payload keys are stable since v3.203.0 (`phase`, `count`, `window`, `threshold`, `margin`, `tuning_version`). No other emitter to migrate.
2. Consumer surface (`src/routes/ops.tsx`, `src/lib/ops.*`, `src/lib/display-labels.ts`) is the client side that Plan 48 step 1 (`getDenialBurstWindow`) will feed.
3. Exporter (`scripts/security/export_denial_events.py`) already scaffolds `--percentiles`/`--percentiles-out` flags (lines 100-101), but Plan 48 step 3 still needs to lock a golden JSONL snapshot per fixture + 200 synthetic rows. Windows constant `((1m,60),(5m,300),(15m,900))` is the target contract.
4. Fixture `tests/fixtures/security/denial_sample.jsonl` has 12 rows; deterministic p50/p95/p99 will require appending synthetic rows in-test (Plan 48 step 4).

## Named next executable slice

**Plan 33 steps 8-15 → executed by `.lovable/plans/pending/48-plan33-server-fn-and-percentiles.md`.** No new subtasks need authoring; that plan is ready to run.

## Blocked/deferred items

- Plan 29 unpark (steps 32+): requires a real 90-day export at `.lovable/plans/subtasks/29-denial-burst-threshold-tuning/evidence/90d.jsonl` (gitignored). Blocked on field data, not on plan authoring.
- `src/lib/ops.server.ts:8` demo row uses pre-v3.203 payload; low-priority follow-up, defer to Plan 51.

## Verification

- `git diff --stat` scoped to `app/ src/ scripts/ tests/ spec/` shows zero changes on non-memory paths this slice.
- All three memos created under `.lovable/memory/v2/plan29/`.
- Plan 33 `Status:` remains `pending`. No files moved.

## Correction recorded

Plan 33 step 4 called the emitted code `W_SEC_DENIAL_BURST`. The actual constant on disk is `E_SEC_DENIAL_BURST` (Error class, not Warning). Downstream slices should use `E_SEC_DENIAL_BURST` verbatim; do not chase the `W_` string in code.
