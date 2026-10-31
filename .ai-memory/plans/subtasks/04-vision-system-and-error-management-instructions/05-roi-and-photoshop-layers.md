# Subtask Execution Plan: ROI Hierarchy, Multi-Shape Patterns & Photoshop Layers Panel
# File: .ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/05-roi-and-photoshop-layers.md
# Slug: roi-and-photoshop-layers
# Status: COMPLETED
# Batch Size: 7 files (Bounded Micro-Batch 5–8 Files)

## 1. Subtask Overview & Metadata

| Metadata Field | Subtask Detail |
| :--- | :--- |
| **Subtask ID** | `SUBTASK-VISION-05-ROI-LAYERS` |
| **Parent Plan** | `.ai-memory/plans/pending/04-vision-system-and-error-management-instructions.md` |
| **Related Spec** | `02-spec/21-app/04-vision-system-and-error-management-instructions/05-roi-layers-and-grayscale-spec.md` |
| **Evidence Citations** | `assets/screenshots/JA4FdRFDSKi2_20261031_014811.png`, `assets/vision-system-pictures-11Aug/vision-inspection-grid-roi-2.jpg`, `assets/screenshots/wL_7nmmUJQPh_20261031_014811.png` |
| **Boolean Standard** | Strict positive booleans only (`isLocked`, `isSelected`, `isVisible`, `hasHeaderGrip`, `hasActiveHandles`) |

### Objective

Deliver a precision Region of Interest (ROI) locking mechanism, multi-shape geometry tools (Rectangle, Square, Circle, Polygon), dense pattern sequential numbering `[1..N]` (supporting 50+ inspection sites), and a comprehensive Photoshop-style Layers panel with z-index reordering and context menu controls.

---

## 2. Bounded Micro-Batch Target Matrix (7 Files)

| Index | Target File Path | Primary Architectural Responsibility |
| :--- | :--- | :--- |
| 1 | `src/lib/vision/types.ts` | Define `RoiRegionState`, `PatternShape`, `LayerItem`, and geometry contracts with positive booleans. |
| 2 | `src/lib/vision/store.ts` | Implement store actions for ROI lock/unlock, layer stacking, reordering, and pattern indexing. |
| 3 | `src/components/vision/RoiSelector.tsx` | Implement default locked state, double-click unlock, corner-only resize, and header grip handle. |
| 4 | `src/components/vision/PinConsistencyTool.tsx` | Implement Pin 1 multi-shape selection toolbar (Rectangle, Square, Circle, Polygon) with icons. |
| 5 | `src/components/vision/PatternConfigTool.tsx` | Implement dense pattern search inside ROI with sequential numbering `1..N` and reading-order sort. |
| 6 | `src/components/vision/layers/PhotoshopLayersPanel.tsx` | Author new Photoshop-style Layers panel with color swatches, visibility/lock toggles, and z-index controls. |
| 7 | `src/components/vision/RuleDrawingOverlay.tsx` | Render canvas ROI bounds, numbered pattern badges, and handle right-click context actions. |

---

## 3. Step-by-Step Implementation Breakdown

### Step 1: Types & Data Contract Extension (`src/lib/vision/types.ts`)
- Export `VisionShapeType = "rectangle" | "square" | "circle" | "polygon"`.
- Define `RoiRegionState` with `isLocked`, `isSelected`, `hasActiveHandles`, and `hasHeaderGrip`.
- Define `PatternShape` polymorphic union covering Rectangle, Square, Circle, and Polygon.
- Define `LayerItem` with `zIndex`, `colorSwatch`, `isVisible`, `isLocked`, and `isSelected`.

### Step 2: Store Actions for ROI Lock & Layer Manipulation (`src/lib/vision/store.ts`)
- Add state slice: `isRoiLocked: boolean`, `layers: LayerItem[]`, `activeLayerId: string | null`.
- Add actions:
  - `toggleRoiLock(segmentId: string, isLocked?: boolean): void`
  - `updateRoiBounds(segmentId: string, bounds: Partial<RoiRegionState>): void`
  - `bringLayerToFront(layerId: string): void`
  - `sendLayerToBack(layerId: string): void`
  - `moveLayerUp(layerId: string): void`
  - `moveLayerDown(layerId: string): void`
  - `toggleLayerVisibility(layerId: string): void`
  - `toggleLayerLock(layerId: string): void`
  - `renumberPatterns(roiId: string): void`

### Step 3: ROI Locking, Double-Click & Header Grip (`src/components/vision/RoiSelector.tsx`)
- Enforce `isLocked: true` by default on mount.
- Add `onDoubleClick` handler on the ROI outline to toggle `isLocked: false` and render corner handles.
- Render corner handles strictly at `nw`, `ne`, `se`, `sw`; neutralize edge clicks to prevent accidental stretching.
- Mount top header grip bar (`h-5`, `w-full`, `cursor-grab`) with `GripHorizontal` icon for translation without resizing.
- Listen for `Escape`, `Enter`, or outside clicks to restore `isLocked: true`.

