# Issue 23: Home screen missing steps / looks unprofessional

Status: closed
Closed: 2026-07-18 (plan 73 steps 23-24, v3.495.0)
Created: 2026-07-17

Symptom: User reports the Home screen is "missing steps" and "looks terrible". Specific steps that should guide a new user through the workflow (create project -> capture -> define rules -> test -> deploy) are not surfaced.

Expected: Home screen shows a clear numbered workflow (Photoshop-style Getting Started card + Recent Projects + Templates), consistent typography and spacing, no orphan cards.

Actual: Sparse/inconsistent Home with no workflow guidance.

Related files:

- src/routes/index.tsx
- src/components/home/\*

## Resolution

Verified 2026-07-18 on `/`: `src/components/home/GettingStarted.tsx` renders a numbered 4-step workflow (Create project -> Add ruleset -> Draw rule -> Run trial), each step reading completion straight from `useProjectStore` and linking to the exact route that advances it. Mounted at `src/routes/index.tsx:196` beneath the workflow cards. Playwright (`/tmp/browser/plan73/23/verify.py`) reports title `Getting started` and 4 `[data-testid^="getting-started-step-"]` rows. Delivered originally under Plan 65 SS-05; this slice audits and locks the close.
