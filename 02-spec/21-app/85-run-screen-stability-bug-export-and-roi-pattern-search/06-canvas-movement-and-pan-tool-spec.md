# 06 - Canvas Movement & Viewport Pan Mechanics Specification

- **Specification ID**: `SPEC-85-06`
- **Module**: `AppRuntime / InspectionCanvas / Navigation`
- **Status**: Verified Specification
- **Date**: 2026-10-31

---

## 1. Executive Summary

Operators configuring high-precision optical inspection recipes must freely pan, zoom, and reposition regions of interest across the entire canvas without artificial interaction barriers. Previously:
1. `RegionOverlay.tsx` set `pointerEvents: "none"` across the entire ROI interior, forcing operators to click solely on a 20px header bar floating above the screen.
2. `VisualToolWorkpieceCanvas.tsx` only supported CSS scaling (`transform: scale(...)`), providing zero viewport panning when zoomed in.

This specification establishes the interactive navigation standard for workpiece inspection.

---

## 2. Interaction Model & Mechanics

### 2.1 Interior Draggable ROI Zone (`RegionOverlay.tsx`)
- **Body Pointer Events**: When an ROI is active/selected and not locked, the interior bounding box enables `pointer-events-auto` with `cursor-move`.
- **Drag Dispatch**: Clicking and dragging anywhere within the ROI bounding box translates `(x, y)` coordinates smoothly in real-time.
- **Lock Protection**: When `isLocked: true`, pointer events on the body are disabled (`pointer-events-none`) to prevent accidental repositioning during inspection runs.

### 2.2 2D Viewport Pan Engine (`VisualToolWorkpieceCanvas.tsx`)
- **State Tuple**: `pan = { x: number, y: number }` stored in local component state.
- **Input Triggers**:
  - `Middle Click (Button 1) + Drag`: Unconditional viewport pan.
  - `Spacebar + Left Click (Button 0) + Drag`: Standard CAD panning.
  - `Touch / Trackpad 2-Finger Pan`: Natural scroll delta mapping.
- **Canvas Transform**: Applied uniformly before rendering:
  ```css
  transform: translate(${panX}px, ${panY}px) scale(${zoomLevel});
  transform-origin: 0 0;
  ```
- **Coordinate Inverse Mapping**: Mouse event `(clientX, clientY)` to canvas image space accounts for both scale and pan offset:
  $$\text{imageX} = \frac{\text{clientX} - \text{rect.left} - \text{panX}}{\text{zoomLevel} \times \text{scaleX}}$$
  $$\text{imageY} = \frac{\text{clientY} - \text{rect.top} - \text{panY}}{\text{zoomLevel} \times \text{scaleY}}$$
- **Reset Trigger**: Pressing `0` or clicking `Fit to Screen` resets `panX = 0, panY = 0, zoomLevel = 1.0`.
