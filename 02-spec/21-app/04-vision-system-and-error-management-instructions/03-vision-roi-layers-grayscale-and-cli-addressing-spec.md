# Specification: Vision ROI, Layers Panel, Grayscale Bit-Reduction & CLI Addressing

**Module:** Vision System & Error Management Instructions  
**Specification File:** `02-spec/21-app/04-vision-system-and-error-management-instructions/03-vision-roi-layers-grayscale-and-cli-addressing-spec.md`  
**Status:** Ready for Implementation  
**Version:** 1.0.0  
**Target Repository:** `cat-my`  

---

## 1. Executive Summary & Context

This specification establishes the technical architecture, mathematical algorithms, component contracts, and verification criteria for four interconnected vision subsystem capabilities:

1. **Pattern Pin 1 Configuration & 8-Handle Shape Tools**: Eliminating pointerdown reticle jumping, enforcing drag-distance thresholds, resolving badge overlap collisions on Region of Interest (ROI) boundaries, adding full 8-point perimeter resizing handles, and introducing multi-geometry fiducial shapes (`Circle Dimple`, `Square Notch`, `Corner Chamfer`).
2. **Photoshop-Style Vision Layers Panel (`VisionLayersPanel.tsx`)**: Implementing a 4-tier z-index layer stack (`Base Image Z0`, `Search ROI Z1 - Locked by default`, `Pattern Search Boxes 1..57 Z2`, `Masks Z3`), supporting the hardware ICOS inspection grid with 57 individually addressable pattern search boxes, visibility eye toggles, coordinate telemetry, and context menu z-ordering.
3. **Grayscale Contrast & Bit-Reduction Engine**: Resolving the camera white noise blowout (documented in Screenshot 05) caused by asymmetric half-thresholding in `toThresholdPreviewRgba()`, providing 2nd–98th percentile dynamic contrast stretching, true 1-bit binary binarization, and noise-free 2-bit quantization (0, 85, 170, 255) with tile-based local Otsu/Sauvola thresholding.
4. **UI Element Addressing Engine (Id, Name, XPath) for Headless CLI**: Establishing a strict tri-attribute data contract (`data-element-id`, `data-element-name`, `data-element-xpath`) across all interactive UI controls, extending `src/components/ui/button.tsx`, and providing deterministic element interaction via `clickUiElement()` in `scripts/cli-ui-test-runner.ts`.

---

## 2. Pattern Pin 1 Configuration & Shape Tools

### 2.1 Pointerdown Reticle Jump Defect & Drag Separation

#### Current Defect Analysis
In `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx` (lines 2161–2190), the `handlePointerDown` handler checks if a pointer click occurs anywhere inside the bounding search area:

```typescript
// DEFECTIVE IMPLEMENTATION:
const isInsideSearchArea =
  x >= roi.x - 20 &&
  x <= roi.x + roi.width + 20 &&
  y >= roi.y - 20 &&
  y <= roi.y + roi.height + 20;

if (isInsideSearchArea) {
  const nextPin1Config = { ...pin1Config, centerX: x, centerY: y };
  onUpdateParams({ ...toolParams, pin1Config: nextPin1Config });
  return;
}
```

This causes an immediate reticle jump to `(x, y)` whenever an operator clicks inside the ROI to select a box, reposition the window, or interact with other canvas controls.

#### Architectural Remedy
1. **Separation of Reticle Placement from Interaction**:
   - Direct reticle repositioning is strictly guarded: clicking inside the search region must **NOT** mutate `centerX` or `centerY` unless an explicit `isPin1PlacementActive` mode is enabled or the pointer specifically hits the existing reticle circle (`Math.hypot(x - currentPin1X, y - currentPin1Y) <= 18`).
2. **Drag Threshold Enforcement**:
   - Pointer dragging of the reticle requires a Euclidean distance threshold of `delta >= 4px` (`Math.hypot(dx, dy) >= 4`) before firing `onUpdateParams`.
   - Micro-movements and accidental clicks preserve existing coordinates.

### 2.2 Boundary Badge Staggering (Collision Prevention)

#### Defect Analysis (Screenshot 09)
In `VisualToolWorkpieceCanvas.tsx` (lines 274–284), the inner Pattern Region badge is rendered at a fixed vertical offset above the pattern bounding envelope:

