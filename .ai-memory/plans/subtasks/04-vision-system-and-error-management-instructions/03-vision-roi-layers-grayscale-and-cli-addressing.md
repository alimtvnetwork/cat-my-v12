# Subtask Plan: Vision Pin 1 Configuration, Shape Tools, Layers Panel, Grayscale Engine & CLI Addressing

**Task ID:** `03-vision-roi-layers-grayscale-and-cli-addressing`  
**Parent Task:** `vision-system-and-error-management-instructions`  
**Specification:** `02-spec/21-app/04-vision-system-and-error-management-instructions/03-vision-roi-layers-grayscale-and-cli-addressing-spec.md`  
**Status:** Pending Execution  
**Author:** Authoring Worker 03  
**Target Repository:** `cat-my`  

---

## 1. Scope & Technical Deliverables

This subtask executes the technical implementation of four critical vision system components:

1. **Pin 1 Configuration & 8-Handle Resizing**:
   - Fix the pointerdown reticle jump in `VisualToolWorkpieceCanvas.tsx` (lines 2161–2190).
   - Require a minimum Euclidean drag distance threshold (`delta >= 4px`) before updating reticle coordinates.
   - Fix boundary badge overlap collision (Screenshot 09) by staggering the inner Pattern Region badge to the bottom `(envY + envH + 4)` when top boundary collision occurs.
   - Implement full 8-direction bounding box resizing (`nw`, `n`, `ne`, `e`, `se`, `s`, `sw`, `w`) with appropriate cursor changes and minimum 16px dimension clamping.
   - Introduce a multi-geometry fiducial shape selector (`Circle Dimple`, `Square Notch`, `Corner Chamfer`) and update `round-hole-detector.ts` to evaluate each shape correctly.
2. **Photoshop-Style Layers Panel (`VisionLayersPanel.tsx`)**:
   - Construct a 4-tier layer hierarchy: `Base Image (Z0)`, `Search ROI (Z1 - Locked by default)`, `Pattern Search Boxes 1..57 (Z2)`, and `Masks (Z3)`.
   - Default Search ROI to `isLocked: true`, allowing double-click or lock-icon toggle to edit.
   - Integrate the hardware ICOS inspection grid (Screenshot 10) supporting 57 numbered pattern search boxes with eye visibility toggles, telemetry readouts, and context menu z-ordering.
3. **Grayscale Contrast & Bit-Reduction Engine**:
   - Eliminate white noise blowout (Screenshot 05) caused by asymmetric half-thresholding in `toThresholdPreviewRgba()`.
   - Implement 2nd–98th percentile dynamic contrast stretching to maximize edge definition and remove sensor haze.
   - Implement true 1-bit binary binarization (pure black and white) and 2-bit quantization (0, 85, 170, 255) using tile-based local Otsu/Sauvola thresholding.
4. **UI Element Addressing Engine for Headless CLI**:
   - Define a universal tri-attribute DOM contract: `data-element-id`, `data-element-name`, and `data-element-xpath`.
   - Extend `src/components/ui/button.tsx` to forward these attributes.
   - Implement `clickUiElement(page, { id, xpath, name })` in `scripts/cli-ui-test-runner.ts` for deterministic headless automation.

---

## 2. Target Files & Component Modifications

| File Path | Operation | Responsibility |
| :--- | :--- | :--- |
| `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx` | Modify | Fix reticle jump, add drag threshold, stagger colliding badges, implement 8-handle resizing |
| `src/components/vision/standard/tools/pin1-config/round-hole-detector.ts` | Modify | Support Square Notch and Corner Chamfer detection alongside Circle Dimple |
| `src/components/vision/standard/tools/pin1-config/types.ts` | Modify | Define `Pin1FiducialShapeType` enum and shape parameters |
| `src/components/vision/standard/tools/pin1-config/Pin1SettingsCard.tsx` | Modify | Add UI shape selector for fiducial geometry |
| `src/lib/vision/contrast-reduction-engine.ts` | Create | Implement 2nd-98th percentile contrast stretching, local Otsu 1-bit binarization, and 2-bit quantization |
| `src/lib/vision/white-box-marking.ts` | Modify | Update `toThresholdPreviewRgba()` to use the contrast engine, eliminating asymmetric blowout |
| `src/components/vision/workpiece/VisionLayersPanel.tsx` | Create | Photoshop-style 4-tier layer panel with ICOS 57-box grid and default locked Search ROI |
| `src/components/vision/workpiece/types.ts` | Modify | Define layer tier enums, layer state models, and ICOS box types |
| `src/components/ui/button.tsx` | Modify | Extend `ButtonProps` with `elementId`, `elementName`, and `elementXPath` |
| `scripts/cli-ui-test-runner.ts` | Modify | Add `clickUiElement()` helper with tri-attribute resolution cascade |

