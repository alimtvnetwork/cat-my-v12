---
title: Reference-image wireframe sanity check (plan 30 step 34)
slug: wireframe-sanity-check
plan: 30
step: 34
status: locked
---

# Reference-image wireframe sanity check

## Purpose

Confirm that the locked spec layout matches the supplied reference image
before step 35 tags v1.0. Text-only specs can drift from the intended
visual density; this pass anchors each region of the spec to the reference
frame and records any deltas as explicit decisions.

## Regions checked

Reference image is divided into five regions. Each row lists the reference
intent, the spec anchor, and the decision.

| #    | Region                      | Reference intent                                                                                         | Spec anchor                                            | Decision                                                                         |
| ---- | --------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| W-01 | Top bar                     | Left: program name + dirty dot. Center: run state chip. Right: user + settings. Height ~48 px.           | `02-shell.md` top bar tokens                           | Match. No change.                                                                |
| W-02 | Tool ribbon (left)          | Vertical column of kind chips C/R/K/S/E, 40 px squares, 8 px gap, active chip filled.                    | `02-shell.md` + `_notes/kind-picker-keyboard-model.md` | Match. Ribbon order is authoritative in the keyboard-model note.                 |
| W-03 | Canvas                      | Fills remaining space. Bottom-left origin badge, top-right zoom badge, rulers optional (off by default). | `03-canvas.md` + `_notes/canvas-geometry-boundary.md`  | Match. Rulers stay off by default; toggle lives in view menu (step 65).          |
| W-04 | Right rail (rule inspector) | Fixed 320 px width. Sections in order: Kind, Shape, Params, Thresholds, Notes. Collapsible.              | `04-rule-layers.md` + `05-rule-controller.md`          | Match. Section order locked; collapse state is not persisted (step 84 decision). |
| W-05 | Status strip (bottom)       | Height ~28 px. Left: last log code. Center: FPS. Right: undo depth + save state.                         | `02-shell.md` + `07-errors-logging.md`                 | Match. FPS is dev-only surface behind `?debug=fps`.                              |

## Density budget

Reference image density check (informational, not a hard gate):

- Top bar text: 13 px semibold.
- Ribbon labels: hidden (icon-only), 11 px tooltip on hover after 500 ms.
- Right rail labels: 12 px medium, values 13 px regular.
- Status strip: 11 px monospace for codes.

These are consistent with `_notes/typography-size-tokens.md`; no token
changes required.

## Deltas

None. The reference image and the locked spec agree on all five regions.

## Regression guard

Step 100 visual snapshot gate (`vis.spec.ts`) MUST capture at minimum one
snapshot per region W-01..W-05 at the 1440x900 breakpoint. If any snapshot
drifts more than 2 % pixel delta from the golden, the offending region
must be reconciled here before the snapshot is re-baselined.

## Decision

Wireframe alignment confirmed. Step 34 closes with zero spec content
changes. Step 35 may proceed to the spec done checklist.
