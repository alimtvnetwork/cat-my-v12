---
title: Layout gate green closure (plan 30 step 60)
slug: layout-gate-green-closure
plan: 30
step: 60
status: shipped
---

# Layout gate green closure

Root cause: steps 52-59 were documented as shipped, but the repo had no `src/components/editor/**` implementation or `scripts/check-editor-budgets.sh` runner for the locked guards.

## Files and signals read

- `.lovable/prompts/347-next-task.md` lines 9-49 pinned steps 60-61.
- `spec/24-app-ui-design-system/_notes/layout-budget-gate.md` lines 93-109 defined G-LAYOUT-01..03.
- `spec/24-app-ui-design-system/_notes/shell-grid-topbar.md` lines 19-110 defined the editor shell and G-SHELL guards.
- `spec/24-app-ui-design-system/_notes/right-rail-rule-list.md` lines 88-115 defined rail acceptance and guards.
- `spec/24-app-ui-design-system/_notes/status-strip-scaffold.md` lines 96-120 defined status acceptance and guards.
- Dev-server logs showed only Vite reload lines and no error stack before the fix.

## Shipped closure

- Added `scripts/check-editor-budgets.sh` as the concrete G-\* guard runner.
- Added `src/components/editor/shell`, `ribbon`, `rail`, `status`, and `setup` implementations.
- Rewired `src/routes/setup*.tsx` away from legacy `HmiShell` and into `EditorSetupExperience`.
- Added in-memory editor log observability through `src/lib/editor/log-stream.ts` and `errors.ts`.

## Verification

- Before: `scripts/check-editor-budgets.sh` was missing and `src/components/editor` did not exist.
- After: the budget runner reports `editor budgets green` and the preview exposes `I_UI_CANVAS_READY` in the status strip.