---

## 3. Step-by-Step Implementation Roadmap

### Phase 1: Pin 1 Reticle Pointerdown Jump Fix & 8-Handle Resizing

#### Step 1.1: Guard Reticle Placement & Enforce Drag Threshold
In `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`:
- Locate lines 2161–2190 in `handlePointerDown`.
- Remove the auto-jump block that mutates `pin1Config` on any click inside `roi.x - 20` to `roi.x + roi.width + 20`.
- Store pointer start position `reticleDragStartPos` (`{ x, y }`).
- In `handlePointerMove`: Only update `pin1Config.centerX` and `pin1Config.centerY` when `isDraggingPin1` is active and `Math.hypot(x - reticleDragStartPos.x, y - reticleDragStartPos.y) >= 4`.

#### Step 1.2: Implement Full 8-Handle Perimeter Resizing
- Update `activeCornerHandle` and `cursorHandleType` state types from `"nw" | "ne" | "sw" | "se" | null` to `ResizeHandleType | null` (`"nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w"`).
- Replace `drawCornerHandles` with `drawBoundingHandles`:
  - Calculate 8 handle positions along the bounding rectangle.
  - Draw each 8px × 8px handle with a dark `#0a0e17` center and theme stroke.
- Update `handlePointerDown`:
  - Add hit-testing (14px radius) for midpoints: `n` (`roi.x + roi.width / 2, roi.y`), `s` (`roi.x + roi.width / 2, roi.y + roi.height`), `w` (`roi.x, roi.y + roi.height / 2`), and `e` (`roi.x + roi.width, roi.y + roi.height / 2`).
- Update `handlePointerMove`:
  - Map cursor styles: `n`/`s` $\to$ `ns-resize`, `e`/`w` $\to$ `ew-resize`, `nw`/`se` $\to$ `nwse-resize`, `ne`/`sw` $\to$ `nesw-resize`.
  - Calculate transformed ROI using `calculateResizedRoi()` with 16px minimum bounds.

---

### Phase 2: ROI Boundary Badge Collision Staggering (Screenshot 09)

#### Step 2.1: Add Dynamic Staggering Calculation
In `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx` (around lines 266–285):
- Evaluate collision between inner Pattern Region envelope (`envX`, `envY`, `envW`, `envH`) and outer Search Region (`roi.x`, `roi.y`, `roi.width`, `roi.height`).
- Define boolean flag:
  ```typescript
  const isTopBoundaryColliding = Math.abs(envY - roi.y) <= 22 || (envY - 14) <= (roi.y + 14);
  ```
- Compute badge layout:
  ```typescript
  const badgeY = isTopBoundaryColliding ? envY + envH + 4 : envY - 14;
  const textY = isTopBoundaryColliding ? envY + envH + 15 : envY - 3;
  ```
- Render badge rectangle and text at `badgeY` and `textY`, preventing visual collision with the search region header badge.

---

### Phase 3: Fiducial Geometry Shape Selector & Multi-Shape Detector

#### Step 3.1: Define Shape Types
In `src/components/vision/standard/tools/pin1-config/types.ts`:
- Add `Pin1FiducialShapeType` enum (`CircleDimple = "circle_dimple"`, `SquareNotch = "square_notch"`, `CornerChamfer = "corner_chamfer"`).
- Add `fiducialShape?: Pin1FiducialShapeType` to `DetectRoundHolesParams` and `Pin1Config`.

