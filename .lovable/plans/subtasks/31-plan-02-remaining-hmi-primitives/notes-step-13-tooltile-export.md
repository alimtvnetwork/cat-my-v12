---
title: Step 13 - Export ToolTile primitive
parent: 31-plan-02-remaining-hmi-primitives
status: complete
date: 2026-07-15
---

# ToolTile barrel export

Root cause: `ToolTile.tsx` existed, but `src/components/hmi/index.ts` did not export it, so setup migration work could not import the primitive through the HMI barrel.

## Files read

- `.lovable/coding-guidelines/coding-guidelines.md:1-51`.
- `spec/coding-guidelines/typescript.md:1-51`.
- `.lovable/memory/index.md:1-44`.
- `.lovable/memory/01-code-red.md:1-40`.
- `.lovable/memory/04-design-system.md:1-25`.
- `.lovable/memory/07-lovable-folder-guide.md:1-60`.
- `.lovable/plans/pending/31-plan-02-remaining-hmi-primitives.md:43-46`.
- `src/components/hmi/index.ts:1-15`.
- `src/components/hmi/ToolTile.tsx:1-48`.

## Change

- Added `ToolTile` and `ToolTileProps` to the HMI barrel exports.

## Verification

- Before: `src/components/hmi/index.ts:1-15` exported `ToolRibbon`, then `Viewport`, with no `ToolTile` export.
- After: `src/components/hmi/index.ts` exports `ToolTile` from `./ToolTile`.

## Next

Step 14: create `src/components/hmi/RunButton.tsx` primitive.
