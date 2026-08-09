# Plan 29 Denial-Burst Tuning: Read + Data Phase

Slug: plan-29-denial-burst-tuning-read-phase
Steps: 20
Status: pending
Created: 2026-07-15

## Context

Backlog rank 4 (Plan 29, `.lovable/plans/pending/29-denial-burst-threshold-tuning.md`) is unblocked after Plan 31 close-out at v3.91.0 and Plan 32 (SG-31-01 PatternEdge) scaffolding at v3.92.0. This plan lands the Read + Data phases (Plan 29 steps 1-15) as a single closed loop: gather live denial telemetry, export it, and compute p50/p95/p99 windows before touching any threshold constant. No threshold changes ship this turn; derivation, migration, tests, and spec updates are follow-up plans.

Related:

- `.lovable/plans/pending/29-denial-burst-threshold-tuning.md` (parent backlog plan)
- `.lovable/plans/subtasks/29-denial-burst-threshold-tuning/` (existing subtasks)
- `scripts/security/export_denial_events.py`, `scripts/security/denial_evidence_cli.py`
- `tests/fixtures/security/denial_sample.jsonl`
- `spec/21-app/40-error-manage.md` (W_SEC_DENIAL_BURST row)

No new user commands or issues were emitted in this planning turn (template-only "20 steps" instruction).

## Steps

1. Read `.lovable/plans/pending/29-denial-burst-threshold-tuning.md` in full; enumerate the 50-step surface and mark which of steps 1-15 are already partially landed under `subtasks/29-denial-burst-threshold-tuning/`.
2. Read every file under `.lovable/plans/subtasks/29-denial-burst-threshold-tuning/` and produce a short landed-vs-open matrix at `.lovable/memory/v2/plan29/00-baseline-gap.md`.
3. Read `spec/21-app/40-error-manage.md` A.1 Security table and pin the current `W_SEC_DENIAL_BURST` contract (emitter, subject, detail schema) into the baseline-gap memo.
4. Read `scripts/security/export_denial_events.py` and `scripts/security/denial_evidence_cli.py`; document current CLI surface (flags, output schema, sinks) in the memo.
5. Read `tests/fixtures/security/denial_sample.jsonl` and note the row shape used by existing unit tests so the exporter output can round-trip against it.
6. Confirm the Ops event source of truth: grep for `W_SEC_DENIAL_BURST` across `app/`, `src/lib/ops.shared.ts`, and `tests/`; record every emit site in the memo.
7. Write `.lovable/memory/v2/plan29/10-telemetry-inventory.md` listing every burst-detection input (rate-limit denials, role denials, retention failures) with path:line refs.
8. Add a read-only server function `getDenialBurstWindow` at `src/lib/security-telemetry.functions.ts` (no admin write, no schema change) returning the last N hours of denial rows for authenticated admins. See ./subtasks/33-plan-29-denial-burst-tuning-read-phase/SS-01-server-fn.md.
9. Wire admin gate: reuse `has_role(auth.uid(),'admin')` check inside the handler; deny with typed `E_SEC_ROLE_DENIED`. No new SQL, no new grants.
10. Unit test `tests/unit/security-telemetry-window.test.ts`: admin returns rows, non-admin denied, empty-window returns `[]` (no null).
11. Extend `scripts/security/export_denial_events.py` with a `--percentiles` flag that emits p50/p95/p99 for burst counts per 1-min / 5-min / 15-min windows. See ./subtasks/33-plan-29-denial-burst-tuning-read-phase/SS-02-percentiles.md.
12. Unit test `tests/unit/export_denial_percentiles_test.py`: fixture-driven; asserts deterministic p50/p95/p99 against `denial_sample.jsonl` extended with 200 synthetic rows.
13. Add `scripts/security/plan29_windows.py` that reads exporter JSONL and writes `.lovable/memory/v2/plan29/20-windows.json` (per-window percentiles + row counts + first/last ts).
14. Run the exporter + windows script against `tests/fixtures/security/denial_sample.jsonl` (deterministic input) and commit the resulting `20-windows.json`.
15. Write `.lovable/memory/v2/plan29/30-derivation-inputs.md`: table of candidate thresholds (current vs p95 vs p99) with the arithmetic shown, no decision yet.
16. Update `.lovable/plans/pending/29-denial-burst-threshold-tuning.md` step 1-15 checklist: flip each landed step to `[x]` with a citation to this plan's file/line.
17. Update `.lovable/memory/index.md`: add a `Plan 29 read+data phase (v3.93.0)` block linking the three memo files and `20-windows.json`.
18. Docs: append entry to `changelog.md`, `release_notes.md`, and `readme.md` version-history block for the read+data phase (no threshold change yet).
19. Run `python scripts/bump_minor.py --title "Plan 29 read+data phase closed"` to move v3.92.0 -> v3.93.0; verify `package.json`, `readme.md`, `changelog.md`, `release_notes.md` all agree.
20. Move this file to `.lovable/plans/done/33-plan-29-denial-burst-tuning-read-phase.md` and flip `Status: pending` -> `Status: completed`; leave parent Plan 29 in `pending/` (derivation phase still open).

## Verification

- Steps 1-7: `ls .lovable/memory/v2/plan29/` shows `00-baseline-gap.md`, `10-telemetry-inventory.md`.
- Steps 8-10: `bunx tsgo` clean; `bunx vitest run tests/unit/security-telemetry-window.test.ts` 3/3 green.
- Steps 11-14: `pytest tests/unit/export_denial_percentiles_test.py -q` green; `20-windows.json` present with all three percentiles per window.
- Step 15: memo shows current-vs-p95-vs-p99 table.
- Steps 16-17: `rg "Plan 29 read\+data" .lovable/memory/index.md` returns the block; parent plan checklist reflects landed steps.
- Steps 18-19: `grep 3.93.0 package.json readme.md changelog.md release_notes.md` returns 4 matches.
- Step 20: `ls .lovable/plans/pending/33-*.md` empty; `ls .lovable/plans/done/33-*.md` present; parent Plan 29 still in `pending/`.

## Appended from prior pending tasks

- Plan 29 (rank 4) full surface: derivation (steps 16-25), migration/code (26-35), tests (36-42), spec+observability (43-48), close-out (49-50) all remain in `.lovable/plans/pending/29-denial-burst-threshold-tuning.md`. This plan closes only steps 1-15.
- Plan 32 (SG-31-01 PatternEdge, 10 steps) remains in `.lovable/plans/pending/32-sg-31-01-pattern-edge.md`; no dependency on this plan.
- Housekeeping: remove residual "pre-93 panel gaps" line from `.lovable/memory/index.md` once Plan 32 lands (out of scope here).

## Closure (v3.236.0)

All steps landed as of v3.235.0 (see `.lovable/memory/v2/plan33/00-read-phase-status.md`). Moved to `done/` in this slice. Threshold-change follow-up (plans 29, 49) remains parked pending real 90-day telemetry (>= 200 events); see `.lovable/memory/v2/plan29/40-read-phase-status.md`.