```typescript
const envBadge = `PATTERN REGION · [${envW}×${envH}]`;
ctx.fillRect(envX, envY - 14, envBw, 14);
ctx.fillText(envBadge, envX + 4, envY - 3);
```

When the inner Pattern Region top boundary (`envY`) aligns with or is close to the outer Search Region top boundary (`roi.y`), the two text badges collide and occlude each other.

#### Dynamic Staggering Algorithm
The canvas renderer must compute vertical boundary overlap before drawing the inner Pattern Region badge:

```typescript
const isTopBoundaryColliding = Math.abs(envY - roi.y) <= 22 || (envY - 14) <= (roi.y + 14);

let badgeY = envY - 14;
let textY = envY - 3;

if (isTopBoundaryColliding) {
  // Stagger badge below the pattern envelope
  badgeY = envY + envH + 4;
  textY = envY + envH + 15;
}
```

### 2.3 Full 8-Handle Resizing Architecture

#### Handle Geometry & Cursor Contract
The canvas bounding box must support full 8-direction perimeter manipulation instead of 4 corner handles:

| Handle Key | Handle Name | Coordinate Formula | Cursor Style | Primary Transform |
| :--- | :--- | :--- | :--- | :--- |
| `nw` | Northwest Corner | `(roi.x, roi.y)` | `nwse-resize` | Mutate `x`, `y`, `width`, `height` |
| `n` | North Edge | `(roi.x + roi.width / 2, roi.y)` | `ns-resize` | Mutate `y`, `height` |
| `ne` | Northeast Corner | `(roi.x + roi.width, roi.y)` | `nesw-resize` | Mutate `y`, `width`, `height` |
| `e` | East Edge | `(roi.x + roi.width, roi.y + roi.height / 2)` | `ew-resize` | Mutate `width` |
| `se` | Southeast Corner | `(roi.x + roi.width, roi.y + roi.height)` | `nwse-resize` | Mutate `width`, `height` |
| `s` | South Edge | `(roi.x + roi.width / 2, roi.y + roi.height)` | `ns-resize` | Mutate `height` |
| `sw` | Southwest Corner | `(roi.x, roi.y + roi.height)` | `nesw-resize` | Mutate `x`, `width`, `height` |
| `w` | West Edge | `(roi.x, roi.y + roi.height / 2)` | `ew-resize` | Mutate `x`, `width` |

#### Math Transformation Rules (Zero-Nesting, Guarded)
For each handle during `pointermove`, transformations enforce a minimum dimension constraint of `16px`:

```typescript
export type ResizeHandleType = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export function calculateResizedRoi(
  handle: ResizeHandleType,
  currentX: number,
  currentY: number,
  startPos: { x: number; y: number; initialRoi: WorkpieceRoi },
  isSquare = false,
): WorkpieceRoi {
  const { initialRoi } = startPos;
  let nextRoi = { ...initialRoi };

  switch (handle) {
    case "se":
      nextRoi.width = Math.max(16, currentX - initialRoi.x);
      nextRoi.height = Math.max(16, currentY - initialRoi.y);
      break;
    case "e":
      nextRoi.width = Math.max(16, currentX - initialRoi.x);
      break;
    case "s":
      nextRoi.height = Math.max(16, currentY - initialRoi.y);
      break;
    case "nw": {
      const dx = currentX - startPos.x;
      const dy = currentY - startPos.y;
      nextRoi.x = Math.min(currentX, initialRoi.x + initialRoi.width - 16);
      nextRoi.y = Math.min(currentY, initialRoi.y + initialRoi.height - 16);
      nextRoi.width = Math.max(16, initialRoi.width - dx);
      nextRoi.height = Math.max(16, initialRoi.height - dy);
      break;
    }
    case "w": {
      const dx = currentX - startPos.x;
      nextRoi.x = Math.min(currentX, initialRoi.x + initialRoi.width - 16);
      nextRoi.width = Math.max(16, initialRoi.width - dx);
      break;
    }
    case "n": {
      const dy = currentY - startPos.y;
      nextRoi.y = Math.min(currentY, initialRoi.y + initialRoi.height - 16);
      nextRoi.height = Math.max(16, initialRoi.height - dy);
      break;
    }
    case "ne": {
      const dy = currentY - startPos.y;
      nextRoi.y = Math.min(currentY, initialRoi.y + initialRoi.height - 16);
      nextRoi.width = Math.max(16, currentX - initialRoi.x);
      nextRoi.height = Math.max(16, initialRoi.height - dy);
      break;
    }
    case "sw": {
      const dx = currentX - startPos.x;
      nextRoi.x = Math.min(currentX, initialRoi.x + initialRoi.width - 16);
      nextRoi.width = Math.max(16, initialRoi.width - dx);
      nextRoi.height = Math.max(16, currentY - initialRoi.y);
      break;
    }
  }

  if (isSquare) {
    const side = Math.max(nextRoi.width, nextRoi.height);
    nextRoi.width = side;
    nextRoi.height = side;
  }

  return nextRoi;
}
```

