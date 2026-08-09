---
title: Step 12 - Create ToolTile primitive
parent: 31-plan-02-remaining-hmi-primitives
status: complete
date: 2026-07-15
---

# ToolTile primitive

Root cause: SS-03 inventory lists `ToolTile.tsx` as required, but `src/components/hmi/` had no such file, blocking setup.tsx migration (Step 22).

## Files read

- `src/components/hmi/index.ts:1-14` (exports).
- `src/components/hmi/ToolRibbon.tsx:1-17` (container styling and role).
- `.lovable/plans/subtasks/02-control-automation-redesign/ss-03-component-inventory.md` (state vocabulary: selected → `bg-ca-select`).
- `src/styles.css:75,180` (`--color-ca-select` and `--ca-select` OKLCH values).

## Changes

- Created `src/components/hmi/ToolTile.tsx`: forwardRef button, `48 | 56 | 64` px sizes, `selected` uses `bg-ca-select text-white`, unselected uses `bg-ca-panel-2 text-ca-text`, focus uses `hmi-focus-ring`, disabled uses `opacity-50 cursor-not-allowed`, `aria-pressed` reflects selection.

## Deferred

- Export added in Step 13.
- Consumed by Step 22 (`src/routes/setup.tsx`).

## Next

Step 13: append `ToolTile` export to `src/components/hmi/index.ts`.
