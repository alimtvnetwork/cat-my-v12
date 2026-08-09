# 03 — Canvas

**Version:** 1.0 (draft)  
**Owner:** Plan 30  
**Depends on:** `01-foundations.md`  
**Deep dive:** `../../.lovable/plans/subtasks/30-app-ui-rule-editor-revamp/ss-02-canvas-interaction-model.md`

---

## Purpose

Define the full-bleed image workspace and every user interaction on it: view controls (zoom / pan / fit), drawing tools (rect / circle / polygon), selection, and shape manipulation (move / resize / rotate). Impl steps 61–70 build this file.

---

## View

- Layout: single `<img>` under one overlay `<svg>` layer, both `position: absolute; inset: 0` inside the workspace grid cell. No scrollbars, `overflow: hidden`, background `--canvas-bg`.
- Coordinate spaces: **image-space** (px on the source image) is the store's source of truth; **canvas-space** (viewport px) is only for rendering. `src/lib/editor/coords.ts` converts.
- Zoom range: 0.25× – 8×. Wheel = zoom-to-cursor. `Ctrl/Cmd + 0` = fit. `1` = 100%. `F` = fit. Zoom multiplier: 1.1 per wheel notch.
- Pan: `Space` + drag (cursor changes to `grab` / `grabbing`). Middle-mouse drag also pans. Arrow keys without selection pan by 16 image-space px.
- View state (zoom, pan) is NOT persisted; fit-on-load every route entry.

## Drawing tools

| Tool      | Shortcut | Gesture                                           | Commit                                   | Cancel                                                |
| --------- | -------- | ------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------- |
| Select    | `V`      | click / marquee                                   | —                                        | —                                                     |
| Rectangle | `R`      | drag-out from origin to opposite corner           | mouseup with ≥ 4 image-px on each axis   | ESC or < 4 px on either axis                          |
| Circle    | `C`      | drag-out from center to radius                    | mouseup with radius ≥ 3 image-px         | ESC                                                   |
| Polygon   | `P`      | click each vertex; live segment preview to cursor | `Enter` or double-click (min 3 vertices) | `ESC` or right-click; `Backspace` removes last vertex |

While drawing, all selection is cleared. On commit, the new shape is auto-selected and the tool reverts to `Select` (single-shot). Hold `Shift` to keep the current tool active for multiple shapes.

Polygon drawing announces vertex count via `aria-live="polite"` ("vertex 3 added"). Every `addRule` dispatches one structured log line with `correlation_id` (see `07-errors-logging.md`).

## Selection

- Single click on a shape: select it, focus canvas.
- Marquee: click-drag on empty space. Fully-enclosed shapes select; Alt+marquee toggles.
- Alt+click on overlapping shapes: cycle through stack (topmost → next), announce active shape name.
- `Ctrl/Cmd+A`: select all unlocked visible shapes.
- `ESC`: clear selection, revert active tool to Select.
- Selected shapes render `--rule-selected`; hover on non-selected renders `--rule-hover`; idle `--rule-idle`; validation-failing `--rule-error`.

## Manipulation

- Move: drag body of selected shape. Arrow keys nudge by 1 image-px; `Shift+Arrow` by 10 px.
- Resize: 8 handles (4 corners, 4 edges). Corner handles resize both axes; edge handles resize one. `Shift` while resizing preserves aspect ratio. Handles are 10 canvas-px squares, always the same size regardless of zoom.
- Rotate: single handle above the top edge at 24 canvas-px offset. `Shift` snaps to 15° increments. Rotation stored in radians in image-space.
- `ESC` mid-drag reverts to the pre-drag geometry (state snapshot taken on mousedown).
- `Enter` commits explicitly (no-op if already committed on mouseup).

Drag operations coalesce into a single undo entry (see `06-state-persistence.md`).

## Hit-testing

- Rectangle: axis-aligned in local (post-rotation) space, tolerance 4 canvas-px.
- Circle: distance-from-center ≤ radius + 4 canvas-px.
- Polygon: even-odd fill test with an outward 4 canvas-px inflation.
- Impl: `src/lib/editor/hit-test.ts` (step 62), pure, no DOM, unit-tested (step 93).
- Boundary: `src/lib/editor/coords.ts` and `src/lib/editor/hit-test.ts` expose the only geometry API the canvas, store, and tests may call. The API is stable so a future WASM kernel can replace internals without changing callers.

```ts
type GeometryPoint = { x: number; y: number };
type GeometryBBox = { x: number; y: number; width: number; height: number };
type HitTarget = { shapeId: string; part: "Body" | "Vertex" | "Handle" | "Rotate" };
type GeometryIssue = { shapeId: string; code: "Degenerate" | "OutOfBounds" | "InvalidNumber" };

imageToCanvas(point: GeometryPoint, view: CanvasView): GeometryPoint;
canvasToImage(point: GeometryPoint, view: CanvasView): GeometryPoint;
bbox(shape: RuleShape): GeometryBBox;
nearestVertex(point: GeometryPoint, shape: RuleShape, toleranceCanvasPx: number): HitTarget | null;
hitTest(point: GeometryPoint, shapes: RuleShape[], view: CanvasView): HitTarget | null;
validateShape(shape: RuleShape): GeometryIssue[];
```

- The geometry layer is deterministic: no DOM reads, no React imports, no store imports, no Date/random, and no logging inside pure helpers.
- Observability sits at the caller boundary. A non-empty `validateShape` result logs `W_UI_RULE_INVALID` with `shapeId`, `code`, and `correlation_id`; load or render failures still use `E_UI_CANVAS_LOAD` per `07-errors-logging.md`.

## Cursors

| State                   | Cursor                                                                           |
| ----------------------- | -------------------------------------------------------------------------------- |
| Select tool over empty  | `default`                                                                        |
| Select tool over shape  | `move`                                                                           |
| Select tool over handle | `nwse-resize` / `nesw-resize` / `ns-resize` / `ew-resize` / `crosshair` (rotate) |
| Rect / Circle tool      | `crosshair`                                                                      |
| Polygon tool            | `crosshair` + segment-preview line                                               |
| Space held              | `grab` / `grabbing` while dragging                                               |

## Performance budget

- 200 shapes rendered on the overlay must sustain ≤ 16 ms per frame during a drag (plan step 95).
- Wheel-zoom throttled to `requestAnimationFrame`; pointer-move batched.
- Overlay uses a single `<svg>` with keyed `<g>` per shape; no per-shape event listeners (delegate at the SVG root).

## Acceptance

| #    | Interaction                     | Expected                                 |
| ---- | ------------------------------- | ---------------------------------------- |
| C-1  | Wheel over shape at 1×          | Zoom to cursor, shape stays under cursor |
| C-2  | `F` at any zoom                 | Image fits workspace, centered           |
| C-3  | Rect drag-out < 4 px            | Nothing created                          |
| C-4  | Polygon `ESC` mid-draw          | No shape, no log line dropped            |
| C-5  | Alt-click on stack              | Cycles + `aria-live` announcement        |
| C-6  | `Shift`+resize                  | Aspect ratio preserved                   |
| C-7  | `ESC` mid-resize                | Geometry reverts to pre-drag snapshot    |
| C-8  | 200 shapes, drag one            | Per-frame ≤ 16 ms (plan step 95)         |
| C-9  | Wheel zoom to 8× and 0.25×      | Clamped, no jitter                       |
| C-10 | Polygon `Enter` with 2 vertices | No commit, focus stays in draw mode      |

Each row above must correspond to a Playwright / unit test in `08-testing.md`.
