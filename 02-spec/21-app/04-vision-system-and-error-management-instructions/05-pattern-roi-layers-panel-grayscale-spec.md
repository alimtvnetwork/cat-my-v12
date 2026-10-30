# Pattern Search, ROI Hierarchy, Layers Panel & Grayscale Thresholding Specification
# Directory: 02-spec/21-app/04-vision-system-and-error-management-instructions/05-pattern-roi-layers-panel-grayscale-spec.md
# Status: draft

## 1. Region of Interest (ROI) & Nested Pattern Architecture

### 1.1 ROI Lock State & Double-Click Physics
- In industrial vision inspection, the primary Region of Interest (ROI) defines the inspection field (e.g. carrier tape pocket, component perimeter).
- **Default Locked State**: Once defined, the ROI enters an immutable locked state (`isLocked: true`). Direct clicks or drag gestures inside the canvas will NOT move or resize the ROI box. This prevents accidental corruption of the inspection boundary while drawing or tuning nested patterns.
- **Double-Click Unlock**: Double-clicking directly on the ROI frame unlocks it (`isLocked: false`), exposing draggable corner and edge transform handles (`nw`, `ne`, `se`, `sw`).
- Clicking outside the ROI or pressing `Escape` or `Enter` re-locks the ROI box.

### 1.2 Multi-Shape Pattern Primitives (Pin 1 & Pattern Search)
- Nested inside the ROI, operators define one or more Pattern Searches (e.g. Pin 1 orientation fiducials, IC package markings, leads, solder joints).
- Support 3 geometry primitives selectable via modern icon buttons:
  1. **Rectangle**: Configurable width `w`, height `h`, and rotation angle `θ`.
  2. **Square**: Constrained 1:1 aspect ratio.
  3. **Circle**: Center `(cx, cy)` with radius `r` and minimum circularity threshold.
- Each pattern element is automatically assigned a sequential numeric identifier (e.g. `[1]`, `[2]`, `[3]` ... `[57]`), reproducing the proven ergonomics of the ICOS inspection architecture (`JA4FdRFDSKi2`).

---

## 2. Photoshop-Style Layers Panel

### 2.1 Layer Stacking & Visual Hierarchy
To provide fluid control over multiple overlapping visual elements, the workspace includes a dedicated **Layers Panel** positioned in the left/right inspection rail:
- **Layer Representation**:
  - Layer 0 (Base): Inspection Workpiece Image.
  - Layer 1 (Anchor): Region of Interest (ROI) with lock badge.
  - Layer 2..N: Pattern Searches (Pin 1, Greyscale Pattern Matching, Mark, Data Matrix).
- **Interactive Layer Controls**:
  - **Visibility Toggle (Eye icon)**: Shows/hides layer on canvas.
  - **Lock Toggle (Padlock icon)**: Prevents accidental dragging/editing.
  - **Z-Index Reordering**: Drag-and-drop layer reordering in the list.
- **Context Menu Actions (Right-Click on Canvas or Layer)**:
  - `Bring to Front` (elevates to highest z-index).
  - `Send to Back` (drops to lowest pattern z-index above ROI).
  - `Move Up` / `Move Down`.
  - `Lock Layer` / `Unlock Layer`.
  - `Delete Layer`.

---

## 3. High-Contrast Grayscale Preprocessing & Binary Bit Reduction

### 3.1 Pixel Contrast Adjustment Pipeline
When tuning pattern recognition or reading printed text/leads on dark IC bodies:
- Raw greyscale transformation alone is insufficient due to low contrast between dark plastic packaging and laser markings.
- The Grayscale configuration tool applies a dynamic contrast stretch:
  - Pixels below the low threshold are clamped to darker values (`v -> 0`).
  - Pixels above the high threshold are boosted to brighter values (`v -> 255`).
- **Binary Bit Reduction**: Under binary threshold mode, the continuous 8-bit greyscale (0–255) is reduced to a 1-bit black/white mask. This cleanly exposes text characters (`A1234 B5678`), fiducial circular holes, and lead edges without noise artifacts (`rzcoeqtbFB8l`, `9qwZWqYiKV95`).

---

## 4. Live Camera & Source Dropdown Remediation (`bg2jMNWxHjkn`)

### 4.1 Root Cause & Solution
- In `src/components/vision/workpiece/AnalyzeImageToolbar.tsx`, the dropdown menu was rendered as an absolute `div` inside a parent container with `overflow-hidden`.
- When opened, the dropdown menu was partially obscured and clipped by the canvas container below.
- **Fix**: Re-implement the dropdown using Radix UI `DropdownMenu` / `Popover` with a Portal (`DropdownMenuPortal`), rendering the menu at the root DOM level with `z-[9999]`, completely eliminating any clipping from parent containers.