#### Visual Styling of Handles
Handles render as 8px × 8px squares with a `#0a0e17` solid core, 2px border matching the active ROI theme color (`#00e5ff` default, `#10b981` pass, `#ef4444` fail), and a 14px pointer hit-radius for touch/click ergonomics.

### 2.4 Fiducial Geometry Shape Selector & Detector

#### Shape Modes
Pin 1 fiducials vary across semiconductor packages:
1. `Circle Dimple` (`circle_dimple`): Molded circular indentation or printed white dot.
2. `Square Notch` (`square_notch`): Molded square cavity or printed square pad.
3. `Corner Chamfer` (`corner_chamfer`): 45-degree beveled corner cut on IC packaging.

#### TypeScript Enum & Interface
```typescript
export enum Pin1FiducialShapeType {
  CircleDimple = "circle_dimple",
  SquareNotch = "square_notch",
  CornerChamfer = "corner_chamfer",
}
```

#### Detector Extension (`round-hole-detector.ts`)
The candidate evaluation function `processCandidate` must branch based on the selected fiducial shape:

1. **Circle Dimple**:
   - Aspect ratio: `0.70 .. 1.30`.
   - Circularity: Normalized formula `(4 * Math.PI * area) / (perimeter^2 * (Math.PI^2 / 16)) >= minCircularityPercent` (default 45%).
   - Fill ratio: `0.60 .. 0.88` (`area / (boxW * boxH)`).
2. **Square Notch**:
   - Aspect ratio: `0.85 .. 1.15` (near 1:1 square).
   - Fill ratio: `0.80 .. 0.98` (dense solid fill).
   - Circularity: Normalized square benchmark `~78.5%` (`pi/4` normalized).
3. **Corner Chamfer**:
   - Aspect ratio: `0.70 .. 1.30`.
   - Fill ratio: `0.35 .. 0.65` (diagonal triangle slice).
   - Centroid displacement: Center of mass offset toward one bounding corner by `> 15%` of half-width/height.

---

## 3. Photoshop-Style Vision Layers Panel (`VisionLayersPanel.tsx`)

### 3.1 4-Tier Layer Hierarchy

The inspection canvas is structured as a 4-tier layer hierarchy rendered in `src/components/vision/workpiece/VisionLayersPanel.tsx`:

```
┌─────────────────────────────────────────────────────────┐
│ Z3: Masks Layer                                         │  (Rect, Square, Circle)
├─────────────────────────────────────────────────────────┤
│ Z2: Pattern Search Boxes Layer                          │  (Hardware ICOS Grid: Boxes 1..57)
├─────────────────────────────────────────────────────────┤
│ Z1: Search ROI Layer [LOCKED BY DEFAULT]                │  (Interactive bounding frame)
├─────────────────────────────────────────────────────────┤
│ Z0: Base Image Layer                                    │  (Camera frame / Raw inspection file)
└─────────────────────────────────────────────────────────┘
```

#### Layer Tier Specifications

