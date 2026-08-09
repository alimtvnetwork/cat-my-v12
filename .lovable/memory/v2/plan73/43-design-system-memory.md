---
name: Plan 73 step 43 - design-system memory update
description: Records the new --ca-on-primary token, the tinted-pill active pattern, and the closed-issue refs (17,19,20,21,23,25,26) into .lovable/memory/04-design-system.md.
type: reference
---

# Plan 73, step 43: design-system memory update

Root cause (one sentence): the design-system memory did not name `--ca-on-primary` or the tinted-primary pill pattern that landed in v3.506.0, so future agents would re-introduce hardcoded whites on `--ca-primary` fills.

Update: appended a "Plan 73 closeout tokens (v3.507.0, 2026-07-18)" section to `.lovable/memory/04-design-system.md` documenting:

- New token `--ca-on-primary` + `--color-ca-on-primary`; use `text-ca-on-primary` on primary CTAs.
- Active-state pill pattern for tinted-primary surfaces (`border-ca-primary/60 bg-ca-primary/25 text-ca-ink`).
- Closed-issue references for Plan 73 scope: 17, 19, 20, 21, 23, 25, 26 (all `Status: closed`).
- Rule reinforced: never hardcode a foreground on a primary-tinted surface; use the `-on-*` token or add one under `@theme inline` in `src/styles.css`.

Regression coverage: `tests/e2e/axe_a11y.py` (WCAG2 AA, 8 routes, zero violations, `tests/reports/a11y-axe.json`) + Plan 69 visual baselines under `tests/reports/screenshots/plan69/baseline/`.
