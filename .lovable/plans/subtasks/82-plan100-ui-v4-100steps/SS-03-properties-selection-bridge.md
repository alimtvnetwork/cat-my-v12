---
Slug: properties-selection-bridge
Parent: 82-plan100-ui-v4-100steps
Status: pending
Created: 2026-07-19
---

# Properties Selection Bridge

## Goal

Fix issue #30: docked Properties panel reflects the currently selected shape.

## Approach

- Extract a `useSelectedRuleShape()` hook that returns `{ shape, kind, params, update }`
  from the rules store based on the current selection id.
- `PropertiesPalette.tsx` reads that hook (currently reads nothing → renders empty).
- Both docked panel and floating HUD read the same hook, so they stay in sync.
- Show a friendly empty state ONLY when selection is null; otherwise render the
  kind-specific pane (ROI / Rect / Circle / Text / Presence / Color / Math).
- Presence, Absence, Ignore, Color pickers rendered as a compact inline group at
  the top of the pane (per user request "besides the control").

## Verification

- Select a shape → docked Properties panel shows same content as HUD.
- Deselect → shows "Select a shape to edit its properties."
- Changing threshold in docked panel updates HUD and canvas, and vice versa.
