---
Parent: 30-app-ui-rule-editor-revamp
Slug: canvas-interaction-model
Status: pending
Created: 2026-07-14
---

# SS-02 — Canvas interaction model

Rules for the full-bleed image workspace and the drawing/selection/manipulation states. Anchors `spec/24-app-ui-design-system/04-rule-editor/02-canvas.md`.

## States

`idle` → `drawing` → `placed` → `selected` → `editing-geometry` → `idle`

- `idle`: pointer is a crosshair over the image, hand over shapes.
- `drawing`: user is dragging out a rect/circle or clicking polygon vertices; ESC cancels, Enter commits (polygon only).
- `placed`: shape just committed, panel auto-opens, focus lands on Name field.
- `selected`: shape has 8 resize handles + a rotation handle; arrow keys nudge 1px, Shift+arrow nudges 10px.
- `editing-geometry`: drag handles resize; ESC reverts, Enter commits.

## Coordinate system

Store shape geometry in image-space normalized to `[0, 1]` on both axes so pan/zoom and image resize do not mutate rule data. Convert to canvas pixels only in the render layer.

## Zoom + pan

- Wheel = zoom to cursor (0.25× to 8×).
- Space + drag = pan.
- `F` = fit to viewport. `1` = 100%.
- Zoom/pan state is view-only and NOT persisted with the rule set.

## Hit testing

- Rect/circle hit-test uses shape bounds inflated by 4 CSS px for easier grab.
- Polygon hit-test uses winding rule; vertices hit-test 6 CSS px.
- Overlapping shapes: top-most `zIndex` wins on click; Alt+click cycles through the stack under the cursor.

## Keyboard

| Key                               | Action             |
| --------------------------------- | ------------------ |
| `V`                               | Select tool        |
| `R`                               | Rectangle          |
| `O`                               | Circle             |
| `P`                               | Polygon            |
| `Del` / `Backspace`               | Delete selected    |
| `Ctrl/Cmd+D`                      | Duplicate selected |
| `Ctrl/Cmd+Z` / `Shift+Ctrl/Cmd+Z` | Undo / Redo        |
| `L`                               | Toggle lock        |
| `H`                               | Toggle visibility  |

## Accessibility

- Every shape is a focusable element with `role="group"` and `aria-label` = the rule name.
- Drawing mode announces "Drawing rectangle. Drag to size, ESC to cancel." via `aria-live=polite`.
- Panel focus trap on open; Escape closes and returns focus to the shape.

## Performance budget

- Interaction frame budget ≤ 16 ms with up to 200 rules on screen.
- Shape rendering uses a single `<svg>` layer over the image; do not create one `<canvas>` per shape.
- Panel open/close animation ≤ 200 ms; obey `prefers-reduced-motion`.