| Tier | Layer Name | Default State | Controls & Actions | Telemetry & Data |
| :--- | :--- | :--- | :--- | :--- |
| **Z0** | `Base Image` | `isVisible: true`, `isLocked: true` | Eye toggle, Opacity slider (0–100%), Contrast stretch toggle | Width × Height, Bit-depth, Color channel mode |
| **Z1** | `Search ROI` | `isVisible: true`, `isLocked: true` | Eye toggle, Lock toggle (Double-click or lock icon), Stroke color | `(x, y, w, h)`, Aspect ratio, Center coords |
| **Z2** | `Pattern Boxes` | `isVisible: true`, `isLocked: false` | Global eye toggle, Per-box eye toggle, Multi-select, Context menu | 57 boxes, Per-box coordinates, Pass/Fail chip, Score % |
| **Z3** | `Masks` | `isVisible: true`, `isLocked: false` | Eye toggle, Invert mask (`isInverted`), Add shape, Delete shape | Mask type (`rectangle`, `square`, `circle`), Radius/Bounds |

### 3.2 Search ROI Default Lock Interaction
- **Default Invariant**: The Search ROI layer defaults to `isLocked: true` upon ruleset load.
- **Interactivity Guard**: When locked, canvas pointer events pass through without dragging or resizing the ROI, preventing accidental displacement during inspection tuning.
- **Unlock Triggers**:
  - Clicking the lock icon button on the Z1 layer row.
  - Double-clicking the Z1 layer row text in `VisionLayersPanel.tsx`.
  - Visual indicator: Gold/cyan unlocked padlock icon when editable; subdued gray locked padlock when protected.

### 3.3 Hardware ICOS Inspection Grid (Screenshot 10)
- **57-Box Architecture**: Mirrors the industrial ICOS optical inspection packaging grid with exactly 57 indexed pattern search boxes.
- **Per-Box Attributes**:
  - `number`: 1 to 57.
  - `isVisible`: boolean (toggled via Eye icon).
  - `isExcluded`: boolean (toggled via context menu or checkbox).
  - `status`: `"pass" | "fail" | "skipped" | "pending"`.
  - `confidenceScore`: 0.0% to 100.0%.
  - `coordinates`: `{ x, y, width, height }`.
- **Multi-Selection & Batch Actions**:
  - Operators can Shift+click to select contiguous ranges of boxes (e.g. Boxes 12–24) or Ctrl+click for arbitrary sets.
  - Batch actions in panel toolbar: `Include All`, `Exclude Selected`, `Invert Selection`, `Reset to ICOS Defaults`.
- **Context Menu (Right-Click on Box or Layer)**:
  - `Bring to Front` (sets z-order to top of tier).
  - `Send to Back` (sets z-order to bottom of tier).
  - `Move Up` / `Move Down`.
  - `Toggle Exclude from Inspection`.
  - `Inspect Box Crop` (opens high-magnification zoom popover).

---

## 4. Grayscale Contrast & Bit-Reduction Engine

### 4.1 Root Cause Analysis of Screenshot 05 (White Noise Blowout)

In `src/lib/vision/white-box-marking.ts`, `toThresholdPreviewRgba()` currently implements:

```typescript
// DEFECTIVE IMPLEMENTATION:
for (let index = 0; index < gray.length; index += 1) {
  if (gray[index] >= threshold) {
    gray[index] = 255;
  }
}
return grayToRgba(gray);
```

**Consequences**:
1. Pixels with luminance `>= threshold` become fully saturated white (`255`).
2. Pixels `< threshold` are completely unmodified, preserving their raw continuous grayscale value.
3. This creates an **asymmetric half-threshold**: sensor noise and subtle lighting ripples in dark regions remain visible, while adjacent midtone pixels violently spike to maximum white, producing salt-and-pepper blowout across the IC package surface.

### 4.2 Two-Stage Processing Engine

#### Stage 1: Dynamic 2nd–98th Percentile Contrast Stretching
Contrast stretching normalizes the dynamic range between the 2nd percentile (`p2`) and the 98th percentile (`p98`) of the luminance histogram, discarding sensor outliers and extreme specular reflections:

