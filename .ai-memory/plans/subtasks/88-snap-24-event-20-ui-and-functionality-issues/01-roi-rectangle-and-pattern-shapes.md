# Subtask 01: ROI Rectangle Enforcement & Pattern Search Shapes

- **Parent Task**: Task 88 (`snap-24-event-20-ui-and-functionality-issues`)
- **Subtask ID**: Subtask-01
- **Owner**: Subtask Worker 1
- **Status**: COMPLETED
- **Specification Reference**: [`02-spec/21-app/88-snap-24-event-20-ui-and-functionality-issues/01-roi-rectangle-and-pattern-shapes-spec.md`](file;02-spec/21-app/88-snap-24-event-20-ui-and-functionality-issues/01-roi-rectangle-and-pattern-shapes-spec.md)
- **Target Files Owned**:
  - `src/components/vision/workpiece/RuleRightToolbarPanel.tsx`
  - `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
  - `src/lib/editor/types.ts`

---

## 1. Executive Summary & Objective

Enforce machine vision Region of Interest (ROI) invariants across CAT iVISION:
1. **ROI is Always Rectangular**: The search region (ROI) must strictly be an axis-aligned bounding box defined by $(x, y, w, h)$ with unconstrained aspect ratio freedom ($\frac{w}{h}$). Auto-squaring width and height when selecting shapes is banned.
2. **Decouple ROI from Pattern Geometry**: Remove the "Region Shape" selector from the ROI card in `RuleRightToolbarPanel.tsx` and place shape selection (`rectangle`, `square`, `circle`, `polygon`) exclusively under Pattern Search (`T102`) tool parameters.
3. **Rectangular Canvas Rendering**: Ensure `VisualToolWorkpieceCanvas.tsx` renders the outer search boundary strictly as an axis-aligned rectangle with top header grip, while isolating circles and polygons to the interior pattern template visualization.

---

## 2. Step-by-Step Implementation Milestones

### Milestone 1.1: Audit & Eliminate Auto-Squaring in `RuleRightToolbarPanel.tsx`
- **Target File**: `src/components/vision/workpiece/RuleRightToolbarPanel.tsx`
- **Action**:
  - In `handleRoiCommit`, remove `const isSquare = String(rule.params?.shapeType ?? "") === "square";` and the ternary forcing `width: side, height: side`.
  - Ensure updating `width` or `height` updates only the specified dimension without mutating the other.
  - In `handleParamChange`, remove `isSquareShape` side effects that clamped `width` and `height` to a square.
- **Verification**: Changing width to 800 and height to 120 in the input inputs preserves $800 \times 120$ without auto-squaring.

### Milestone 1.2: Remove "Region Shape" Selector from ROI Card and Relocate to Pattern Search Parameters
- **Target File**: `src/components/vision/workpiece/RuleRightToolbarPanel.tsx`
- **Action**:
  - Delete the `Region Shape` grid and shape-specific sliders from the `Region of Interest (ROI)` card.
  - Relocate the shape selector button group (`rectangle`, `square`, `circle`, `polygon`) into the `isPatternRule` parameter block under `Tool Parameters`.
  - Retain `circleDiameter`, `circularityTolerance`, and `polygonVertexCount` controls under the Pattern Search tool section.
- **Verification**: The ROI card displays only X, Y, Width, and Height. The Pattern Search section displays pattern shape controls.

### Milestone 1.3: Enforce Rectangular ROI Boundary Canvas Rendering
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Action**:
  - In both multi-rule rendering (`idx < rulesToRender.length`) and single-rule fallback rendering (`rulesToRender.length === 0`), replace conditional `drawCircleWithHandles` and `drawPolygonWithVertices` on the outer search boundary with `ctx.strokeRect` and `ctx.fillRect`.
  - Draw the top 20px header grip bar (`drawRoiHeaderGrip`) and corner handles (`drawCornerHandles`) on the rectangular bounds.
  - Ensure pattern-specific shape drawing is executed inside `drawGreyscaleSimulationPatternOverlay` or specific tool feature layers.
- **Verification**: Rules with `shapeType: "circle"` or `polygon` display a rectangular ROI search boundary with dashed cyan border and top header grip.

### Milestone 1.4: Remove Shape Squaring Constraint During Corner Handle Drag
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Action**:
  - In `handlePointerMove`, locate corner handle resizing logic (`activeCornerHandle === "se" | "nw" | "ne" | "sw"`).
  - Delete the block:
    ```typescript
    if (shapeType === "square" || shapeType === "circle" || shapeType === "polygon") {
      const maxSide = Math.min(naturalW - nextRoi.x, naturalH - nextRoi.y);
      const side = Math.max(16, Math.min(maxSide, Math.max(nextRoi.width, nextRoi.height)));
      nextRoi.width = side;
      nextRoi.height = side;
    }
    ```
  - Permit completely free rectangular aspect ratio expansion and contraction.
- **Verification**: Dragging the SE corner handle on any rule resizes width and height independently.

### Milestone 1.5: Verification & Anti-Asset Compliance
- **Action**:
  - Run TypeScript compile check on modified files.
  - Verify that no screenshots or images are copied into `src/assets/`.
  - Verify that all coding guidelines (strict boolean naming `is`/`has`, no loose >2-3 parameters, vertical line gaps) are strictly maintained.

---

## 3. Risk Analysis & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Existing saved rulesets have `shapeType: "circle"` in `params` | Minor UI regression if tools expected circular search boundary | Pattern search algorithms inspect pixels within the bounding box using the circular mask from `params.shapeType`; bounding box remains rectangular. |
| User inputs invalid numeric dimensions | Canvas rendering crash | `Math.max(4, parsed)` safeguards minimum dimensions; fallback to previous valid state if `isNaN`. |
| Loss of circular reticle visualization for Pin 1 | Pin 1 verification failure | Pin 1 uses dedicated reticle rendering (`drawPin1Reticle`) inside the rectangular search area, unaffected by ROI boundary. |
