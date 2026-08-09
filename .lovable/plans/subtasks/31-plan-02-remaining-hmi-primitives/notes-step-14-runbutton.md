---
title: Step 14 - Create RunButton primitive
parent: 31-plan-02-remaining-hmi-primitives
status: complete
date: 2026-07-15
---

# RunButton primitive

Root cause: Plan 31 Step 14 requires a reusable RunButton primitive, but `src/components/hmi/` had no `RunButton.tsx`, so `/run` could not migrate to the locked HMI control contract.

## Files read

- `.lovable/plans/pending/31-plan-02-remaining-hmi-primitives.md:43-48`.
- `src/components/hmi/ActionBar.tsx:1-18`.
- `src/components/hmi/ToolTile.tsx:1-48`.
- `src/components/hmi/GlobalNav.tsx:1-63`.
- `src/components/hmi/index.ts:1-16`.
- `src/styles.css:64-80,175-185,245-248`.
- `.lovable/plans/subtasks/31-plan-02-remaining-hmi-primitives/notes-step-13-tooltile-export.md:1-35`.

## Change

- Created `src/components/hmi/RunButton.tsx` as a forwardRef button primitive with `isRunning` disabled behavior, primary HMI styling, optional icon slot, and `hmi-focus-ring` focus treatment.

## Verification

- Before: no `src/components/hmi/RunButton.tsx` file existed.
- After: `src/components/hmi/RunButton.tsx` exists and defines `RunButton` plus `RunButtonProps`.

## Next

Step 15: export `RunButton` and `RunButtonProps` from `src/components/hmi/index.ts`.