#### Step 3.2: Update Detection Algorithm in `round-hole-detector.ts`
- In `processCandidate()`:
  - When `fiducialShape === Pin1FiducialShapeType.SquareNotch`:
    - Validate aspect ratio: `aspectRatio >= 0.85 && aspectRatio <= 1.15`.
    - Validate fill ratio: `fillRatio >= 0.80 && fillRatio <= 0.98`.
  - When `fiducialShape === Pin1FiducialShapeType.CornerChamfer`:
    - Validate aspect ratio: `aspectRatio >= 0.70 && aspectRatio <= 1.30`.
    - Validate fill ratio: `fillRatio >= 0.35 && fillRatio <= 0.65`.
  - When `fiducialShape === Pin1FiducialShapeType.CircleDimple` (default):
    - Validate circularity using normalized circularity percentage (`>= minCirc`).

#### Step 3.3: Add Fiducial Shape Selector to UI
In `src/components/vision/standard/tools/pin1-config/Pin1SettingsCard.tsx`:
- Render a 3-button segmented selector (`Circle Dimple`, `Square Notch`, `Corner Chamfer`) with icon illustrations and tooltips.
- Bind changes to `onUpdateParams({ ...toolParams, fiducialShape: nextShape })`.

---

### Phase 4: Grayscale Contrast & Bit-Reduction Engine (Screenshot 05 Fix)

#### Step 4.1: Create Contrast Reduction Engine
Create `src/lib/vision/contrast-reduction-engine.ts`:
- `applyContrastStretching(gray: Uint8ClampedArray, lowP = 0.02, highP = 0.98)`:
  - Build 256-bin histogram.
  - Determine `pLow` and `pHigh` thresholds.
  - Linearly stretch gray pixels to full 0–255 dynamic range.
- `applyLocalOtsuBinarization(stretched: Uint8ClampedArray, width: number, height: number, tileSize = 32)`:
  - Subdivide into tiles.
  - Compute local Otsu threshold for each tile.
  - Apply bilinear interpolation across pixel coordinates to determine local threshold `T(x, y)`.
  - Map `stretched[idx] >= T(x, y) ? 255 : 0`.
- `applyTwoBitQuantization(stretched: Uint8ClampedArray)`:
  - Quantize into 0, 85, 170, and 255 levels based on break points `[64, 128, 192]`.

#### Step 4.2: Refactor `toThresholdPreviewRgba()` in `white-box-marking.ts`
- Replace the asymmetric half-threshold loop with the two-stage pipeline:
  ```typescript
  export function toThresholdPreviewRgba(
    input: WhiteBoxMarkingInput,
    whiteThreshold: number,
  ): Uint8ClampedArray {
    assertRgba(input);
    const continuousGray = toContinuousGray(input.rgba);
    const stretched = applyContrastStretching(continuousGray);
    const binarized = applyLocalOtsuBinarization(stretched, input.width, input.height);
    return grayToRgba(binarized);
  }
  ```
- This guarantees pure black-and-white preview without residual grayscale noise or blown-out highlights.

---

### Phase 5: Photoshop-Style VisionLayersPanel & 57-Box ICOS Grid

#### Step 5.1: Build `VisionLayersPanel.tsx`
Create `src/components/vision/workpiece/VisionLayersPanel.tsx`:
- Render 4 collapsible layer tiers:
  1. `Base Image (Z0)`: Eye icon, Opacity slider, Source dimensions readout, Stretch preview toggle.
  2. `Search ROI (Z1)`: Eye icon, Padlock icon (locked by default: `isLocked: true`), Coordinates `(x, y, w, h)`, Double-click row to toggle lock.
  3. `Pattern Boxes (Z2)`: Master eye toggle, 57-box scrollable table, Per-box eye toggle, Status pill (`Pass`/`Fail`/`Skipped`), Score %.
  4. `Masks (Z3)`: Invert mask toggle, Mask primitive list (`Rectangle`, `Square`, `Circle`), Add/Delete actions.
