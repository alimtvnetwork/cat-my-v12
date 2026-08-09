# SS-01 - Layers panel (Photoshop-style)

Slug: layers-panel
Parent: 35-ui-ux-photoshop-layers-overhaul
Status: pending
Created: 2026-07-15

## Scope

New `src/components/editor/layers/LayersPanel.tsx` (+ `LayerRow.tsx`,
`useLayerDnd.ts`). Renders the rule list as reorderable rows. Each row
shows: visibility eye toggle, lock toggle, colored type badge (rect,
circle, ocr, text, math, blob), name (inline-editable), and a chevron
for group expand/collapse.

## Contracts

- Data source: existing rules-slice (`src/lib/rules-slice.ts`).
- Selection: writes to rules-slice `selectedIds: string[]` (multi).
- Reorder: emits `reorder(sourceId, targetId, position: "before"|"after"|"into")`;
  `"into"` is only valid when target is a group (creates group otherwise
  via SS-03).
- No detector form imports. LayersPanel does not know about circle/rect.

## Failure/error rules

- Every reorder wraps store mutation in try/catch; on failure log
  `layers.reorder_failed` with `{sourceId, targetId, position, code}`
  and surface a toast; never swallow.
- Drag from empty list = no-op, no error.

## Files

- New: `src/components/editor/layers/{LayersPanel,LayerRow,useLayerDnd}.tsx`
- New: `src/components/editor/layers/index.ts`
- Edited: `src/components/editor/rail/RightRail.tsx` (removes RuleList, mounts LayersPanel on the left column of the new 2-panel rail; see SS-02)
