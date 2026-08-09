# SS-05 home screen steps rewrite

Slug: home-steps
Parent: 73-ui-issues-closeout-sweep
Status: pending
Created: 2026-07-18

## Scope

Issue 23: home step list is unclear. Rewrite as a 4-card numbered walkthrough: (1) Create project, (2) Configure capture, (3) Author rules, (4) Run.

## Steps

1. Extract the step list from `src/routes/index.tsx` into `src/components/home/HomeSteps.tsx`.
2. Each card: number badge, lucide icon, title <= 4 words, one-sentence description, primary link to the corresponding route.
3. Keyboard: cards are `<a>` tags with a visible focus ring, not `<div onClick>`.

## Verification

- `tests/e2e/playwright_home.py` sees exactly four step cards with the expected hrefs.
- Axe reports zero contrast violations.
