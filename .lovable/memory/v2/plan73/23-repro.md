---
name: Plan 73 issue 23 home screen repro
description: Missing numbered workflow steps and inconsistent hero on `/`
type: feature
---

## Symptom

`/` renders `src/routes/index.tsx` with Recent Projects, Templates, and QuickAction pills, but no numbered "Getting started" workflow card (create project -> capture -> rules -> test -> deploy). Home feels sparse and unguided.

## Files to touch

- `src/routes/index.tsx` (home composition)
- `src/components/home/*` (existing hero/quick action components)

## Plan for the fix (executed in step 24)

- Add a `GettingStartedCard` under `src/components/home/GettingStartedCard.tsx` with 5 numbered steps, each linking to the correct route.
- Insert above Recent Projects on `/`.
- No business-logic changes; presentation only.

## Root cause (one sentence)

`src/routes/index.tsx` composes hero + recent + templates but never renders a numbered workflow guide component, so first-run users have no path.
