# Subtask 02: Architecture Spec Authoring & 100 Concrete Improvements Catalog

- **Subtask ID**: `sub-084313-task-02`
- **Parent Task**: `task-20261031084253-modern-design-layer-integration`
- **Owner**: Architecture & Spec Authoring Agent
- **Status**: COMPLETE
- **Spec Citations**:
  - `02-spec/21-app/83-modern-design-layer-integration/02-architecture-spec.md`
  - `02-spec/21-app/83-modern-design-layer-integration/03-100-modern-design-layer-improvements-spec.md`

---

## 1. Goal

Author the comprehensive architecture specification for the modern design layer integration and catalog EXACTLY 100 grounded, concrete engineering improvements across 5 categories to govern implementation and quality verification.

---

## 2. Key Architecture Specifications Produced

1. **Unified Layer Compositing Model**:
   - Camera/Background Layer (`z-index: 0`)
   - Region Overlays & Bounding Boxes (`z-index: 10`)
   - In-Canvas Floating Toolbars & Header Grips (`z-index: 20-30`)
   - Context Menus & Modal Dialogs (`z-index: 50+`)

2. **Pointer Capture Isolation & Bubbling Protocol**:
   - Container elements apply `pointer-events-none` to prevent accidental drag hijacking.
   - Interactive handles, header grips, and action buttons explicitly declare `pointer-events-auto` and call `stopPropagation()`.

3. **Collision-Aware Toolbar Mathematics**:
   - Dynamic boundary calculation:
     $$\text{topPct} = \begin{cases} \frac{y - 34}{\text{height}} \times 100 & \text{if } y \ge 34 \\ \frac{y}{\text{height}} \times 100 & \text{if } y < 34 \end{cases}$$
   - Prevents the toolbar from clipping against the canvas top viewport.

---

## 3. 100 Concrete Improvements Catalog Summary

The catalog in `03-100-modern-design-layer-improvements-spec.md` defines 100 concrete improvements (20 per category):

- **Category 1 (MOD-LAY-001 to MOD-LAY-020)**: Modern CAD Selection Handles & Header Grip Bar Physics.
  - White/slate handle styling, 6-dot matrix grip icons, edge resize snapping, aspect ratio locking, single active focus borders.
- **Category 2 (MOD-LAY-021 to MOD-LAY-040)**: In-Canvas Floating Toolbar Ergonomics & Action Buttons.
  - Lock toggles, Shape selectors (rect, square, circle), Mask overlays, Invert polarity, Crop template triggers, Opacity sliders.
- **Category 3 (MOD-LAY-041 to MOD-LAY-060)**: Photoshop Layer Panel Synchronization & Reordering.
  - Tab integration in `StandardToolPanel`, bi-directional state bridge, z-index elevation, visibility toggles, lock propagation.
- **Category 4 (MOD-LAY-061 to MOD-LAY-080)**: Drag-and-Drop Event Isolation & Interior Passthrough.
  - Elimination of whole-body pointer capture, sub-pixel click-to-focus, multi-touch pinch zoom safety, pointer cancel cleanup.
- **Category 5 (MOD-LAY-081 to MOD-LAY-100)**: Static Canvas Rendering, Sub-Pixel Alignment & High-DPI Hygiene.
  - Static mode handle drawing, High-DPI canvas scaling, crisp 1px borders, integer coordinate snapping, performance profiling.

---

## 4. Deliverables

- `02-spec/21-app/83-modern-design-layer-integration/02-architecture-spec.md`
- `02-spec/21-app/83-modern-design-layer-integration/03-100-modern-design-layer-improvements-spec.md`
- Architectural blueprint input for Subtask 03 and Subtask 04.
