# Subtask 01: Research & Root Cause Analysis

- **Subtask ID**: `sub-084309-task-01`
- **Parent Task**: `task-20261031084253-modern-design-layer-integration`
- **Owner**: Research & RCA Agent
- **Status**: COMPLETE
- **Spec Citation**: `02-spec/21-app/83-modern-design-layer-integration/01-research-and-rca-spec.md`

---

## 1. Goal

Conduct a comprehensive investigation and 4-part Root Cause Analysis (RCA) comparing the modern Photoshop-style layers system with the standard ROI canvas overlay components. Uncover the root causes of interior pointer hijacking, visual aesthetic shortcomings of neon handles, lack of action buttons on in-canvas toolbars, and disconnected layer state.

---

## 2. Research Findings

### 2.1 Pointer Capture & Drag Hijacking in `RegionOverlay.tsx`
- **Finding**: In `src/components/vision/standard/RegionOverlay.tsx`, the outer `<div>` container binds `onPointerDown={handlePointerDown}`.
- **Root Cause**: Any click inside the bounding box of the ROI immediately calls `el.setPointerCapture(e.pointerId)` and initiates translation. Users attempting to click inside to inspect features, mask defects, or select sub-components accidentally drag the entire ROI.
- **Remedy**: Strip `onPointerDown` from the outer container and make the body non-capturing (`pointer-events-none`). Restrict dragging exclusively to a dedicated 20px top header grip bar (`pointer-events-auto`).

### 2.2 Aesthetic Deficiencies of Magenta Handles
- **Finding**: Handles in `RegionOverlay.tsx` are hardcoded to `#ff00ff` magenta 8x8 squares without border contrast or corner radius.
- **Root Cause**: Legacy debug styling was left in place. On dark carrier tape or bright solder leads, `#ff00ff` creates visual vibration and eye fatigue.
- **Remedy**: Adopt CAD/Photoshop standard: `8x8px` white squares (`#ffffff`) with a `1.5px` dark slate border (`#1e293b`), crisp box shadow, and hover scaling.

### 2.3 Passive Readout in `RoiToolbar.tsx`
- **Finding**: `RoiToolbar.tsx` merely renders `{label} • {width}×{height}`.
- **Root Cause**: The component was implemented as an informational HUD rather than a control strip.
- **Remedy**: Upgrade the toolbar into an interactive command strip with Lock toggle, Shape cycling (rect/square/circle), Mask overlay toggle, Invert polarity toggle, Crop template button, and Opacity adjustment slider.

### 2.4 Disconnected `PhotoshopLayersPanel.tsx`
- **Finding**: The rich layer management features in `PhotoshopLayersPanel.tsx` (reordering, opacity, visibility, locking) are isolated in white-box analysis and missing from `StandardPatternSearch.tsx`.
- **Root Cause**: `ToolTabs.tsx` only offers Search Region, Pattern Region, Extract Colors, and Image Enhance.
- **Remedy**: Add a 5th tab `"Layers"` in `ToolTabs.tsx` and mount `PhotoshopLayersPanel` in `StandardToolPanel.tsx` with live synchronization to the pattern search state.

### 2.5 Static Mode Handle Suppression in `PatternMatchCanvas.tsx`
- **Finding**: When simulation is idle, `PatternMatchCanvas.tsx` draws the search region with a dashed outline, but omits drawing resize handles and header bars on the 2D canvas.
- **Root Cause**: Canvas drawing code only drew `strokeRect` and skipped drawing the handle coordinate array.
- **Remedy**: Add explicit drawing routine for the 8 white/slate handles and top header grip bar in the canvas render loop.

---

## 3. Deliverables

- Detailed comparative matrix in `02-spec/21-app/83-modern-design-layer-integration/01-research-and-rca-spec.md`.
- Formal 4-part RCA documentation covering event capture, aesthetics, toolbar controls, and state bridging.
- Input data feeding Subtask 02 (Architecture & 100 Improvements) and Subtask 03/04 (Implementation).