```typescript
export function applyContrastStretching(
  gray: Uint8ClampedArray,
  lowPercentile = 0.02,
  highPercentile = 0.98,
): Uint8ClampedArray {
  const histogram = new Uint32Array(256);
  for (let i = 0; i < gray.length; i += 1) {
    histogram[gray[i]] += 1;
  }

  const totalPixels = gray.length;
  const lowCount = totalPixels * lowPercentile;
  const highCount = totalPixels * highPercentile;

  let cumSum = 0;
  let pLow = 0;
  let pHigh = 255;

  for (let i = 0; i < 256; i += 1) {
    cumSum += histogram[i];
    if (pLow === 0 && cumSum >= lowCount) {
      pLow = i;
    }
    if (cumSum >= highCount) {
      pHigh = i;
      break;
    }
  }

  const range = Math.max(1, pHigh - pLow);
  const stretched = new Uint8ClampedArray(gray.length);

  for (let i = 0; i < gray.length; i += 1) {
    const val = gray[i];
    if (val <= pLow) {
      stretched[i] = 0;
    } else if (val >= pHigh) {
      stretched[i] = 255;
    } else {
      stretched[i] = Math.round(((val - pLow) / range) * 255);
    }
  }

  return stretched;
}
```

#### Stage 2: Bit-Reduction (1-Bit Binary & 2-Bit Quantization)

1. **True 1-Bit Binary Binarization**:
   - Converts the stretched grayscale array into pure binary states (`0` black or `255` white).
   - Employs **Local Tile-Based Otsu Thresholding**: The image is subdivided into 32×32 pixel tiles. Each tile computes its optimal between-class variance threshold $\sigma_B^2(t) = \omega_0(t)\omega_1(t)[\mu_0(t) - \mu_1(t)]^2$. Bilinear interpolation across tile boundaries eliminates hard block edges.
2. **2-Bit Noise-Free Quantization**:
   - Discretizes continuous luminance into exactly 4 stepped industrial levels:
     - `0`: Substrate / Deep shadow.
     - `85`: Solder mask / Trace boundary.
     - `170`: Lead metallization / Specular shoulder.
     - `255`: Laser marking / Direct pin reflection.
   - Boundaries: `< 64` $\to$ `0`, `64..127` $\to$ `85`, `128..191` $\to$ `170`, `192..255` $\to$ `255`.

---

## 5. UI Element Addressing Engine (Id, Name, XPath) for Headless CLI

### 5.1 Tri-Attribute DOM Contract

To allow headless Playwright scripts, CI runners, and CLI automation tools to deterministically target every UI element without relying on fragile CSS class chains or volatile DOM hierarchies, every interactive component must render three standardized data attributes:

1. `data-element-id`: Unique kebab-case identifier scoped to the tool/modal (e.g. `vision-pin1-reticle-drag`, `layers-search-roi-lock-btn`).
2. `data-element-name`: Canonical component/action name (e.g. `Pin1ReticleDraggable`, `SearchRoiLockToggle`).
3. `data-element-xpath`: Absolute or scoped XPath locator (e.g. `//div[@data-element-id='vision-layers-panel']//button[@data-element-id='layers-search-roi-lock-btn']`).

### 5.2 Extension of `src/components/ui/button.tsx`

The base Radix-based `Button` component must accept these addressing properties:

```typescript
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  elementId?: string;
  elementName?: string;
  elementXPath?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      elementId,
      elementName,
      elementXPath,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        data-element-id={elementId}
        data-element-name={elementName}
        data-element-xpath={elementXPath}
        {...props}
      />
    );
  },
);
```

### 5.3 CLI Test Runner Locator Helper (`scripts/cli-ui-test-runner.ts`)

`scripts/cli-ui-test-runner.ts` must export deterministic interaction helpers with automatic fallback cascading:

```typescript
export interface UiElementTarget {
  id?: string;
  name?: string;
  xpath?: string;
}

export async function clickUiElement(
  page: Page,
  target: UiElementTarget,
  options?: { timeoutMs?: number; force?: boolean },
): Promise<void> {
  const timeout = options?.timeoutMs ?? 5000;
  let locator = null;

  if (target.id) {
    locator = page.locator(`[data-element-id="${target.id}"]`);
  } else if (target.xpath) {
    locator = page.locator(`xpath=${target.xpath}`);
  } else if (target.name) {
    locator = page.locator(`[data-element-name="${target.name}"]`);
  } else {
    throw new Error("clickUiElement: At least one locator property (id, xpath, name) is required");
  }

  await locator.first().waitFor({ state: "visible", timeout });
  await locator.first().click({ force: options?.force ?? false });
}
```