- Right-click context menu: `Bring to Front`, `Send to Back`, `Move Up`, `Move Down`, `Toggle Excluded`.

#### Step 5.2: Integrate ICOS 57-Box Grid
- Render all 57 boxes with standard ICOS labeling (e.g. `B01` through `B57`).
- Support multi-selection (Shift+click range selection, Ctrl+click individual selection).
- Wire excluded state to `excludedNumbers: ReadonlySet<number>` in `VisualToolWorkpieceCanvas.tsx`.

---

### Phase 6: UI Element Addressing Engine & Button Extension

#### Step 6.1: Extend `src/components/ui/button.tsx`
- Add `elementId?: string`, `elementName?: string`, and `elementXPath?: string` to `ButtonProps`.
- Pass attributes directly to the underlying element:
  - `data-element-id={elementId}`
  - `data-element-name={elementName}`
  - `data-element-xpath={elementXPath}`

#### Step 6.2: Add Data-Attributes to Vision Components
- Annotate key buttons:
  - Pin 1 Reticle Drag: `elementId="vision-pin1-reticle"`, `elementName="Pin1Reticle"`
  - Search ROI Lock Toggle: `elementId="layers-search-roi-lock-btn"`, `elementName="SearchRoiLockToggle"`
  - Contrast Mode Toggle: `elementId="vision-contrast-toggle"`, `elementName="ContrastModeToggle"`
  - ICOS Box Row: `data-element-id={`icos-box-row-${box.number}`}`

---

### Phase 7: Playwright CLI Test Runner Helper

#### Step 7.1: Add `clickUiElement()` in `scripts/cli-ui-test-runner.ts`
- Implement `clickUiElement(page, { id, xpath, name }, options)`.
- Use cascading resolution:
  1. `[data-element-id="${id}"]`
  2. `xpath=${xpath}`
  3. `[data-element-name="${name}"]`
- Automatically take a failure screenshot if element is not visible within timeout.

---

### Phase 8: Verification, Test Execution & Quality Assurance

- Run type checking: `pnpm exec tsc --noEmit`.
- Run unit test suites for workpiece canvas, layers panel, and contrast engine.
- Execute headless Playwright CLI verification script: `pnpm exec tsx scripts/cli-ui-test-runner.ts`.
- Verify zero UI regression across Screenshot 05 (Grayscale noise), Screenshot 09 (Badge collision), and Screenshot 10 (57-box grid).

---

## 4. Acceptance Criteria Checklist

- [ ] Pin 1 reticle pointerdown click inside search area does NOT jump position; dragging requires `delta >= 4px`
- [ ] Pattern Region badge staggers to bottom `(envY + envH + 4)` when top boundary collision occurs (Screenshot 09)
- [ ] Workpiece canvas supports 8-handle perimeter resizing (`nw`, `n`, `ne`, `e`, `se`, `s`, `sw`, `w`) with correct cursors and 16px min bounds
- [ ] Pin 1 configuration provides Fiducial Geometry shape selector (`Circle Dimple`, `Square Notch`, `Corner Chamfer`)
- [ ] `round-hole-detector.ts` correctly validates circular, square, and chamfer fiducial geometries
- [ ] `VisionLayersPanel.tsx` implements 4-tier z-stack (`Base Image Z0`, `Search ROI Z1`, `Pattern Boxes Z2`, `Masks Z3`)
- [ ] Search ROI layer is locked by default (`isLocked: true`) and toggles on double-click or lock icon click
- [ ] 57-box ICOS inspection grid (Screenshot 10) displays numbered pattern boxes with visibility toggles and telemetry
- [ ] Two-stage grayscale contrast stretching (2nd–98th percentile) and 1-bit local Otsu binarization eliminate white noise blowout (Screenshot 05)
- [ ] `src/components/ui/button.tsx` forwards `data-element-id`, `data-element-name`, and `data-element-xpath`
- [ ] `scripts/cli-ui-test-runner.ts` provides `clickUiElement()` supporting deterministic CLI automation by Id, Name, and XPath
- [ ] Type check passes with zero errors: `pnpm exec tsc --noEmit`
