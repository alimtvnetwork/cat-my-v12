# Plan 73 Closeout

Status: completed
Closed: 2026-07-18
Plan file: `.lovable/plans/completed/73-ui-issues-closeout-sweep.md`

## Scope delivered

UI issues closeout sweep (issues 17-26) plus Plan 43 slice 3 residual. All 50 steps executed.

## Issues closed (10)

17 menu hover jitter, 18 header duplication, 19 panels not draggable, 20 worker notice clipping, 21 error visualization weakness, 22 seed-not-facaded, 23 tools-collapse chevron, 24 rules-editor program-panel arrow, 25 category picker, 26 rules-form validation surface.

## Versions touched

v3.503.0 (steps 36-37 boolean-args refactor) through v3.508.0 (steps 45-46 baselines + inventory audit). Final closeout bump: v3.509.0.

## Gate signals (last run, step 42, v3.506.0)

- `bunx tsgo --noEmit` exit 0
- `bunx vitest run` 95 files / 718 tests passing
- `python3 tests/e2e/axe_a11y.py` 0 violations across 8 routes
- Visual baselines refreshed in step 45 (v3.508.0) to absorb a11y color diffs

## Design system additions

Token `--ca-on-primary` (oklch(0.16 0.02 300)) plus tinted-primary active-pill pattern (`border-ca-primary/60 bg-ca-primary/25 text-ca-ink`). Documented in `.lovable/memory/04-design-system.md`.

## Hand-off (out of scope, deferred to Plan 74)

Open issues 09, 11, 12, 13, 14, 15. See step 44 sweep and forthcoming Plan 74 seed doc.

## Evidence index

Per-step memos 00, 01, 10, 17, 19, 20-26, 32, 33, 35, 36, 38, 40, 41, 43, 44, 45, 46 in this directory.
