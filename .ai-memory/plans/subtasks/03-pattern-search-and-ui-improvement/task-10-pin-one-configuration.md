# Task 10 — Pin-one configuration

Slug: pattern-search-and-ui-improvement - Task 10

Status: PENDING (spec done, fix not started).

## Spec

Spec file 02 §9 (pin-one), §3 (single threshold).

## Scope

- Finish pin-one focus-area configuration end to end: detect, persist,
  re-evaluate.
- Persist holes as relative % plus absolute centers plus angle, in one
  record; angle datum selectable.
- Fold thresholdLuma into the single threshold setting.
- Stop the carrier-tape evaluator from short-circuiting Rule 2 silently;
  log the skip; surface Rule 1 FAIL vs Rule 2 not-run distinctly.
- Share one luma helper between pin-one canvas, detector, and evaluator.
- Validate circularity and threshold inputs at entry, not at evaluation.

## File box (disjoint)

`src/components/vision/standard/tools/pin1-config/*`,
`BE/app/domain/pin1_detection.py`,
`src/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/carrier-tape-evaluator.ts`
(Rule 1 section only, coordinated with the simulation worker). Shares
only the luma helper and region parsing — no other overlap.

## Acceptance

- [ ] Pin-one configuration round-trips: configure, save, reload,
  re-evaluate with identical results.
- [ ] Rule 1 and Rule 2 outcomes reported distinctly.
- [ ] No silent Rule 2 skip.
