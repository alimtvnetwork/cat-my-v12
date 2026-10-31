# Task 03 — Layers, selection, validation

Slug: pattern-search-and-ui-improvement - Task 03

Status: PENDING (spec done, fix not started).

## Spec

Spec file 02 §5.3, spec file 03 §8, spec file 05 (layering
possibilities 1–200).

## Scope

- Diagnose, do not blindly rewire: LayersPanel IS wired at its production
  usage (InspectorSurface.tsx:296). Suspects are DnD behavior, the
  simulation's local treeRules (add/delete only, no reorder), and
  mask-region reorder.
- Scope ordering rules per surface: editor index 0 = bottom, mask slots
  index 0 = top. Never merge the two conventions.
- Hidden-panel dead ends gain a visible restore path; stale persisted
  layout resets with one operator action.
- Mask reorder in BoxReviewPanel; sim treeRules reorder or an explicit
  no-reorder decision.

## File box (disjoint)

`src/components/editor/layers/*`, `src/hooks/editor/useLayerDnd.ts`
(diagnose), `src/components/vision/white-box/BoxReviewPanel.tsx`
(mask-region reorder). No evaluator math. Coordinate (do not co-edit)
`src/lib/workspace/layout-slice.ts` and `panel-registry.ts` (other panel
system) and `BE/app/installer_path.py` (02-cicd-remediation).

## Acceptance

- [ ] Layer move/create/rectangle/region creation works in simulation and
  in the pattern tools, with a reproduction for each previously failing
  case.
- [ ] Ordering rules documented per surface and honored in code.
- [ ] No hidden panel without a restore path.