---

## 6. TypeScript Data Models & Contracts

### 6.1 `src/components/vision/workpiece/types.ts` Additions

```typescript
export type ResizeHandleType = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export enum VisionLayerTierType {
  BaseImage = "base_image",
  SearchRoi = "search_roi",
  PatternBoxes = "pattern_boxes",
  Masks = "masks",
}

export interface VisionLayerState {
  tier: VisionLayerTierType;
  id: string;
  title: string;
  isVisible: boolean;
  isLocked: boolean;
  opacity: number; // 0.0 to 1.0
  zIndex: number;
}

export interface IcosPatternBox {
  number: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isVisible: boolean;
  isExcluded: boolean;
  status: "pass" | "fail" | "skipped" | "pending";
  confidenceScore: number;
}
```

---

## 7. Acceptance Criteria (Pass/Fail)

1. **Pin 1 Reticle Pointerdown**: Clicking inside the search area without hitting the reticle circle (`<= 18px`) does **not** move or jump Pin 1 coordinates. Dragging the reticle requires `delta >= 4px`. (Pass/Fail)
2. **Boundary Badge Staggering**: When the inner Pattern Region boundary top is within 22px of the outer Search Region boundary top, the badge renders staggered below the envelope at `(envY + envH + 4)`. (Pass/Fail)
3. **8-Handle Resizing**: The workpiece canvas renders 8 distinct boundary handles (`nw`, `n`, `ne`, `e`, `se`, `s`, `sw`, `w`) with correct cursor styling (`ns-resize`, `ew-resize`, `nwse-resize`, `nesw-resize`) and functional dragging. (Pass/Fail)
4. **Fiducial Geometry Shapes**: The Pin 1 configuration tool provides a shape selector with `Circle Dimple`, `Square Notch`, and `Corner Chamfer`. The detector correctly validates all three geometries. (Pass/Fail)
5. **Photoshop-Style Layers Panel**: `VisionLayersPanel.tsx` renders all 4 tiers (`Z0` to `Z3`). Search ROI is locked by default (`isLocked: true`). Double-clicking or clicking the lock icon unlocks it. (Pass/Fail)
6. **57-Box ICOS Grid**: The panel supports boxes 1 through 57 with individual eye visibility toggles, coordinate telemetry, pass/fail chips, and context menu z-ordering. (Pass/Fail)
7. **Grayscale Contrast & Bit-Reduction**: Contrast stretching uses 2nd–98th percentile normalization. Binarization produces clean 1-bit or 2-bit outputs without asymmetric noise blowout. (Pass/Fail)
8. **UI Element Addressing**: `Button` forwards `data-element-id`, `data-element-name`, and `data-element-xpath`. `clickUiElement` in `scripts/cli-ui-test-runner.ts` successfully triggers actions via all three addressing modes. (Pass/Fail)

---

## 8. Verification & CLI Test Execution Plan

| Step | Scope | Command / Tool | Success Standard |
| :--- | :--- | :--- | :--- |
| **V1** | Type Check | `pnpm exec tsc --noEmit` | Clean zero-error compilation across all updated files |
| **V2** | Unit Tests | `pnpm exec vitest run src/components/vision/` | 100% green pass on workpiece canvas, detector, and layers tests |
| **V3** | Contrast Engine Tests | `pnpm exec vitest run src/lib/vision/` | Validates percentile math and 1-bit/2-bit quantization |
| **V4** | Headless CLI E2E | `pnpm exec tsx scripts/cli-ui-test-runner.ts` | CLI clicks UI elements by Id, Name, and XPath with green status |

---

## 9. Rollback & Safety Invariants

- **Zero Breaking Changes**: Existing recipe and ruleset JSON formats remain backward-compatible; default shape falls back to `circle_dimple`.
- **Canvas Fallback**: If `VisionLayersPanel.tsx` is unmounted or omitted, `VisualToolWorkpieceCanvas.tsx` maintains complete standalone editing capabilities.
- **Rollback Procedure**: Revert atomic commits modifying `VisualToolWorkpieceCanvas.tsx`, `white-box-marking.ts`, `button.tsx`, and `cli-ui-test-runner.ts`. No database schema migration rollback required.
