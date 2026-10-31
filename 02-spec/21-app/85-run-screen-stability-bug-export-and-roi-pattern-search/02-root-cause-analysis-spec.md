# 02 - Root Cause Analysis (4-Part RCA): Run Screen Glitch, ROI Distortion & Canvas Pan

- **Specification ID**: `SPEC-85-02`
- **Module**: `AppRuntime / InspectionCanvas / BugRecorder`
- **Date**: 2026-10-31

---

## 1. Issue 1: Continuous Screen Flickering and Glitching on Run Page

### 1.1 Symptoms & Error Evidence
- Live Run view (`src/routes/run.tsx`) continuously flickers, with frame content flashing asynchronously and UI buttons stuttering.
- Browser paint cycles thrash at 5–10 Hz, causing high CPU consumption and dropped UI interaction events.

### 1.2 Root Cause
- **Double Interval Cascade**: `src/routes/run.tsx:243` ran a 500ms wall-clock interval updating `setNow(Date.now())` that forced top-level component re-renders, while lines 287–368 executed a second 100–200ms frame interval.
- **Image Remount DOM Churn**: Line 294 called `setReferenceImage(sample.url)` on every tick without checking if the URL changed. In `MachineFrame.tsx:14–25`, this triggered state changes that caused `<img>` element unmounting and re-decoding.

### 1.3 Fix & Validation
- Gated `setReferenceImage` to fire only when `sample.url !== getReferenceImage()`.
- Added `decoding="async"`, smooth opacity transitions, and eliminated DOM recreation in `MachineFrame.tsx`.

---

## 2. Issue 2: ROI Auto-Squaring & Shape Distortion

### 2.1 Symptoms & Error Evidence
- When an operator dragged or resized a rectangular Region of Interest (e.g. 526×441 Caliper Search Region), the box snapped back into a square (`width === height`).
- Circle ROIs stretched into non-circular ellipses, and regular polygons distorted.

### 2.2 Root Cause
- **Hardcoded `isSquareROI: true`**: In `StandardWorkbenchCanvas.tsx:50`, `useCanvasPointerDrag` was called with `isSquareROI: true` unconditionally across all tools.
- **Unconditional `squareSearchRegion`**: In `usePatternMatchingRule.ts` (lines 40, 89, 114, 144, 153, 342), incoming geometries were forcefully squared regardless of shape.
- **Reactive Re-squaring Loop**: In `VisualToolWorkpieceCanvas.tsx:1574–1577`, an effect triggered `pinPatternRule` whenever `roi.width !== roi.height` and `shapeType === "square"`, creating a feedback loop during user drag.

### 2.3 Fix & Validation
- Made `isSquareROI` dynamic (`props.isSquareROI ?? (props.shape === "square")`) in `StandardWorkbenchCanvas.tsx`.
- Gated `squareSearchRegion` strictly behind `shapeType === "square"`.
- Locked 1:1 aspect ratio on Circle (`width = height = diameter`) using `ctx.arc(cx, cy, r)` with uniform radius `r = Math.min(rx, ry)`.

---

## 3. Issue 3: Inability to Move Canvas and Top-of-Screen Drag Click Trap

### 3.1 Symptoms & Error Evidence
- Operators could not pan the workpiece canvas when zoomed in.
- Operators could not drag an ROI box by clicking inside it; they were forced to click exclusively on the top header grip bar at the top edge of the screen.

### 3.2 Root Cause
- **Pointer Events Disabled on Body**: `RegionOverlay.tsx:164` explicitly set `pointerEvents: "none"` on the entire ROI bounding body, leaving only the 20px header bar at `-top-5` interactive.
- **Missing Viewport Pan State**: `VisualToolWorkpieceCanvas.tsx` implemented zoom via CSS `transform: scale(zoomLevel)` with no `panX` or `panY` coordinate offsets.

### 3.3 Fix & Validation
- Added interior draggable zone with `pointerEvents: "auto"` in `RegionOverlay.tsx` when ROI is selected and unlocked.
- Implemented `panX, panY` with space-drag, middle-click, and gesture handlers in `VisualToolWorkpieceCanvas.tsx`.

---

## 4. Issue 4: Single-Export Bug Recorder & Undefined Backend Persistence

### 4.1 Symptoms & Error Evidence
- Bug Recorder only offered a single "Export ZIP" button. Operators on local test benches could not save snapshots directly to disk or generate formatted AI prompts.
- Calling `POST /bug-reports/local` failed with `NameError: name 'Path' is not defined` and `NameError: name 'json'`, and `snap.get("dataUri")` failed to extract `dataUrl`.

### 4.2 Root Cause
- `BE/routes/bug_reports.py` lacked top-level imports for `Path` and `json`.
- Missing route alias `@router.post("/save-local")`.
- Frontend store emitted screenshots as `dataUrl`, while backend only checked `dataUri`.

### 4.3 Fix & Validation
- Added top-level imports `import json`, `import base64`, `from pathlib import Path`, `import uuid`.
- Registered `@router.post("/save-local")` alongside `@router.post("/local")`.
- Emitted Antigravity-compliant prompts formatted with `@[file;.logs/recorded-bugs/<id>/screenshots/<file_name>.png]`.
- Implemented the 4-action dropdown in `RecorderFloatingHud.tsx` and `RecorderExportModal.tsx`.
