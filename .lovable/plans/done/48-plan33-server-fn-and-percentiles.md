# Plan 33 slice 2, denial-burst server function and percentile exporter

Slug: plan33-server-fn-and-percentiles
Steps: 5
Status: pending
Created: 2026-07-16

## Context

Second executable slice of `.lovable/plans/pending/33-plan-29-denial-burst-tuning-read-phase.md`, running after `47-plan33-read-phase-kickoff.md` lands the baseline memos. Covers Plan 33 steps 8-15: read-only admin server function `getDenialBurstWindow`, `--percentiles` extension to `scripts/security/export_denial_events.py`, deterministic window snapshot, and the derivation-inputs memo. No threshold constant is changed in this slice; that ships in the follow-up plan.

No new user commands or issues were emitted in this planning turn (template-only "5 steps" instruction).

## Steps

1. Add `getDenialBurstWindow` in `src/lib/security-telemetry.functions.ts` using `.middleware([requireSupabaseAuth])`, gated by `has_role(auth.uid(),'admin')` inside the handler; on non-admin throw typed `E_SEC_ROLE_DENIED` with correlation id; return the last N hours of denial rows (default 24h, N clamped 1..168). No SQL migrations, no new grants. See ./subtasks/48-plan33-server-fn-and-percentiles/SS-01-server-fn.md.
2. Unit test `tests/unit/security-telemetry-window.test.ts`: admin returns rows, non-admin returns typed error, empty window returns `[]` (never `null`), out-of-range `hours` clamps to boundary, RLS applies as caller.
3. Extend `scripts/security/export_denial_events.py` with `--percentiles` producing p50/p95/p99 for burst counts per 1-min, 5-min, and 15-min windows; deterministic ordering; JSONL out. See ./subtasks/48-plan33-server-fn-and-percentiles/SS-02-percentiles.md.
4. Add `tests/unit/export_denial_percentiles_test.py` (fixture-driven: `tests/fixtures/security/denial_sample.jsonl` plus 200 synthetic rows appended in-test) asserting deterministic p50/p95/p99 per window; add `scripts/security/plan29_windows.py` that reads exporter JSONL and writes `.lovable/memory/v2/plan29/20-windows.json`; run it against the fixture and commit `20-windows.json`.
5. Write `.lovable/memory/v2/plan29/30-derivation-inputs.md` with a candidate-threshold table (current vs p95 vs p99) showing the arithmetic and citing `20-windows.json`; verify: `bunx tsgo --noEmit`, `bunx vitest run tests/unit/security-telemetry-window.test.ts`, `python -m pytest tests/unit/export_denial_percentiles_test.py`, and `python scripts/security/plan29_windows.py --input tests/fixtures/security/denial_sample.jsonl --check` all exit 0.

## Verification

- `getDenialBurstWindow` exists with `requireSupabaseAuth` middleware and admin gate; unit test in step 2 passes.
- `scripts/security/export_denial_events.py --percentiles --help` documents the flag; JSONL output for the fixture matches a golden snapshot committed alongside the test.
- `tests/unit/export_denial_percentiles_test.py` passes on CI (`python -m pytest`).
- `.lovable/memory/v2/plan29/20-windows.json` and `.lovable/memory/v2/plan29/30-derivation-inputs.md` exist; the memo cites p95/p99 values from `20-windows.json` (grep must find matching numeric literals).
- No threshold constants under `app/` or `spec/21-app/40-error-manage.md` were modified (verify with `git diff --stat` on those trees returning zero for constants files).

## Appended from prior pending tasks

- 29-denial-burst-threshold-tuning.md
- 32-sg-31-01-pattern-edge.md
- 33-plan-29-denial-burst-tuning-read-phase.md (parent)
- 35-ui-ux-photoshop-layers-overhaul.md
- 36-ui-app-shell-and-src-v3-port.md
- 37-home-dexter-ui-repair.md
- 38-read-memory-onboarding-and-audit.md
- 39-read-spec-code-and-memorize.md
- 40-tools-images-spec-docs.md
- 41-keyboard-dnd-and-code-quality-pass.md
- 42-rule-conditions-and-validation-order.md
- 43-coding-quality-error-dialog-and-mode-flag.md (parent)
- 44-plan43-execution-slice-1.md
- 45-plan43-execution-slice-2.md
- 46-plan43-execution-slice-3.md
- 47-plan33-read-phase-kickoff.md (predecessor)

## Closure (v3.236.0)

All steps landed as of v3.235.0 (see `.lovable/memory/v2/plan33/00-read-phase-status.md`). Moved to `done/` in this slice. Threshold-change follow-up (plans 29, 49) remains parked pending real 90-day telemetry (>= 200 events); see `.lovable/memory/v2/plan29/40-read-phase-status.md`.
