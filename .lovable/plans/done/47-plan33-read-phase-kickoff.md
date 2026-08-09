# Plan 33 read-phase kickoff, denial-burst telemetry baseline

Slug: plan33-read-phase-kickoff
Steps: 5
Status: pending
Created: 2026-07-16

## Context

First executable slice of `.lovable/plans/pending/33-plan-29-denial-burst-tuning-read-phase.md` (which itself feeds `.lovable/plans/pending/29-denial-burst-threshold-tuning.md`). This slice lands only the read + baseline-memo work (Plan 33 steps 1-7): survey the parent plan, inventory the burst emitters, and produce the three baseline memo files under `.lovable/memory/v2/plan29/`. No code changes, no exporter changes, no threshold changes.

No new user commands or issues were emitted in this planning turn (template-only "5 steps" instruction).

## Steps

1. Read `.lovable/plans/pending/29-denial-burst-threshold-tuning.md` end to end and every file under `.lovable/plans/subtasks/29-denial-burst-threshold-tuning/`; write a landed-vs-open matrix (Plan 33 step 2 deliverable) at `.lovable/memory/v2/plan29/00-baseline-gap.md`.
2. Read `spec/21-app/40-error-manage.md` A.1 Security table; capture the current `W_SEC_DENIAL_BURST` contract (emitter, subject, detail schema) as an appendix in `00-baseline-gap.md`.
3. Read `scripts/security/export_denial_events.py`, `scripts/security/denial_evidence_cli.py`, and `tests/fixtures/security/denial_sample.jsonl`; document the current CLI surface (flags, output schema, sinks) and the fixture row shape in `00-baseline-gap.md`.
4. Grep `W_SEC_DENIAL_BURST` across `app/`, `src/lib/ops.shared.ts`, and `tests/`; write every emit site (path:line) into `.lovable/memory/v2/plan29/10-telemetry-inventory.md` alongside its input source (rate-limit denials, role denials, retention failures).
5. Cross-reference the emitter inventory with the fixture and CLI surface; produce `.lovable/memory/v2/plan29/15-read-phase-summary.md` naming the exact next executable slice (Plan 33 steps 8-15) and any gaps that need a new subtask; leave Plan 33's own `Status:` as `pending` and do not move any file this slice.

## Verification

- Three memo files exist: `.lovable/memory/v2/plan29/00-baseline-gap.md`, `10-telemetry-inventory.md`, `15-read-phase-summary.md`.
- `00-baseline-gap.md` cites at least the parent plan, each existing subtask under `29-denial-burst-threshold-tuning/`, the error-manage spec row, and the two security scripts by path.
- `10-telemetry-inventory.md` lists every `W_SEC_DENIAL_BURST` emit site with a `path:line` reference matching a fresh `rg -n W_SEC_DENIAL_BURST` run.
- `15-read-phase-summary.md` names the next slice as Plan 33 steps 8-15 and lists any missing subtasks that must be authored before that slice runs.
- No changes under `app/`, `src/`, `scripts/`, `tests/`, or `spec/` (verify with `git diff --stat` scoped to those trees returning zero on non-memory paths).

## Appended from prior pending tasks

- 29-denial-burst-threshold-tuning.md (root backlog)
- 32-sg-31-01-pattern-edge.md
- 33-plan-29-denial-burst-tuning-read-phase.md (parent, remains pending)
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

## Closure (v3.236.0)

All steps landed as of v3.235.0 (see `.lovable/memory/v2/plan33/00-read-phase-status.md`). Moved to `done/` in this slice. Threshold-change follow-up (plans 29, 49) remains parked pending real 90-day telemetry (>= 200 events); see `.lovable/memory/v2/plan29/40-read-phase-status.md`.
