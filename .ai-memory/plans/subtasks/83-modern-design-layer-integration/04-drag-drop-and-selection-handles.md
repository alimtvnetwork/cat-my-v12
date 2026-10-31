# Subtask 04: Interactive Drag-and-Drop, ROI Selection Handles & Transform Controls

- **Subtask ID**: `sub-084325-task-04`
- **Parent Task**: `task-20261031084253-modern-design-layer-integration`
- **Owner**: UI Controls & Transform Handles Agent
- **Status**: PENDING
- **Spec Citations**:
  - `02-spec/21-app/83-modern-design-layer-integration/04-implementation-guide-spec.md` (Sections 3.1 & 3.4)

---

## 1. Goal

Upgrade `RegionOverlay.tsx` with professional CAD-grade white/slate selection handles and a 20px header grip bar featuring a 6-dot matrix icon, eliminate interior pointer event hijacking, implement single active focus state, and fix static mode handle rendering on the canvas in `PatternMatchCanvas.tsx`.

---

## 2. Engineering Tasks

### 2.1 Upgrade `RegionOverlay.tsx`
- **White/Slate Handles**:
  - Replace garish `#ff00ff` magenta handles with crisp `8x8px` white squares (`#ffffff`) surrounded by a `1.5px` dark slate border (`#1e293b`).
  - Add hover scaling (`hover:scale-125`) for visual responsiveness.
- **20px Header Grip Bar**:
  - Render an anchored header grip bar (`h-[20px] bg-slate-900/90 border border-slate-700/80 rounded-t`) atop the active ROI.
  - Embed a 6-dot matrix icon (`GripHorizontal` from `lucide-react`) and ROI dimension badge (`{width}×{height}`).
  - Confine pointer dragging strictly to this header grip bar.
- **Eliminate Interior Drag Hijacking**:
  - Remove `onPointerDown={handlePointerDown}` from the main ROI bounding box `<div>`.
  - Apply `pointer-events-none` to the container body to allow transparent click-through or drawing of exclusion masks inside the ROI without moving the ROI container.
- **Single Active Focus**:
  - Accept `isActive?: boolean` prop.
  - Render transformation handles and header grip bar exclusively when `isActive === true`.
  - Display solid border when active and dashed border when inactive.

### 2.2 Fix Static Mode Handle Drawing in `PatternMatchCanvas.tsx`
- In static view mode (`isSimulating === false`), ensure the 2D canvas drawing routine renders:
  1. The 8 resize handles (`nw`, `n`, `ne`, `e`, `se`, `s`, `sw`, `w`) with white fill and dark slate borders.
  2. The 20px header grip bar at `region.y - 20` with the 6-dot matrix icon.
  3. The yellow dashed region boundary and dimension text callout.

---

## 3. Files Touched

- `src/components/vision/standard/RegionOverlay.tsx`
- `src/components/vision/standard/tools/pattern-matching/PatternMatchCanvas.tsx`
- `src/components/vision/white-box/pattern-geometry.ts`

---

## 4. Verification Criteria

1. **Grip Bar Translation**: Clicking and dragging the 20px header grip bar smoothly translates the ROI across the viewport.
2. **Interior Drag Isolation**: Clicking and dragging inside the ROI bounding box does NOT translate the ROI.
3. **Handle Aesthetics**: 8 handles render as clean white squares with slate borders and scale on hover.
4. **Static Canvas Parity**: In static image inspection mode, `PatternMatchCanvas` visibly draws all 8 handles and the header grip bar.
5. **Quality Gates**: `pnpm exec tsc --noEmit` clean pass, zero lint regressions, positive boolean naming standard satisfied.
