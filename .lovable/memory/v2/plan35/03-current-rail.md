# Plan 35 current rail inventory (read-phase)

Version: v3.208.0
Verified via `ls src/components/editor/{rail,panels}`.

## `src/components/editor/rail/` (per-type editors, to migrate)

- `RightRail.tsx` - top-level right column. Props include `rules`, `selectedIds`,
  `onSelect`, `onToggleHidden`, `onToggleLocked`, `onReorder(id, "up"|"down")`,
  `onUpdateParams`, `onImportRules(rules, groups?)`. `onReorder` is the current
  callsite that the new drag-and-drop path (step 10) must preserve or replace.
- `CircleRuleEditor.tsx`, `RectRuleEditor.tsx`, `OcrRuleEditor.tsx`,
  `TextRuleEditor.tsx`, `MathRuleEditor.tsx` - per-kind editors. Step 13 moves
  these to `src/components/editor/properties/editors/` unchanged.
- `RuleSetIOBar.tsx` - import/export bar; keep intact per step 15.
- `RuleList.tsx` / `RuleRow.tsx` are NOT currently present in this folder (they
  were slated for deletion in step 15). Update the plan expectation: step 15 is
  a no-op for those two files; nothing to delete.
- `index.ts` - barrel re-exports.

## `src/components/editor/panels/` (property panels, to reuse)

Already contains the per-controller panels used by Plan 32:
`AcceptancePanel`, `BlobPanel`, `ColorPanel`, `FocusPanel`, `LightingDrawer`,
`MaskPanel`, `NumberPanel`, `PatternEdgePanel`, `ReferenceAssetPanel`, plus
`resolver.tsx` and `index.ts`. Step 12's PropertiesPanel should feed into this
resolver, not create a parallel dispatch.

## Consequences for the Plan 35 write-phase

- Do NOT re-migrate per-controller panels; they already live in `panels/`.
- Only the five per-kind rule editors (CircleRuleEditor, RectRuleEditor, etc.)
  are in `rail/` and need moving under `properties/editors/`.
- Update the plan step 15 expectation: `RuleList.tsx` and `RuleRow.tsx` do not
  exist in this repo; step 15 becomes a verification step, not a deletion.
