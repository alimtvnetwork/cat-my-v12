# Subtask 08: Photoshop-Style Layers Panel for ROI & Pattern Hierarchy
# File: .ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/08-photoshop-layers-panel.md
# Reference Spec: 02-spec/21-app/04-vision-system-and-error-management-instructions/03-vision-roi-layers-and-telemetry-spec.md
# Status: PENDING

## 1. Problem Statement & Operational Context

In industrial inspection environments (evidenced by `JA4FdRFDSKi2` and `wL_7nmmUJQPh`), vision recipes comprise complex geometric stacks:
1. Physical reference container: ROI boundary (carrier tape pocket, IC body frame).
2. Orientation markers: Pin 1 fiducials, via holes, notch indicators.
3. Feature inspection elements: Solder pads, lead pitch arrays (up to 57 elements), laser markings.
4. Exclusion zones: Keep-out masks, reflective glare suppressors.

Operators currently have no visual layer stack to:
- Inspect z-index ordering and rendering precedence.
- Toggle visibility (`Eye` / `EyeOff`) to isolate individual pattern regions.
- Lock specific elements (`Lock` / `Unlock`) to avoid accidental dragging while adjusting adjacent features.
- Access standard layer management actions (`Bring to Front`, `Send to Back`, `Duplicate`, `Delete`).

The codebase contains an editor layer implementation in `src/components/editor/layers/LayersPanel.tsx` and `LayerRow.tsx`. This subtask adapts that foundation into a domain-specific `VisionLayersPanel` for the Vision Workbench.

---

## 2. Target File Manifest

- `src/components/vision/layers/types.ts`
- `src/components/vision/layers/VisionLayersPanel.tsx`
- `src/components/vision/layers/VisionLayerRow.tsx`
- `src/components/vision/layers/VisionLayersToolbar.tsx`
- `src/components/vision/layers/index.ts`
- `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`
- `src/components/vision/layers/__tests__/VisionLayersPanel.test.tsx`

---

## 3. Implementation Steps

### Step 3.1: Define Vision Layer Data Models & Types
In `src/components/vision/layers/types.ts`:
```typescript
export type VisionLayerKindType =
  | "roi-container"
  | "pattern-pin1"
  | "pattern-fiducial"
  | "pattern-body"
  | "pattern-lead"
  | "mask-exclusion";

export interface VisionLayerItem {
  id: string;
  name: string;
  kind: VisionLayerKindType;
  orderIndex: number;
  isLocked: boolean;
  isVisible: boolean;
  shapeType: "rectangle" | "circle" | "ring" | "square";
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  childrenIds?: string[];
}

export interface VisionLayersPanelProps {
  layers: readonly VisionLayerItem[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onRenameLayer: (id: string, nextName: string) => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onReorderLayers: (sourceIndex: number, targetIndex: number) => void;
  onBringToFront?: (id: string) => void;
  onSendToBack?: (id: string) => void;
}
```

### Step 3.2: Author `VisionLayerRow.tsx`
1. Adapt `src/components/editor/layers/LayerRow.tsx`:
   - Render drag handle icon (`GripVertical`).
   - Render layer kind icon:
     - `roi-container`: Red frame icon (`Square` in `text-rose-400`).
     - `pattern-pin1`: Target reticle icon (`Crosshair` in `text-cyan-400`).
     - `pattern-lead`: Grid/array icon (`ListFilter` in `text-amber-400`).
     - `mask-exclusion`: Slash circle icon (`Ban` in `text-purple-400`).
   - Inline editable title component for renaming.
   - Visibility toggle button: Renders `Eye` (slate-300) when visible, `EyeOff` (slate-600) when hidden.
   - Lock toggle button: Renders `Lock` (rose-400) when locked, `Unlock` (slate-500) when unlocked.
   - Context menu trigger on right click:
     - `Bring to Front`
     - `Send to Back`
     - `Move Up`
     - `Move Down`
     - `Duplicate Layer`
     - `Delete Layer`

### Step 3.3: Author `VisionLayersToolbar.tsx`
1. Top toolbar of the panel with action buttons:
   - **Add Pattern** (`Plus` icon with dropdown: Pin 1, Fiducial, Body, Mask).
   - **Delete Selected** (`Trash2` icon).
   - **Duplicate Selected** (`Copy` icon).
   - **Lock All / Unlock All** toggle.
   - **Show All / Hide All** toggle.

### Step 3.4: Author `VisionLayersPanel.tsx`
1. Render header and toolbar.
2. Render vertically stacked list of `VisionLayerRow` elements:
   - Root ROI layer pinned at the base of the list.
   - Nested child pattern layers indented slightly (`pl-4`).
3. Support HTML5 drag-and-drop reordering:
   - Update `orderIndex` on drop.
   - Reorder visual stack without mutating parent ROI anchor.

### Step 3.5: Bidirectional Sync with `VisualToolWorkpieceCanvas.tsx`
1. Pass `layers` and `selectedLayerId` to `VisualToolWorkpieceCanvas`.
2. When a layer is selected in `VisionLayersPanel`:
   - The canvas centers or highlights that element with a pulsing dashed bounding box.
3. When an operator clicks a pattern bounding box on the canvas:
   - `onSelectLayer(id)` fires, scrolling and selecting the corresponding row in `VisionLayersPanel`.
4. When a layer's `isVisible` is false:
   - `VisualToolWorkpieceCanvas` skips canvas rendering for that layer and excludes it from active inspection calculation.
5. When a layer's `isLocked` is true:
   - Pointer events on that canvas element are ignored, preventing accidental drag or resizing.

---

## 4. Acceptance Criteria & Verification Contracts

- [ ] **Layer Hierarchy Display**: Panel renders Root ROI Container at bottom and nested Pattern Search layers above it.
- [ ] **Visibility Toggle**: Clicking Eye icon hides pattern box from canvas; canvas redraws immediately without that layer.
- [ ] **Lock Toggle**: Locking a layer disables canvas dragging and corner resizing for that element.
- [ ] **Drag Reordering**: Dragging a layer up or down changes its z-index stacking order.
- [ ] **Right-Click Context Menu**: Right-clicking a layer row displays `Bring to Front`, `Send to Back`, `Duplicate`, and `Delete`.
- [ ] **Bidirectional Selection**: Canvas clicks highlight the layer in the panel; panel clicks highlight the box on the canvas.
- [ ] **Unit Tests**: Full test suite verifying row rendering, visibility toggle, lock toggle, and reorder dispatch.
