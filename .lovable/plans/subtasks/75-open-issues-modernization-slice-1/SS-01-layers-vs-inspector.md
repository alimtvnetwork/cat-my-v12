# SS-01: Split layers list from detector-specific controls

Slug: layers-vs-inspector
Parent: 75-open-issues-modernization-slice-1
Status: pending
Created: 2026-07-18

## Problem

`RightRail.tsx` stacks the rules/layers list and the selected rule's detector form in one column, so selecting a circle rule injects circle-detector controls into what should read as a Photoshop-style layers panel (see `.lovable/issues/11-layers-mixed-with-detector-controls.md`).

## Approach

1. Introduce `InspectorPanel` at `src/components/editor/panels/InspectorPanel.tsx` that renders the correct detector editor for the selected rule kind.
2. Reduce `LayersPanel.tsx` / `RuleList.tsx` to pure layers UX (reorder, visibility, lock, group, selection).
3. `RightRail.tsx` renders only Layers; Inspector docks as its own registry entry (right-side default), floatable via the existing panel system.
4. Preserve current keyboard shortcuts and selection store; no business logic change.

## Files

- `src/components/editor/rail/RightRail.tsx`
- `src/components/editor/rail/RuleList.tsx`, `RuleRow.tsx`
- `src/components/editor/rail/CircleRuleEditor.tsx` and siblings
- `src/components/editor/panels/InspectorPanel.tsx` (new)
- `src/lib/editor/panel-registry.ts`

## Verification

- Vitest: layers panel snapshot has zero detector fields; inspector renders detector fields for the selected rule kind.
- Playwright: select a circle rule, confirm Layers list stays clean and Inspector shows circle controls.
