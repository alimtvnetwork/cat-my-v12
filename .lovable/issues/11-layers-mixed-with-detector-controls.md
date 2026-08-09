# Issue 11: Rule Editor Layers list is mixed with detector-specific controls

Status: closed
Closed-by: Plan 75
Closed-on: 2026-07-18
Created: 2026-07-15
Reported-by: user (verbal, Plan 30 turn)

## Symptom

The right rail (`src/components/editor/rail/RightRail.tsx` + `RuleList.tsx`,
`CircleRuleEditor.tsx`, etc.) presents "layers" (rules) and the selected
rule's detector configuration in the same stacked column. Selecting a
circle rule injects circle-detector controls into what should read as a
Photoshop-style layers panel.

## Expected (per user)

- A "Layers" panel behaves like Photoshop's Layers panel: reorderable list,
  visibility toggle, lock, group, drag-and-drop to reorder or merge.
- Detector/property controls for the selected layer live in a SEPARATE
  panel (Properties/Inspector), not inside the layers list.
- Multiple rules can be selected and joined/grouped into a compound rule
  (analogous to Photoshop "Merge shapes" / "Group").

## Actual

- Layers list and detector form share the RightRail column, causing the
  overlap the user calls "circular detector in the layers".
- No drag-to-reorder, no group/merge, no visibility/lock toggle.

## Related files

- `src/components/editor/rail/RightRail.tsx`
- `src/components/editor/rail/RuleList.tsx`, `RuleRow.tsx`
- `src/components/editor/rail/CircleRuleEditor.tsx` (and sibling
  `Rect`/`Ocr`/`Text`/`Math` editors)
- `src/components/editor/panels/*` (target home for the extracted Inspector)