### Step 4: Multi-Shape Primitives & Icon Toolbar (`src/components/vision/PinConsistencyTool.tsx`)
- Add shape selection button group with Lucide icons (`Square`, `BoxSelect`, `Circle`, `Pentagon`).
- Bind active tool state to `activeShapeType`.
- Support hotkeys `R` (Rectangle), `S` (Square), `C` (Circle), `P` (Polygon).
- Update property inspector to render geometry-specific inputs (Radius & Circularity for Circle; Width/Height/Angle for Rectangle; Vertices for Polygon).

### Step 5: Sequential Pattern Numbering `[1..N]` (`src/components/vision/PatternConfigTool.tsx`)
- Implement sequential numeric tagging `[1..N]` for all child pattern items inside the active ROI.
- Integrate reading-order topological sorter (`sortPatternsByReadingOrder`) clustering lines within 12px vertical tolerance.
- Ensure performant state updates when handling 50+ pattern items (`JA4FdRFDSKi2_20261031_014811.png`).
- Provide bulk tools: `"Auto-Number All"`, `"Clear All in ROI"`, `"Invert Selection"`.

### Step 6: Photoshop-Style Layers Panel (`src/components/vision/layers/PhotoshopLayersPanel.tsx`)
- Author component rendering layer stack with semantic color swatches (Cyan for ROI, Violet for Pin 1, Crimson for Patterns, Slate for Workpiece).
- Render per-row controls: Eye icon for `isVisible`, Padlock icon for `isLocked`, and selection highlight.
- Render footer action toolbar: `Bring to Front`, `Send to Back`, `Move Up`, `Move Down`, and `Delete Layer`.
- Synchronize layer selection bidirectionally with canvas selection.

### Step 7: Canvas Overlay & Context Menu Actions (`src/components/vision/RuleDrawingOverlay.tsx`)
- Render zoom-invariant numeric badges at the top-left corner of each pattern box.
- Attach Radix UI Context Menu to canvas shapes:
  - `Bring to Front` (`Ctrl + Shift + ]`)
  - `Send to Back` (`Ctrl + Shift + [`)
  - `Move Up` (`Ctrl + ]`)
  - `Move Down` (`Ctrl + [`)
  - `Lock / Unlock Layer` (`Ctrl + L`)
  - `Hide / Show Layer` (`Ctrl + H`)
  - `Duplicate Pattern` (`Ctrl + D`)
  - `Delete Pattern` (`Delete`)

---

## 4. Interface & Contract Definitions

```typescript
// Shared Layer Contract
export interface LayerItem {
  id: string;
  name: string;
  layerType: "workpiece" | "roi" | "pattern" | "mask";
  shapeType?: "rectangle" | "square" | "circle" | "polygon";
  sequenceNumber?: number;
  zIndex: number;
  colorSwatch: string;
  isVisible: boolean;
  isLocked: boolean;
  isSelected: boolean;
}

// ROI State Contract
export interface RoiRegionState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shiftTolerancePx: number;
  isLocked: boolean;
  isSelected: boolean;
  hasActiveHandles: boolean;
  hasHeaderGrip: boolean;
}
```

---

## 5. Acceptance Criteria & Automated Verification Matrix

| Verification ID | Component / File | Verification Condition | Target Result |
| :--- | :--- | :--- | :--- |
| `VERIF-ROI-01` | `RoiSelector.tsx` | Verify ROI mounts with `isLocked === true`. | Passed |
| `VERIF-ROI-02` | `RoiSelector.tsx` | Double-click unlocks ROI and displays 4 corner handles (`nw`, `ne`, `se`, `sw`). | Passed |
| `VERIF-ROI-03` | `RoiSelector.tsx` | Dragging header grip translates position without resizing dimensions. | Passed |
| `VERIF-ROI-04` | `RoiSelector.tsx` | Outside click or `Escape` key restores `isLocked === true`. | Passed |
| `VERIF-SHAPE-01`| `PinConsistencyTool.tsx` | Toolbar switches between Rectangle, Square, Circle, and Polygon tools. | Passed |
| `VERIF-SHAPE-02`| `PinConsistencyTool.tsx` | Circle tool calculates valid circularity score and radius. | Passed |
| `VERIF-NUM-01` | `PatternConfigTool.tsx` | 50+ patterns inside ROI receive consecutive numbers `1..57` without gaps. | Passed |
| `VERIF-LAYER-01`| `PhotoshopLayersPanel.tsx` | Layers panel lists all items with color swatches, lock, and visibility badges. | Passed |
| `VERIF-LAYER-02`| `PhotoshopLayersPanel.tsx` | `Bring to Front` and `Send to Back` reorder z-index stacking accurately. | Passed |
| `VERIF-OVER-01` | `RuleDrawingOverlay.tsx` | Right-click context menu executes layer reordering and duplication. | Passed |
