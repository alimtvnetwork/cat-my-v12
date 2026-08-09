# SS-09 — Issue 30: docked Properties panel wired

Version: v3.776.0
Date: 2026-07-19
Parent: `.lovable/plans/pending/84-next-20-onboarding-and-pending-drive.md`
Step: 9 of 20

## Root cause (one sentence)

`EditorShell` passed only `{ tools, rules }` to `PanelHost.content`, so the
registered `properties` panel rendered PanelHost's "No content wired"
placeholder and never subscribed to `useRulesStore`.

## Fix

- New: `src/components/editor/shell/DockedPropertiesPanel.tsx` (store
  bridge → pure `PropertiesPanel`, logs `[docked-properties] selection`).
- Edit: `src/components/editor/shell/EditorShell.tsx` — import + wire
  `properties: <DockedPropertiesPanel />` into the content map.

No changes to `PropertiesPanel`, HUD, or stores.

## Verification

Playwright at `/setup/roi` opened Properties via Window menu with the
seeded ROI already selected. `f2_props.png` shows Name/Kind/X/Y/W/H
populated. Console: `[docked-properties] selection {count: 1, firstId: r1}`
fires. Zero `No content wired` placeholders.

## Deltas

- Issue 30: OPEN → CLOSED. Open issue count 8 → 7 (16, 27, 28, 31, 32, 33, 34).
- Plan 83 backlog item 3: DONE.
- Steps 10 (HUD re-anchor) and 16 (X/Y badge polish) now share a proven
  selection-bridge pattern.
