# Subtask 07: Pattern Pin 1 Configuration, Shape Tooling & ROI Container Locking
# File: .ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/07-pattern-pin1-shape-tools-and-roi-lock.md
# Reference Spec: 02-spec/21-app/04-vision-system-and-error-management-instructions/03-vision-roi-layers-and-telemetry-spec.md
# Status: COMPLETED

## 1. Problem Statement & Root Cause

1. **Instant Fiducial Teleportation (`wXoDp20hMNwJ`, `j21Xbgbsy6bB`)**:
   - In `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx` lines 2161–2191:
     ```typescript
     const isInsideSearchArea =
       x >= roi.x - 20 &&
       x <= roi.x + roi.width + 20 &&
       y >= roi.y - 20 &&
       y <= roi.y + roi.height + 20;

     if (isInsideSearchArea) {
       onUpdateParams({
         ...toolParams,
         pin1Config: { ...pin1Config, centerX: x, centerY: y },
       });
       return;
     }
     ```
   - Clicking anywhere inside or within 20px of the search area unconditionally teleports the Pin 1 fiducial marker to the cursor. This corrupts rule positions during standard clicking, inspecting, or panning operations.

2. **Accidental 1x1 Region Destruction**:
   - In `src/components/vision/white-box/useCanvasPointerDrag.ts`:
     - Line 20: `handlePointerDown` sets `searchRegion` to `{ x: point.x, y: point.y, width: 1, height: 1 }`.
     - Line 49: `handlePointerUp` checks `region.width > 1 && region.height > 1 ? region : null`.
     - A simple click without a drag resets the active `searchRegion` to `null`, causing the search boundary to vanish unexpectedly.

3. **Missing Shape Ribbon in Pin1 Tooling**:
   - `src/components/vision/standard/tools/pin1-config/Pin1MarkingTool.tsx` lacks shape selection controls. The operator cannot toggle between Rectangle, Circle, and Ring geometries when marking IC orientations or via holes.

4. **Unanchored ROI Container (`JA4FdRFDSKi2`, `wL_7nmmUJQPh`, `9qwZWqYiKV95`)**:
   - In `VisualToolWorkpieceCanvas.tsx` lines 2216–2228, clicking inside the ROI initiates `isMovingRoi = true`, dragging the entire container and displacing nested pattern search elements outside the target component.
   - Per production inspection standards (`JA4FdRFDSKi2`), the ROI container must default to a locked boundary, unlocking only upon deliberate double-click.

---

## 2. Target File Manifest

- `src/components/vision/standard/tools/pin1-config/Pin1MarkingTool.tsx`
- `src/components/vision/standard/tools/pin1-config/Pin1Canvas.tsx`
- `src/components/vision/standard/tools/pin1-config/types.ts`
- `src/components/vision/standard/tools/pin1-config/usePin1Rule.ts`
- `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- `src/components/vision/white-box/useCanvasPointerDrag.ts`
- `src/components/vision/white-box/types.ts`

---

## 3. Implementation Steps

### Step 3.1: Shape Ribbon in `Pin1MarkingTool.tsx`
1. Define shape types in `src/components/vision/standard/tools/pin1-config/types.ts`:
   ```typescript
   export type Pin1ShapeType = "rectangle" | "circle" | "ring" | "square";
   ```
2. In `Pin1MarkingTool.tsx`, author a top-left canvas toolbar ribbon with buttons for:
   - **Rectangle** (`Square` icon)
   - **Circle** (`Circle` icon)
   - **Ring** (`Disc` icon)
   - **Square** (`Ratio` icon)
3. Connect button clicks to `model.setShapeType(shape)`. Apply active state styling (`bg-cyan-500/20 text-cyan-300 border-cyan-400`).
4. Pass `shapeType` to `Pin1Canvas` and render corresponding geometry (concentric dual rings for Ring, radius circles for Circle, standard bounding box for Rectangle).

### Step 3.2: Eliminate Instant Fiducial Teleportation in `VisualToolWorkpieceCanvas.tsx`
1. Remove unconditional fiducial assignment on empty-space clicks within `isInsideSearchArea`.
2. Guard Pin 1 movement behind:
   - **Direct Handle Drag**: Cursor must hit the central crosshair reticle (`Math.hypot(x - currentPin1X, y - currentPin1Y) <= 18`).
   - **Explicit Placement Tool**: A dedicated "Map Reticle" tool button in the canvas action slot must be active (`isPin1PlacingMode === true`).
3. If clicking empty space inside the ROI when `isPin1PlacingMode === false`, do NOT reposition Pin 1.

### Step 3.3: Fix 1x1 Dot Destruction in `useCanvasPointerDrag.ts`
1. Track drag displacement distance from initial pointer down:
   ```typescript
   const dragDistance = Math.hypot(point.x - dragState.start.x, point.y - dragState.start.y);
   ```
2. On `handlePointerDown`, do not overwrite an existing `searchRegion` with a 1x1 box. Only create a draft region when dragging starts.
3. On `handlePointerUp`, if `dragDistance < 4`, preserve the existing `searchRegion` unchanged without setting it to `null`.

### Step 3.4: Implement ROI Container Locking
1. In `VisualToolWorkpieceCanvas.tsx`, introduce default locked state:
   ```typescript
   const [isRoiLocked, setIsRoiLocked] = useState<boolean>(true);
   ```
2. When `isRoiLocked === true`:
   - Stroke ROI boundary with `rgba(239, 68, 68, 0.95)` (`border-rose-500`), solid 2px line.
   - Display HUD badge: `LOCKED ROI [Double-click to unlock]`.
   - Disable corner resize handles and suppress container body dragging.
   - Allow clicks and drags to pass through to child pattern search objects.
3. When double-clicking on the ROI border (`handleDoubleClick`):
   - Toggle `isRoiLocked = !isRoiLocked`.
   - When unlocked: Stroke ROI with cyan dashed line (`rgba(6, 182, 212, 0.95)`), enable 4 corner resize handles.
   - Pressing `Escape` or double-clicking again immediately re-locks the ROI.

### Step 3.5: Support Numbered Child Pattern Objects (1..N Hierarchy)
1. Ensure nested pattern search objects inside the ROI maintain independent relative coordinates:
   $x_{rel} = x - \text{roi}.x$, $y_{rel} = y - \text{roi}.y$.
2. Moving or resizing a child pattern object must NEVER modify the parent `roi` dimensions.
3. Display sequential index numbers (`#1`, `#2`, ..., `#57`) on child pattern labels matching the ICOS inspection layout in evidence `JA4FdRFDSKi2`.

---

## 4. Acceptance Criteria & Verification Contracts

- [ ] **Shape Selection**: Clicking `Rectangle`, `Circle`, or `Ring` in `Pin1MarkingTool` switches active geometry and updates canvas rendering.
- [ ] **No Teleportation**: Clicking empty space inside `roi` does not move the Pin 1 reticle crosshair.
- [ ] **Preserved Region**: Single-clicking inside `useCanvasPointerDrag` without dragging leaves the existing `searchRegion` intact.
- [ ] **ROI Lock Stability**: Moving child pattern search boxes inside a locked ROI does not displace the parent ROI boundary.
- [ ] **Double-Click Unlock**: Double-clicking the ROI boundary toggles lock state and reveals corner resize handles.
