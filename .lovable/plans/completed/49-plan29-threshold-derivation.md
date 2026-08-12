# Plan 29 threshold derivation slice, denial-burst constants update

Slug: plan29-threshold-derivation
Steps: 5
Status: done
Created: 2026-07-16

## Context

Threshold-change slice for `.lovable/plans/pending/29-denial-burst-threshold-tuning.md`, running after the read + data phase (`47-*`, `48-*`) lands the memos `00-baseline-gap.md`, `10-telemetry-inventory.md`, `20-windows.json`, and `30-derivation-inputs.md`. This slice picks the new burst thresholds from `30-derivation-inputs.md`, updates the constants module + emitter defaults, migrates the emit contract, and syncs the spec. No new telemetry, no UI change, no admin surface change.

No new user commands or issues were emitted in this planning turn (template-only "5 steps" instruction).

## Steps

1. Load `.lovable/memory/v2/plan29/30-derivation-inputs.md` and `20-windows.json`; write `.lovable/memory/v2/plan29/40-decision.md` naming the chosen thresholds per window (1m/5m/15m) with the arithmetic (p95 or p99, rounding rule), the diff vs the current constants, and the rollback plan.
2. Update the denial-burst constants (single source of truth under `app/core/security/denial_burst.py` and any TS mirror under `src/lib/constants/` created by plan 44/45) to the new values from step 1; keep old values commented with a `# TODO(plan-29): remove after two release cycles` marker for rollback.
3. Emitter path (`app/core/security/*` where `W_SEC_DENIAL_BURST` fires): keep the emit contract stable but log the new threshold and window in the `detail` payload so downstream tools can distinguish pre/post tuning; add a `tuning_version` field pinned to `plan-29-v1`.
4. Tests: extend `tests/unit/test_denial_burst.py` (or add if missing) with fixture cases proving the new thresholds fire and the old thresholds no longer fire at the boundary values; update `tests/fixtures/security/denial_sample.jsonl` boundary annotations without regenerating unrelated rows; refresh any snapshot referencing the old values.
5. Sync spec + docs: update `spec/21-app/40-error-manage.md` A.1 Security row for `W_SEC_DENIAL_BURST` with the new thresholds, `tuning_version`, and decision-memo link; add `RELEASE_NOTES.md` and `changelog.md` entries; verify: `bunx tsgo --noEmit`, `python -m pytest tests/unit/test_denial_burst.py tests/unit/export_denial_percentiles_test.py`, and `linter-scripts/run.sh` all exit 0.

## Verification

- `.lovable/memory/v2/plan29/40-decision.md` exists and cites specific numeric values from `20-windows.json` (grep matches at least three numeric literals in both files).
- `git diff` on the constants file(s) shows exactly the old-to-new value swap plus the rollback comment; no unrelated edits.
- `tuning_version = "plan-29-v1"` appears in every `W_SEC_DENIAL_BURST` emit site (grep hit-count matches inventory in `10-telemetry-inventory.md`).
- Boundary tests in step 4 pass; parametrised cases cover just-below, just-at, and just-above each new threshold per window.
- Spec row diff after step 5 references `40-decision.md` and lists the new thresholds; `RELEASE_NOTES.md` and `changelog.md` have a Plan 29 entry.
- `bunx tsgo --noEmit`, `python -m pytest`, and `linter-scripts/run.sh` all exit 0.

## Appended from prior pending tasks

- 29-denial-burst-threshold-tuning.md (parent)
- 32-sg-31-01-pattern-edge.md
- 33-plan-29-denial-burst-tuning-read-phase.md
- 35-ui-ux-photoshop-layers-overhaul.md
- 36-ui-app-shell-and-src-v3-port.md
- 37-home-dexter-ui-repair.md
- 38-read-memory-onboarding-and-audit.md
- 39-read-spec-code-and-memorize.md
- 40-tools-images-spec-docs.md
- 41-keyboard-dnd-and-code-quality-pass.md
- 42-rule-conditions-and-validation-order.md
- 43-coding-quality-error-dialog-and-mode-flag.md
- 44-plan43-execution-slice-1.md
- 45-plan43-execution-slice-2.md
- 46-plan43-execution-slice-3.md
- 47-plan33-read-phase-kickoff.md
- 48-plan33-server-fn-and-percentiles.md

## Status: BLOCKED-PARKED (v3.236.0)

Blocked pending real 90-day denial-event export at `.lovable/plans/subtasks/29-denial-burst-threshold-tuning/evidence/90d.jsonl` (gitignored, not yet on disk). Current fixture is 12 rows: too small for a meaningful sigma, so the shipped default of `denial_threshold=5, denial_window_seconds=60` in `app/core/security/denial_defaults.py` stays as-is. Rebuild path is documented in `.lovable/memory/v2/plan29/30-derivation-inputs.md`. Read+data phase (plans 33, 47, 48) is CLOSED in v3.236.0.
