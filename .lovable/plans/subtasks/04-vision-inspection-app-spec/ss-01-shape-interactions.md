---
Title: SS-01 — Shape Drag / Resize / Rotate Interactions
Slug: ss-01-shape-interactions
Parent: .lovable/plans/pending/04-vision-inspection-app-spec.md
Plan-Step: 28
Status: Locked
---

# SS-01 — Shape Drag / Resize / Rotate Interactions

This subtask specifies the interactive behavior that implements 32-shape-model in the Rule Setup canvas. It is specification-only; no UI code is produced here.

## 1. Interaction Modes

| Mode               | Entry                         | Exit                        | Writes geometry?                |
| ------------------ | ----------------------------- | --------------------------- | ------------------------------- |
| `SELECT`           | Default / `V`                 | Tool change                 | No, unless drag/resize starts.  |
| `DRAW_RECTANGLE`   | Rectangle tool / `R`          | Pointer up or Esc           | Yes on valid size.              |
| `DRAW_ELLIPSE`     | Ellipse tool / `E`            | Pointer up or Esc           | Yes on valid radius.            |
| `DRAW_POLYGON`     | Polygon tool / `P`            | Enter, double-click, or Esc | Yes after closed valid polygon. |
| `DRAG_SHAPE`       | Pointer down on shape body    | Pointer up                  | Yes.                            |
| `RESIZE_SHAPE`     | Pointer down on handle        | Pointer up                  | Yes.                            |
| `ROTATE_RECTANGLE` | Pointer down on rotate handle | Pointer up                  | Yes for rectangle only.         |
| `PAN_VIEWPORT`     | Middle mouse or space+drag    | Pointer up                  | No; viewport-only state.        |

`FREEFORM_MASK` is deferred with AI-04 and must not write a v1 `Region.shapeKind`.

## 2. Pointer Coordinate Rules

- Every pointer event converts screen coordinates to image-space through the inverse `ImageToScreen` transform from 32 §3.
- Pointer capture starts on drag/resize/rotate and ends on pointer up/cancel.
- Preview geometry can be fractional while dragging, but committed geometry is rounded to integer pixels.
- Zoom and pan never affect committed coordinates.

## 3. Hit Testing Order

Highest priority wins:

1. Selected shape rotate handle.
2. Selected shape resize handles / polygon vertices.
3. Selected shape edge.
4. Selected shape fill.
5. Other active shape handles.
6. Other active shape edges.
7. Other active shape fill.
8. Empty canvas.

Minimum hit target = 8 CSS px, converted to image-space at current zoom. This keeps small ROIs editable at 40% zoom as seen in images 35–39.

## 4. Drawing

### 4.1 Rectangle

- Pointer down sets anchor corner.
- Pointer move previews `X`, `Y`, `Width`, `Height`.
- Holding Shift draws a square.
- Pointer up commits if both dimensions are at least 4 px; otherwise discard with `E_GEOMETRY_EMPTY`.

### 4.2 Ellipse

- Pointer down sets bounding-box anchor.
- Pointer move previews center/radius via the rectangle bounds.
- Holding Shift draws a circle.
- Pointer up commits if both radii are at least 2 px; otherwise discard with `E_GEOMETRY_EMPTY`.

### 4.3 Polygon

- Each click adds one vertex.
- Double-click or Enter closes the polygon.
- Esc cancels the in-progress polygon.
- Backspace removes the last point before close.
- Commit requires 3–64 points and no self-intersection.

## 5. Dragging

- Drag body moves the whole shape.
- Parent-region drag moves active children by the same delta.
- Child-region drag never moves the parent.
- If snap is enabled, commit rounds top-left / center / points to the 4 px grid.
- If drag would leave the image bounds, preview clamps at the edge and Save remains valid only if final geometry is in bounds.

## 6. Resizing

### 6.1 Rectangle

- Eight handles: N, NE, E, SE, S, SW, W, NW.
- Opposite edge/corner remains anchored.
- Shift preserves aspect ratio.
- Minimum committed size = 4 × 4 px.

### 6.2 Ellipse

- Eight handles operate on the ellipse bounding box.
- Center shifts only when a side/corner resize changes the bounding box asymmetrically.
- Shift preserves circular radius.
- Minimum committed radius = 2 px.

### 6.3 Polygon

- Vertex drag moves one point.
- Edge drag moves the two adjacent vertices together.
- Inserting a point on an edge is allowed via double-click on that edge.
- Deleting a vertex is allowed only when at least 3 points remain.

## 7. Rotation

- Rotation is enabled only for `RECTANGLE` in v1.
- Rotate handle sits above the rectangle's top edge in screen space.
- Pivot = rectangle center.
- Shift snaps angle to 15-degree increments.
- Commit normalizes angle to `-180 <= RotationDeg < 180`.
- Ellipse/polygon rotate controls are hidden, not disabled buttons.

## 8. Linked and Grouped Shapes

- Creating a parent/child link validates there is no cycle before the link is saved.
- Moving a parent preserves each child's stored offset.
- Moving an XY-linked child updates `OffsetX` / `OffsetY` if the new offset stays inside bounds.
- If the offset exceeds bounds, preview shows error state and commit is rejected with `E_GEOMETRY_LINK_BOUNDS`.

## 9. Undo / Redo Transactions

Each completed operation records one transaction in the Rule Setup 50-step ring buffer:

| Operation           | Transaction label             |
| ------------------- | ----------------------------- |
| Create shape        | `CreateRegion`                |
| Drag shape          | `MoveRegion`                  |
| Resize shape        | `ResizeRegion`                |
| Rotate rectangle    | `RotateRegion`                |
| Edit polygon point  | `EditPolygon`                 |
| Link / unlink group | `LinkRegion` / `UnlinkRegion` |

Preview movement during pointer move does not create transactions. Commit happens once on pointer up / Enter.

## 10. Keyboard Behavior

- Arrow keys nudge selected region by 1 px.
- Shift + arrow nudges by 10 px.
- Delete soft-deactivates selected region.
- Ctrl+D duplicates selected region with a +8 px X/Y offset.
- Ctrl+G groups selected regions under the first selected region.
- Ctrl+Z / Ctrl+Y use the same ring buffer as pointer operations.

Full accessibility and shortcut announcements are deferred to SS-02.

## 11. Observability Contract

Every committed geometry mutation emits a structured UI event and backend task log entry after Save:

| Event                       | Required context                                                            |
| --------------------------- | --------------------------------------------------------------------------- |
| `ShapeInteractionStarted`   | `taskId`, `regionId`, `mode`, `shapeKind`                                   |
| `ShapeInteractionCommitted` | `taskId`, `regionId`, `mode`, `beforeGeometrySha256`, `afterGeometrySha256` |
| `ShapeInteractionRejected`  | `taskId`, `regionId`, `mode`, `errorCode`, `imageSize`                      |

No interaction error may be silently swallowed. Rejected operations remain visible through inline canvas error state and task logs.

## 12. Acceptance Checklist

- Dragging at 40% zoom commits correct image-space integer coordinates.
- Rectangle, ellipse, and polygon all validate against image bounds.
- Parent movement moves active children without introducing link cycles.
- Rectangle rotation does not expose rotate controls for ellipse or polygon.
- Invalid geometry blocks Save and logs a typed error code.
- Undo/redo treats each pointer-up commit as one reversible operation.
