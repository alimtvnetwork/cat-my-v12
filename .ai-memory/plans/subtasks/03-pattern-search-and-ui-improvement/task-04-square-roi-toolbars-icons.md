# Task 04 — Square ROI plus toolbars and icons

Slug: pattern-search-and-ui-improvement - Task 04

Status: PARTIAL — wave 4 toolbar half diff-verified 31-Oct-26 (toolbar rendered in greyscale + sim tools, zoom plumbed + clamp reconciled to 5–800, viewModes mapped, shape buttons/outlines session-only, SQUA is not square enforcement, RegionOverlay untouched); square ROI enforcement still BLOCKED on user scope answer. BLOCKED on one open
question: square ROI scope (see below).

## Spec

Spec file 03 §9 (square ROI), §10 (toolbars/icons/colour mapping),
§11 (preview idioms).

## Scope

- Square ROI: implement the square-lock mechanism, but wire its scope
  only after the open question is answered — search region, pattern
  region, masks, or all three; enforced at draw, resize, or validation.
  Until then, record scope as open; do not present squareness as an
  existing invariant.
- Toolbars/icons: the image toolbar exists only in StandardPatternSearch
  and StandardToolShell today — extend its presence to the greyscale and
  simulation tools, including shape buttons (RECT/SQUA/CIRC/POLY) inside
  the ROI editing surface.
- Adopt the adjudicated ROI colour mapping (file 03 §10.2) for the
  pattern-search screen and state what it supersedes.

## File box (disjoint)

`src/components/vision/standard/RegionOverlay.tsx` (square lock only),
`src/components/vision/WhiteBoxMarkingTool.tsx` and
`src/components/vision/standard/tools/StandardGreyscaleSimulationTool.tsx`
(toolbar gap only). No evaluator math.

## Acceptance

- [ ] Square ROI scope answered in writing, then enforced at the stated
  point (draw/resize/validation).
- [ ] Toolbar and shape buttons present in greyscale and simulation tools.
- [ ] One colour mapping on the pattern screen; conflicting docs noted.
