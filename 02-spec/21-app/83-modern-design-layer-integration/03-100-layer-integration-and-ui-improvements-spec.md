# Specification: 100 Modern Design Layer Integration & UI Improvements

**Module:** Modern Design Layer Integration  
**Specification File:** `02-spec/21-app/83-modern-design-layer-integration/03-100-layer-integration-and-ui-improvements-spec.md`  
**Status:** Approved for Implementation  
**Version:** 1.0.0  
**Target Platform:** CAT-iVISION Industrial Machine Vision Workbench & SMT Semiconductor Inspection System  
**Rule Standard:** Positive Booleans Only (`is*`, `has*`), Compound Keyboard Keys (`KeyboardKeyType`), Relative Paths Only  

---

## 1. Executive Summary & Architectural Scope

This specification establishes an exhaustive, grounded engineering catalog of exactly **100 concrete, actionable improvements** for region of interest (ROI) handling, Photoshop-grade layers integration, transform controls, drag-and-drop physics, multi-shape template extraction, coordinate synchronization, and UI/UX polish across the CAT-iVISION inspection workbench.

In modern high-speed semiconductor manufacturing (e.g. BGA/QFP carrier tape inspection, solder paste inspection, and lead-frame alignment), vision operators and algorithm engineers require sub-pixel tactile control over inspection boundaries. Existing legacy interfaces exhibit coordinate rounding drift, handle pointer detachment during fast gestures, ambiguous drag zones between ROI movement and interior content selection, and layer panel visual glitches (such as oversized scrollbars and uncoordinated z-index stacks).

### 1.1 Architectural Invariants

Every improvement in this specification adheres strictly to the core system principles:
1. **Zero Unintended Mutations**: Vision regions, layers, and configuration parameters must maintain strict immutability contracts. Accidental canvas clicks must never alter, destroy, or jump existing geometries.
2. **Spatial Separation of Concerns**: Header grip bars, corner transform handles, and in-ROI floating toolbars must maintain non-overlapping spatial responsibilities and distinct hit-test targets.
3. **Sub-Pixel Coordinate Fidelity**: All coordinate calculations decouple logical image-space geometry from screen-space viewport transforms, preserving sub-pixel precision across zoom levels from 10% to 1600%.
4. **Photoshop-Grade Layer Physics**: Layer stacking order in the layers panel must map 1:1 with canvas visual render pass order (`z-index`), supporting non-destructive visibility, locking, opacity, and grouping.
5. **Strict Coding Guidelines Compliance**: Exclusively positive boolean framing (`is*`, `has*`), compound keyboard helpers (`KeyboardKeyType`), parameter structs for multi-argument methods, and clean relative paths.

---

## 2. Master Category Breakdown

The 100 improvements are divided equally across 10 functional domains (10 improvements per category):

| Category | Domain | ID Range | Core Focus |
| :---: | :--- | :---: | :--- |
| **1** | In-ROI Layer Container & Clipping Masks | `MLI-001` – `MLI-010` | SVG clipping paths, hardware clip-path, parent-child scoping, inverted masks, stencil buffers |
| **2** | Interactive Transform Handles & 8-Point Physics | `MLI-011` – `MLI-020` | Affine transform matrices, angle-snapped cursors, pointer capture, aspect ratio lock, rotation stems |
| **3** | Header Grip Bar & Spatial Drag Separation | `MLI-021` – `MLI-030` | Dedicated top grip bars, interior click-through, collision avoidance, quick lock, arrow nudging |
| **4** | In-ROI Floating Action Toolbar & Tool Icons | `MLI-031` – `MLI-040` | Anchored action toolbars, Lucide iconography, micro threshold sliders, quick duplicate, golden reference capture |
| **5** | Photoshop Layers Panel & Visual Stacking | `MLI-041` – `MLI-050` | Layer hierarchy badging, live thumbnail crops, z-index reconciliation, blend modes, context menus |
| **6** | Drag-and-Drop Reordering & Multi-Layer Selection | `MLI-051` – `MLI-060` | HTML5 drag-and-drop indicators, keyboard Alt+Up/Down reorder, multi-select, batch grouping, align tools |
| **7** | Visual Styling, High-Contrast Handles & Glitch Removal | `MLI-061` – `MLI-070` | Custom slim scrollbars, dual-stroke handle knobs, sub-pixel antialiasing, GPU layer promotion |
| **8** | Multi-Shape Support & Template Extraction | `MLI-071` – `MLI-080` | Rotated rects, circles, annuli, polygons, golden template cropping, 24-box constellations |
| **9** | Zoom, Pan & Multi-Viewport Coordinate Synchronization | `MLI-081` – `MLI-090` | Focal-point zoom, spacebar pan, minimap HUD, split-view sync, dynamic handle scaling, pixel grid |
| **10** | Ergonomics, Shortcuts, Telemetry & Headless CLI | `MLI-091` – `MLI-100` | Keyboard shortcuts registry, Alt mnemonics, CLI headless facades, undo/redo stacks, E2E tests |

---

## 3. Enumerated Specification Catalog (MLI-001 to MLI-100)

### Category 1: In-ROI Layer Container & Clipping Masks (Items MLI-001 to MLI-010)

#### MLI-001: Sub-Pixel SVG & CSS Path Clipping Mask for Nested ROI Layers
- **Problem / Current Gap**: Nested annotations, defect markers, and secondary inspection masks currently bleed outside the parent ROI bounding box when zoomed, creating visual clutter across adjacent carrier tape pockets.
- **Proposed Engineering Solution**: Introduce an SVG `<clipPath id="roi-clip-{id}">` wrapping inside `CanvasRoiLayer.tsx` and `SelectionOverlayBlurBackdrop.tsx`. Use normalized image coordinates projected through the active viewport matrix, applying `clip-path: url(#roi-clip-{id})` to all child canvas elements.
- **Target Files / Components**: `src/components/editor/canvas/CanvasRoiLayer.tsx`, `src/components/editor/canvas/SelectionOverlayBlurBackdrop.tsx`
- **Impact**: Guarantees all nested visual child layers clip strictly within parent ROI boundaries with zero pixel bleed.

#### MLI-002: Dynamic SVG Mask Definitions with Hardware-Accelerated `clip-path`
- **Problem / Current Gap**: Complex multi-segment mask definitions in `SelectionOverlayUtils.ts` trigger repeated DOM layout recalibrations during interactive resize gestures.
- **Proposed Engineering Solution**: Refactor `svgMaskDataUrl` to pre-generate parametric SVG `<mask contentUnits="userSpaceOnUse">` elements with CSS `will-change: transform` and GPU composite backing. Cache SVG mask strings by region geometry hash.
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlayUtils.ts`, `src/lib/editor/mask/primitive.ts`
- **Impact**: Eliminates layout reflow spikes during ROI resizing, achieving steady 60 FPS transform performance.

#### MLI-003: Hierarchical Mask Parent-Child Scoping in Split-DB State
- **Problem / Current Gap**: Masks defined in `src/lib/vision/store.ts` are stored as a flat list under `roi.masks`, causing mask geometries to detach or orphan when the parent search region moves or scales.
- **Proposed Engineering Solution**: Refactor mask storage to maintain normalized local coordinates `(nx, ny, nw, nh)` relative to parent ROI `[0, 1]`. When parent ROI moves or scales, compute absolute world positions dynamically via matrix multiplication.
- **Target Files / Components**: `src/lib/editor/store/rules-slice.ts`, `src/lib/vision/store.ts`, `src/components/vision/MaskTools.tsx`
- **Impact**: Child masks rigidly track parent ROI translations and scaling without coordinate desynchronization.

#### MLI-004: In-ROI Inverted Clipping Masks for Exclusion Zones
- **Problem / Current Gap**: SMT semiconductor inspection requires masking out highly reflective central solder pads, but current masking tools only support additive inclusion regions.
- **Proposed Engineering Solution**: Add `hasInvertedMask: boolean` flag to mask specifications. Implement SVG `fill-rule="evenodd"` in `SelectionOverlayBlurBackdrop.tsx` to automatically punch transparent holes through the inspection area.
- **Target Files / Components**: `src/components/editor/panels/MaskPanel.tsx`, `src/components/vision/MaskTools.tsx`, `src/components/editor/canvas/SelectionOverlayBlurBackdrop.tsx`
- **Impact**: Allows clean exclusion of reflective pads and silk-screen markings without splitting rules into multiple fragmented ROIs.

#### MLI-005: Boundary Constraint Clamping for Nested Child Mask Layers
- **Problem / Current Gap**: Dragging an individual mask inside an ROI can move it entirely outside the parent boundary, producing invisible or orphaned inspection parameters.
- **Proposed Engineering Solution**: Implement `clampMaskToParentBounds(maskRect, parentRect)` in `src/lib/editor/coords.ts`. Enforce clamping in `useSelectionOverlayGestures.ts` pointer move handlers so mask edges never cross parent ROI perimeters.
- **Target Files / Components**: `src/lib/editor/coords.ts`, `src/components/editor/canvas/useSelectionOverlayGestures.ts`, `src/components/vision/white-box/useCanvasPointerDrag.ts`
- **Impact**: Completely prevents lost or orphaned mask geometries by constraining child boundaries to valid parent rects.

#### MLI-006: Visual Backdrop Blur & Contrast Isolation Outside Active ROI
- **Problem / Current Gap**: In busy multi-component PCB inspection, visual details outside the active ROI distract operators during threshold calibration.
- **Proposed Engineering Solution**: Enhance `SelectionOverlayBlurBackdrop.tsx` with adjustable backdrop blur (`backdrop-blur-sm` / `backdrop-blur-md`) and dark scrim (`bg-black/40`), fading surrounding background image while keeping the active ROI interior 100% sharp.
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlayBlurBackdrop.tsx`, `src/components/editor/canvas/SelectionOverlayConstants.ts`
- **Impact**: Drastically improves visual focus and inspection clarity during fine algorithm threshold tuning.

#### MLI-007: Mask Transparency and Blend Mode Pass-Through in 2D Canvas
- **Problem / Current Gap**: Canvas 2D rasterization in `canvas-drawing.ts` draws masks with opaque fills, obscuring surface details under inspection.
- **Proposed Engineering Solution**: Configure `ctx.globalCompositeOperation = "destination-out"` for negative exclusion masks and `source-over` with `globalAlpha = 0.35` for inspection masks, rendering subtle semi-transparent amber overlays.
- **Target Files / Components**: `src/components/vision/white-box/PatternCanvas.tsx`, `src/components/vision/white-box/canvas-drawing.ts`
- **Impact**: Operators clearly see underlying PCB features while simultaneously verifying mask coverage boundaries.

#### MLI-008: Zero-Allocation Stencil Buffer Masking for WebGL / Canvas2D Pipeline
- **Problem / Current Gap**: High-speed live camera streams (60 FPS) suffer garbage collection stutter when allocating temporary clip paths on every frame.
- **Proposed Engineering Solution**: Implement hardware stencil buffer clipping pass in `ZoomableCanvas.tsx` for hardware accelerated rendering, caching pre-compiled vertex attribute buffers for static ROI and mask geometries.
- **Target Files / Components**: `src/components/vision/ZoomableCanvas.tsx`, `src/lib/vision/white-box-marking.ts`
- **Impact**: Eliminates frame stutter during high-speed continuous conveyor video capture.

#### MLI-009: Mask Edge Anti-Aliasing and Feathering Radius Controls
- **Problem / Current Gap**: Hard binary edges on mask boundaries create false edge-detection gradients along the border of masked-out regions.
- **Proposed Engineering Solution**: Add `featherRadiusPx: number` to mask geometry specifications. In `MaskPanelUtils.ts`, generate radial or linear gradient feathering buffers around mask perimeters to gently ramp alpha from 0 to 1 over 2–5 pixels.
- **Target Files / Components**: `src/components/editor/panels/MaskPanelUtils.ts`, `src/domain/vision/pattern-search.ts`, `src/components/vision/white-box/canvas-drawing.ts`
- **Impact**: Prevents false edge triggers and gradient spikes at mask boundaries in edge-detection algorithms.

#### MLI-010: SVG Clipping Path Serialization to Inspection Recipe JSON
- **Problem / Current Gap**: Complex mask shapes are lost or approximated as basic bounding boxes when exporting recipes to backend vision engines.
- **Proposed Engineering Solution**: Standardize SVG `d="M...Z"` path strings in recipe export schemas (`src/lib/editor/json-export.ts`), allowing the backend C++/OpenCV engine to directly parse bezier curves and arbitrary polygon exclusion masks.
- **Target Files / Components**: `src/lib/editor/json-export.ts`, `src/components/vision/RecipeEditor.tsx`, `src/domain/vision/pattern-search.ts`
- **Impact**: Enables 100% loss-free transmission of complex mask geometries between frontend UI and backend inspection kernels.

---

### Category 2: Interactive Transform Handles & 8-Point Physics (Items MLI-011 to MLI-020)

#### MLI-011: 8-Point Affine Transform Matrix Calculation for Rotated ROIs
- **Problem / Current Gap**: Resizing a rotated ROI currently suffers from edge jumping and shear distortion because handles compute axis-aligned delta projections instead of local coordinate frame transforms.
- **Proposed Engineering Solution**: In `SelectionOverlayHandles.tsx` and `useSelectionOverlayGestures.ts`, project screen delta `(dx, dy)` into the rotated ROI local coordinate system by multiplying by inverse rotation matrix `R(-theta)`. Update local width and height centered on the invariant anchor handle.
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlayHandles.tsx`, `src/components/editor/canvas/useSelectionOverlayGestures.ts`, `src/lib/editor/rotation.ts`
- **Impact**: Provides rock-solid, physically accurate resizing of rotated inspection regions at any angle without geometric drift.

#### MLI-012: Dynamic Angle-Snapping Cursors Snapped to Real Screen Space
- **Problem / Current Gap**: When an ROI is rotated by 45° or 90°, the top handle continues displaying `ns-resize`, confusing operators whose motion requires east-west or diagonal movement.
- **Proposed Engineering Solution**: Dynamically calculate the outward normal vector for each handle in world screen coordinates `snap = Math.round(((Math.atan2(ry, rx) * 180 / Math.PI) % 180 + 180) % 180 / 45) % 4`, mapping to `ew-resize`, `nwse-resize`, `ns-resize`, or `nesw-resize`.
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlayHandles.tsx`, `src/lib/editor/rotation.ts`
- **Impact**: Handle cursors always point along their true visual direction of motion regardless of ROI rotation.

#### MLI-013: Pointer Capture with Lost-Pointer Guard Across Rapid Drag Gestures
- **Problem / Current Gap**: Rapidly dragging handles outside the browser window causes cursor release events to be missed, resulting in stuck dragging states and canvas jumping.
- **Proposed Engineering Solution**: Call `setPointerCapture(e.pointerId)` on handle pointer down, and attach `onLostPointerCapture` event listener in `useSelectionOverlayGestures.ts` to cleanly finalize drag state if the window loses focus.
- **Target Files / Components**: `src/components/editor/canvas/useSelectionOverlayGestures.ts`, `src/components/vision/white-box/useCanvasPointerDrag.ts`
- **Impact**: Guarantees zero stuck drag states or runaway resizing when operators make fast or sweeping mouse gestures.

#### MLI-014: Sub-Pixel Touch and Gloved-Hand Target Padding
- **Problem / Current Gap**: Handle hit-test targets are restricted to the visual 8px knob, making them extremely difficult to grab on touchscreen HMIs or with cleanroom gloved hands.
- **Proposed Engineering Solution**: Decouple the invisible touch hit-target (`w-8 h-8 pointer-events-auto`) from the visual knob (`w-2.5 h-2.5 rounded-sm pointer-events-none`) using absolute centered positioning with `SelectionOverlayConstants.ts`.
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlayConstants.ts`, `src/components/editor/canvas/SelectionOverlayHandles.tsx`
- **Impact**: Expands effective grab area to 32px touch targets while keeping visual handles ultra-precise and uncluttered.

#### MLI-015: Aspect Ratio Lock via Shift Key & Diagonal Handle Projection
- **Problem / Current Gap**: Symmetrical square chip inspection requires locking 1:1 aspect ratios, but holding Shift currently produces unpredictable rectangular stretching.
- **Proposed Engineering Solution**: Read `e.shiftKey` or rule property `hasSquareLock: boolean` in `useSelectionOverlayGestures.ts`. Project diagonal displacement along the 45° line `side = Math.max(Math.abs(dx), Math.abs(dy)) * Math.sign(dx)` to maintain strict 1:1 ratio.
- **Target Files / Components**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`, `src/components/editor/canvas/useSelectionOverlayGestures.ts`, `src/lib/vision/pinned-pattern-geometry.ts`
- **Impact**: Operators effortlessly create and resize perfect 1:1 square ROIs for symmetrical SMD chip and BGA packages.

#### MLI-016: Cardinal Handle Symmetric Expansion Mode via Alt/Option Key
- **Problem / Current Gap**: Centering an inspection region on a pin or component requires repeatedly repositioning the box after each cardinal handle resize.
- **Proposed Engineering Solution**: Support Alt/Option modifier in `useSelectionOverlayGestures.ts`: when `e.altKey` is active during cardinal or corner resize, expand the opposite edge symmetrically around the box center `(boxCenter.x, boxCenter.y)`.
- **Target Files / Components**: `src/components/editor/canvas/useSelectionOverlayGestures.ts`, `src/types/ui/KeyboardKeyType.ts`
- **Impact**: Cuts region centering time in half by allowing symmetric expansion directly from component centers.

#### MLI-017: Snap-to-Grid and Object-Edge Snapping Engine Integration
- **Problem / Current Gap**: Operators manually align multiple pin inspection boxes without magnetic feedback, resulting in minor 1–2px offsets across pin arrays.
- **Proposed Engineering Solution**: Connect `snapRect` and `computeAlignment` from `src/lib/editor/align.ts` into handle resize gestures. Render cyan magnetic alignment guide lines (`AlignmentGuides.tsx`) when handles snap within 4px of adjacent ROIs.
- **Target Files / Components**: `src/lib/editor/snap.ts`, `src/lib/editor/align.ts`, `src/components/editor/canvas/AlignmentGuides.tsx`
- **Impact**: Provides instant magnetic alignment for multi-pin semiconductor arrays with visual alignment feedback.

#### MLI-018: Minimum Bounding Box Clamping Preventing Dimension Inversion
- **Problem / Current Gap**: Dragging a handle past the opposite handle inverts width or height to negative numbers, corrupting downstream inspection algorithms.
- **Proposed Engineering Solution**: Enforce `minWidth = 16px` and `minHeight = 16px` clamping in `coords.ts` `clampRectToBounds`. When drag displacement would invert dimensions, stop movement at the minimum threshold.
- **Target Files / Components**: `src/lib/editor/coords.ts`, `src/components/editor/canvas/useSelectionOverlayGestures.ts`
- **Impact**: Eliminates dimension inversion crashes and prevents corrupt negative-geometry payloads.

#### MLI-019: Separate Dedicated Rotation Grip Stem with 15° Angle Snapping
- **Problem / Current Gap**: Rotation handles placed directly on corner resize grips create frequent mis-clicks between resizing and rotating.
- **Proposed Engineering Solution**: Elevate the rotation handle onto a distinct vertical stem 24px above the top-center edge (`SelectionOverlayRotationHandles.tsx`). Support Shift modifier snapping to deterministic 15° increments (0°, 15°, 30°, 45°, 90°).
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlayRotationHandles.tsx`, `src/lib/editor/rotation.ts`
- **Impact**: Eliminates mis-clicks between resizing and rotating, providing clean angular adjustments with tactile snapping.

#### MLI-020: High-DPI Canvas Coordinate Normalization for Multi-Monitor Ratios
- **Problem / Current Gap**: Dragging handles across mixed-DPI multi-monitor setups (e.g. 4K cleanroom display alongside 1080p laptop) introduces coordinate scaling offsets.
- **Proposed Engineering Solution**: Normalize all pointer events by dividing by `window.devicePixelRatio` and canvas client bounding rect in `CanvasViewportUtils.ts`, converting directly into invariant normalized device coordinates.
- **Target Files / Components**: `src/lib/editor/coords.ts`, `src/components/editor/canvas/CanvasViewportUtils.ts`, `src/components/editor/canvas/CanvasViewport.tsx`
- **Impact**: Flawless, pixel-accurate handle physics across high-DPI retina and multi-monitor industrial setups.

---

### Category 3: Header Grip Bar & Spatial Drag Separation (Items MLI-021 to MLI-030)

#### MLI-021: Dedicated ROI Top Grip Header Bar for Intentional Translation
- **Problem / Current Gap**: Clicking anywhere inside an ROI currently triggers drag movement, preventing operators from selecting child markers or drawing nested exclusion masks.
- **Proposed Engineering Solution**: Introduce a dedicated top grip header bar (`h-6 rounded-t-md bg-zinc-900/90 text-white`) with six-dot grip texture (`GripHorizontal`). Restrict whole-ROI translation exclusively to pointer drags originating from this header bar.
- **Target Files / Components**: `src/components/vision/RoiBadge.tsx`, `src/components/editor/canvas/CanvasRoiLayer.tsx`, `src/components/editor/canvas/SelectionOverlay.tsx`
- **Impact**: Completely separates whole-ROI translation from interior editing, preventing accidental box displacement.

#### MLI-022: Interior Surface Click-Through for Nested Annotation Creation
- **Problem / Current Gap**: Drawing child inspection shapes (e.g. pin markers, solder balls) inside an existing ROI is blocked by the parent overlay capturing pointer events.
- **Proposed Engineering Solution**: Set `pointer-events-none` on the central body of `SelectionOverlay.tsx`. Only the border strokes, resize handles, and header grip bar capture pointer events, allowing clicks to pass through to canvas drawing tools.
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlay.tsx`, `src/components/vision/white-box/PatternCanvas.tsx`
- **Impact**: Operators seamlessly draw nested inspection features inside an ROI without tedious layer deselection.

#### MLI-023: Header Chip Color-Coding and Rule Type Indicator
- **Problem / Current Gap**: On complex boards with dozens of inspection rules, identifying rule types requires cross-referencing names in the sidebar.
- **Proposed Engineering Solution**: Render a mini rule-type icon (`Square`, `Crosshair`, `Shield`, `Palette`) and color swatch tag in the header grip bar, using unified tokens from `kind-icons.ts`.
- **Target Files / Components**: `src/components/vision/RoiBadge.tsx`, `src/lib/editor/kind-icons.ts`, `src/types/rules/RuleKind.ts`
- **Impact**: Provides instant visual identification of inspection rule types directly on the canvas surface.

#### MLI-024: Header Grip Bar Spatial Collision Avoidance Near Canvas Top Edge
- **Problem / Current Gap**: When an ROI hugs the top edge of the canvas (`y < 30px`), an external top header bar renders offscreen and becomes inaccessible.
- **Proposed Engineering Solution**: Implement dynamic collision flipping: if `region.y < 32px`, flip the header grip bar to render inside the top edge of the ROI (`top: 0`) rather than outside (`top: -26px`).
- **Target Files / Components**: `src/components/vision/white-box/RoiToolbar.tsx`, `src/components/editor/canvas/SelectionOverlayDimensionHud.tsx`, `src/components/vision/RoiBadge.tsx`
- **Impact**: Header grip bar remains 100% accessible even when inspection regions are placed against canvas borders.

#### MLI-025: Quick Lock/Unlock Toggle on Header Grip Pill
- **Problem / Current Gap**: Locking an ROI requires navigating to the right-side layers panel, slowing down recipe authoring workflows.
- **Proposed Engineering Solution**: Embed an interactive lock button (`Lock`/`Unlock` icon, 14px) on the right side of the header grip bar. Clicking it immediately toggles `isLocked` in state.
- **Target Files / Components**: `src/components/vision/RoiBadge.tsx`, `src/components/vision/layers/PhotoshopLayersPanel.tsx`, `src/lib/editor/store/rules-slice.ts`
- **Impact**: One-click in-place locking prevents accidental edits to finalized inspection zones.

#### MLI-026: Double-Click on Header Grip to Auto-Fit Bounding Box to Detected Features
- **Problem / Current Gap**: Tightening an ROI around a semiconductor chip requires manual dragging of all four corner handles.
- **Proposed Engineering Solution**: Listen for `onDoubleClick` on the header grip bar. Calculate the bounding box of detected high-contrast feature edges within the current region and smoothly animate ROI bounds to fit.
- **Target Files / Components**: `src/components/vision/white-box/PatternCanvas.tsx`, `src/components/vision/white-box/pattern-geometry.ts`
- **Impact**: Cuts region sizing time from 15 seconds to a single double-click.

#### MLI-027: Keyboard Arrow Nudging from Focused Header Grip Bar
- **Problem / Current Gap**: Positioning an ROI by single-pixel increments using a mouse is tedious and prone to hand-tremor offsets.
- **Proposed Engineering Solution**: When the header grip bar receives focus, handle keyboard arrow keys (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` via `KeyboardKeyType`). Nudge position by 1px (or 10px with Shift).
- **Target Files / Components**: `src/components/editor/canvas/useCanvasViewportKeyboard.ts`, `src/types/ui/KeyboardKeyType.ts`
- **Impact**: Provides tactile single-pixel precision positioning for micro-scale semiconductor alignment.

#### MLI-028: Header Grip Hover State & Tactile Elevation Shadows
- **Problem / Current Gap**: Header bars appear flat and unresponsive, providing no visual indication that they are draggable controls.
- **Proposed Engineering Solution**: Add Tailwind hover states: `hover:shadow-lg hover:border-ca-accent transition-all duration-150` and cursor switching to `cursor-grab` (and `cursor-grabbing` while active).
- **Target Files / Components**: `src/components/vision/RoiBadge.tsx`, `src/components/editor/canvas/SelectionOverlay.tsx`
- **Impact**: Clear affordance informs operators immediately that the region header can be moved.

#### MLI-029: Header Readout Displaying Real-World Millimeter Coordinates
- **Problem / Current Gap**: Header readouts display only raw camera pixel coordinates, forcing operators to manually calculate physical millimetric dimensions.
- **Proposed Engineering Solution**: If camera optical calibration is present in `CameraSettingsForm`, display dual units in the header bar: `X: 1240px (12.4mm) • W: 400px (4.0mm)`.
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlayDimensionHud.tsx`, `src/components/vision/standard/StandardHeaderReadouts.tsx`
- **Impact**: Eliminates manual math errors during machine vision calibration against physical engineering drawings.

#### MLI-030: Header Right-Click Quick Context Menu Integration
- **Problem / Current Gap**: Right-clicking the header bar triggers standard browser context menus rather than inspection rule actions.
- **Proposed Engineering Solution**: Attach `onContextMenu` handler to the header bar, opening `SelectionOverlayContextMenu.tsx` with actions: Duplicate, Lock, Delete, Solo, Invert Mask, and Export Template.
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlayContextMenu.tsx`, `src/components/vision/RoiBadge.tsx`
- **Impact**: Operators access all rule manipulation commands instantly without leaving the canvas.

---

### Category 4: In-ROI Floating Action Toolbar & Tool Icons (Items MLI-031 to MLI-040)

#### MLI-031: In-ROI Floating Action Toolbar Anchoring Engine
- **Problem / Current Gap**: Tool action buttons are scattered across the top menubar and side panels, forcing repetitive mouse travel between canvas and sidebar.
- **Proposed Engineering Solution**: Build an intelligent anchoring engine in `RoiToolbar.tsx` that docks a compact floating toolbar 8px below the bottom edge of the active ROI. If the bottom edge exceeds canvas height, automatically dock to the outside right or inside bottom.
- **Target Files / Components**: `src/components/vision/white-box/RoiToolbar.tsx`, `src/components/editor/canvas/SelectionOverlayQuickActions.tsx`
- **Impact**: Reduces operator cursor travel distance by over 70% during continuous inspection tuning.

#### MLI-032: High-Density Lucide Tool Iconography Integration
- **Problem / Current Gap**: Current quick actions only support generic Copy and Trash icons, lacking inspection-specific actions.
- **Proposed Engineering Solution**: Integrate high-density 14px Lucide icons into `SelectionOverlayQuickActions.tsx`: `Sliders` (tune parameters), `Sparkles` (auto-tune), `Crosshair` (center), `Copy` (duplicate), `Eye` (solo), and `Trash2` (delete).
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlayQuickActions.tsx`, `src/components/vision/white-box/RoiToolbar.tsx`
- **Impact**: Delivers intuitive, professional visual toolbars adhering to modern CAD/CAM UI standards.

#### MLI-033: One-Click Duplicate with Smart Spatial Offset (+20px, +20px)
- **Problem / Current Gap**: Duplicating an ROI places the clone directly on top of the original, creating confusing overlaps where operators think the action failed.
- **Proposed Engineering Solution**: In `rules-slice.ts` duplicate handler, apply a smart diagonal offset: `clone.x = original.x + 20; clone.y = original.y + 20; clone.name = "${original.name} (Copy)"`.
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlayQuickActions.tsx`, `src/lib/editor/store/rules-slice.ts`
- **Impact**: Visual feedback is immediate; operators see the duplicated inspection box instantly.

#### MLI-034: In-Toolbar Threshold / Sensitivity Quick Slider
- **Problem / Current Gap**: Adjusting binarization threshold requires switching tabs to the properties panel, hiding live canvas feedback.
- **Proposed Engineering Solution**: Embed an interactive micro-slider (width: 80px, range: 0–255) inside the floating toolbar (`SelectionOverlayQuickProps.tsx`), updating grayscale threshold live on the canvas.
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlayQuickProps.tsx`, `src/components/vision/white-box/GreyscaleSliderCard.tsx`
- **Impact**: Allows rapid real-time threshold calibration while watching canvas pixel changes directly.

#### MLI-035: In-Toolbar Shape Type Switcher (Rect, Circle, Polygon)
- **Problem / Current Gap**: Changing an ROI shape from rectangular to circular requires deleting the rule and recreating it from scratch.
- **Proposed Engineering Solution**: Add a 3-way segmented shape icon button (`Square`, `Circle`, `Hexagon`) in `RoiToolbar.tsx` that morphs geometry while preserving centroid and bounding area.
- **Target Files / Components**: `src/components/vision/white-box/RoiToolbar.tsx`, `src/components/vision/MaskTools.tsx`, `src/domain/vision/shapes.ts`
- **Impact**: Instant one-click shape conversion without losing configured inspection thresholds.

#### MLI-036: In-Toolbar Inspection Result Pill (Pass/Fail/Margin Badge)
- **Problem / Current Gap**: Inspection pass/fail results appear only in the bottom status panel, disconnected from the spatial position of the component.
- **Proposed Engineering Solution**: Render a mini telemetry pill docked to the top-right of the ROI: green `PASS 98.4%` or red `FAIL 62.1%` with tabular monospace numbers (`ScoreResultBadge.tsx`).
- **Target Files / Components**: `src/components/vision/ScoreResultBadge.tsx`, `src/components/vision/white-box/RoiToolbar.tsx`
- **Impact**: Operators immediately pinpoint defective semiconductor pins directly on the physical component.

#### MLI-037: Expandable Popover Flyout for Advanced Inspection Parameters
- **Problem / Current Gap**: Complex parameters (e.g. edge gradient filter size, polarity, sub-pixel interpolation) clutter the main canvas when exposed.
- **Proposed Engineering Solution**: Add a `More Settings` button triggering an anchored Radix UI Popover containing advanced parameters directly attached to the floating toolbar.
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlayQuickProps.tsx`, `src/components/vision/standard/workbench/StandardWorkbenchCanvas.tsx`
- **Impact**: Maintains a minimal, clean toolbar while granting immediate access to advanced tuning options.

#### MLI-038: Toolbar Hover Delay & Fade Transition Optimization
- **Problem / Current Gap**: Moving mouse between ROI border and floating toolbar causes the toolbar to abruptly unmount and flicker.
- **Proposed Engineering Solution**: Implement a 150ms leave debounce in `RoiToolbar.tsx` with smooth CSS opacity transition (`transition-opacity duration-150`).
- **Target Files / Components**: `src/components/vision/white-box/RoiToolbar.tsx`
- **Impact**: Eliminates jitter and annoying toolbar disappearing glitches during mouse transit.

#### MLI-039: Solo Layer Mode Toggle from Floating Toolbar
- **Problem / Current Gap**: On high-density PCBs with 50+ inspection zones, isolating a single rule requires manually clicking the eye icon on 49 other layers.
- **Proposed Engineering Solution**: Add a `Solo` eye icon to the floating toolbar. Clicking it isolates the active ROI, temporarily dimming all other layers to 10% opacity.
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlayQuickActions.tsx`, `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Impact**: Instant visual isolation of complex rules on crowded semiconductor boards.

#### MLI-040: Industrial Operator Quick-Calibrate Action Button
- **Problem / Current Gap**: Capturing the current image under the ROI as the golden master template requires multiple navigation steps.
- **Proposed Engineering Solution**: Add a `Set as Golden` camera button on the floating toolbar that crops the ROI pixel buffer and stores it as the reference template in one click.
- **Target Files / Components**: `src/components/vision/white-box/RoiToolbar.tsx`, `src/components/vision/standard/StandardActionBar.tsx`, `src/lib/vision/white-box-marking.ts`
- **Impact**: Speeds up machine vision recipe calibration on industrial production lines.

---

### Category 5: Photoshop Layers Panel & Visual Stacking (Items MLI-041 to MLI-050)

#### MLI-041: Photoshop-Grade Visual Layer Hierarchy & Type Badging
- **Problem / Current Gap**: In `PhotoshopLayersPanel.tsx`, layers appear as plain text rows with minimal visual distinction between image, ROI, pattern, and mask types.
- **Proposed Engineering Solution**: Modernize `VisionLayerRow.tsx` with color-coded type badges (`#00e5ff` for ROI, `#10b981` for Pattern, `#f59e0b` for Mask) and clear status indicators.
- **Target Files / Components**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`, `src/components/vision/layers/VisionLayerRow.tsx`, `src/components/editor/layers/LayerRow.tsx`
- **Impact**: Crystal-clear visual hierarchy matching industry-standard design tools.

#### MLI-042: Layer Thumbnail Live Preview Generator
- **Problem / Current Gap**: Operators cannot see what visual feature each layer represents without clicking through every item in the list.
- **Proposed Engineering Solution**: Implement a lightweight 24x24 offscreen canvas in `LayerRow.tsx` that generates a live cropped thumbnail preview of each layer's underlying image region.
- **Target Files / Components**: `src/components/editor/layers/LayerRow.tsx`, `src/components/vision/layers/PhotoshopLayersPanel.tsx`, `src/components/vision/white-box/canvas-drawing.ts`
- **Impact**: Immediate visual identification of layers (e.g. Pin 1 hole, IC body, fiducial mark) via live thumbnails.

#### MLI-043: Z-Index Ordering & Stacking Reconciliation Between Canvas and DOM
- **Problem / Current Gap**: Top item in the layers list sometimes renders underneath other shapes on the canvas due to inverted loop ordering.
- **Proposed Engineering Solution**: Standardize layer array ordering: index 0 is top-most visually (renders last on canvas, highest `z-index`). Invert canvas rendering loops systematically so DOM and canvas always agree.
- **Target Files / Components**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`, `src/components/editor/canvas/CanvasRoiLayer.tsx`, `src/lib/editor/store/rules-slice.ts`
- **Impact**: 100% predictable z-index stacking where layers panel order matches canvas front-to-back rendering exactly.

#### MLI-044: Layer Opacity Slider & Blend Modes (Normal, Multiply, Screen, Difference)
- **Problem / Current Gap**: Overlay layers cannot be blended with camera feeds, making it difficult to detect subtle surface defect anomalies.
- **Proposed Engineering Solution**: Add `opacity` (0–100%) and `blendMode` properties to `VisionLayerItem` in `types.ts`. Expose blend mode dropdown (`Normal`, `Multiply`, `Difference`) in `LayersToolbar.tsx`.
- **Target Files / Components**: `src/components/vision/layers/types.ts`, `src/components/editor/layers/LayersToolbar.tsx`, `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Impact**: Enables difference-blending modes to spot 1-pixel defects between reference and live camera feeds.

#### MLI-045: Layer Lock State Disabling Canvas Manipulation and Highlighting Lock Icon
- **Problem / Current Gap**: Locking a layer in the panel still allows accidental dragging on the canvas if pointer down hits a corner handle.
- **Proposed Engineering Solution**: Propagate `isLocked` state strictly to `useSelectionOverlayGestures.ts`. If `isLocked === true`, disable all handle hit tests and cursor changes, displaying an explicit unlock toast on attempt.
- **Target Files / Components**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`, `src/components/editor/canvas/useSelectionOverlayGestures.ts`, `src/components/vision/white-box/useCanvasPointerDrag.ts`
- **Impact**: Rock-solid freeze protection for calibrated reference zones.

#### MLI-046: Eye Icon Visibility Toggling with Canvas Rendering Bypass
- **Problem / Current Gap**: Hiding a layer toggles CSS opacity but still evaluates computationally expensive vision detection algorithms on every frame.
- **Proposed Engineering Solution**: Check `!layer.isHidden` in the execution loop of `CanvasViewportRenderer.ts`. If hidden, completely bypass canvas drawing and vision detection passes.
- **Target Files / Components**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`, `src/components/editor/canvas/CanvasViewportRenderer.ts`
- **Impact**: Saves valuable CPU/GPU render time by completely omitting hidden layers from the render pipeline.

#### MLI-047: Inline Double-Click Layer Renaming with Keyboard Commit
- **Problem / Current Gap**: Renaming an inspection rule requires opening a property drawer on the right sidebar.
- **Proposed Engineering Solution**: Implement inline editing directly in `LayerRow.tsx` via `InlineEdit.tsx`. Double-clicking layer text transforms it into an input box; Enter commits, Escape cancels.
- **Target Files / Components**: `src/components/editor/layers/LayerRow.tsx`, `src/components/ui/InlineEdit.tsx`
- **Impact**: Streamlines workflow by letting operators organize and label layers directly in place.

#### MLI-048: Group Folder Nesting & Collapsible Layer Trees
- **Problem / Current Gap**: High pin-count packages (e.g. 256-pin BGA) result in unwieldy flat layer lists of hundreds of rows.
- **Proposed Engineering Solution**: Support collapsible `RuleGroup` items in `LayersPanel.tsx` with folder expand/collapse icons (`Folder`, `FolderOpen`, `ChevronRight`, `ChevronDown`).
- **Target Files / Components**: `src/components/editor/layers/LayersPanel.tsx`, `src/lib/editor/store/rules-slice.ts`
- **Impact**: Cleanly organizes hundreds of inspection pins into structured logical groups (e.g. "Quadrant 1", "Power Pins").

#### MLI-049: Context Menu Actions (Duplicate, Delete, Bring to Front, Send to Back)
- **Problem / Current Gap**: Right-clicking a layer row currently opens generic browser context menus.
- **Proposed Engineering Solution**: Add custom `ContextMenuState` in `PhotoshopLayersPanel.tsx` with actions: `Bring to Front`, `Send to Back`, `Duplicate`, `Lock`, `Delete`, and `Group Selected`.
- **Target Files / Components**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`, `src/components/editor/canvas/ContextMenuItems.tsx`
- **Impact**: Matches standard desktop graphics application workflows for layer hierarchy management.

#### MLI-050: Layer Color Swatch Assignment for Quick Visual Tagging
- **Problem / Current Gap**: All layer rows use identical monochromatic styling, making it hard to categorize rules by inspection type.
- **Proposed Engineering Solution**: Add color swatch picker to each layer row using palette tokens from `RuleColor.ts`. Display a 3px vertical color bar on the left edge of each layer row.
- **Target Files / Components**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`, `src/types/rules/RuleColor.ts`, `src/components/editor/layers/LayerRow.tsx`
- **Impact**: Enables instant visual filtering and categorization across multi-step inspection recipes.

---

### Category 6: Drag-and-Drop Reordering & Multi-Layer Selection (Items MLI-051 to MLI-060)

#### MLI-051: HTML5 Drag-and-Drop Reordering Engine with Blue Insertion Indicator Bar
- **Problem / Current Gap**: Reordering layers via drag-and-drop provides no visual indication of where the dragged item will land, causing accidental misplaced drops.
- **Proposed Engineering Solution**: In `useLayerDnd.ts`, compute pointer `y` relative to row height. Render an active 2px royal blue insertion bar (`border-b-2 border-ca-accent`) above or below the target row.
- **Target Files / Components**: `src/hooks/editor/useLayerDnd.ts`, `src/components/editor/layers/LayersPanel.tsx`, `src/components/editor/layers/LayerRow.tsx`
- **Impact**: Gives operators pixel-precise feedback on exact reordering drop locations.

#### MLI-052: Keyboard-Driven Reordering using Alt+Up / Alt+Down
- **Problem / Current Gap**: Cleanroom operators wearing gloves cannot reliably perform drag-and-drop gestures using touchpads or trackballs.
- **Proposed Engineering Solution**: In `keyboard-controller.ts`, map `Alt+ArrowUp` and `Alt+ArrowDown` (using `KeyboardKeyType`) to reorder the selected layer up or down in the stack.
- **Target Files / Components**: `src/lib/editor/dnd/keyboard-controller.ts`, `src/components/editor/layers/LayersPanel.tsx`, `src/types/ui/KeyboardKeyType.ts`
- **Impact**: 100% accessible keyboard-driven reordering for cleanroom operations.

#### MLI-053: Multi-Layer Selection via Shift-Click Range and Ctrl/Cmd-Click Toggle
- **Problem / Current Gap**: Operators can only select one layer at a time, making batch operations (deleting or moving 20 pins) painfully repetitive.
- **Proposed Engineering Solution**: Maintain `selectedIds: readonly string[]` in `rules-slice.ts`. Handle `Shift+Click` for contiguous range selection and `Ctrl/Cmd+Click` for discrete multi-selection.
- **Target Files / Components**: `src/components/editor/layers/LayersPanel.tsx`, `src/lib/editor/store/rules-slice.ts`, `src/lib/enums/editor.ts`
- **Impact**: Enables instant batch selection across dozens of inspection rules simultaneously.

#### MLI-054: Batch Grouping & Ungrouping of Multi-Selected Layers (Ctrl+G / Ctrl+Shift+G)
- **Problem / Current Gap**: Grouping rules requires manually creating a folder and moving items into it one by one.
- **Proposed Engineering Solution**: Add `onGroupSelected` action triggered by `Ctrl+G`: create a new `RuleGroup`, move all selected layer IDs into it, and focus the group name for renaming. Support `Ctrl+Shift+G` to ungroup.
- **Target Files / Components**: `src/components/editor/layers/LayersToolbar.tsx`, `src/lib/editor/store/rules-slice.ts`, `src/lib/shortcuts/registry.ts`
- **Impact**: Reduces complex multi-layer grouping workflows to a single keyboard shortcut.

#### MLI-055: Multi-Layer Batch Transform (Move, Resize, Align)
- **Problem / Current Gap**: When multiple layers are selected, transform handles disappear and only the primary layer moves.
- **Proposed Engineering Solution**: In `SelectionOverlay.tsx`, compute the composite bounding box of all selected layers. Render transform handles on the composite box and translate/scale all child layers proportionally during drags.
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlay.tsx`, `src/lib/editor/align.ts`
- **Impact**: Allows uniform repositioning and scaling of entire chip lead-frame pin constellations at once.

#### MLI-056: Drag-to-Group Drag-and-Drop Target Highlighting
- **Problem / Current Gap**: Dragging layers into a folder group gives no feedback whether the item will drop inside the folder or next to it.
- **Proposed Engineering Solution**: When dragging over a group header row, detect hover state and apply an inner highlight (`ring-2 ring-ca-accent bg-ca-panel-2`). Dropping nests the layer inside that group.
- **Target Files / Components**: `src/hooks/editor/useLayerDnd.ts`, `src/components/editor/layers/LayerRow.tsx`
- **Impact**: Clear, unmistakable visual feedback when nesting layers into folders.

#### MLI-057: Auto-Scroll on Dragging Near Panel Top/Bottom Edges
- **Problem / Current Gap**: Dragging an item past the visible viewport of a long layers list halts at the boundary instead of scrolling.
- **Proposed Engineering Solution**: In `useLayerDnd.ts`, detect pointer proximity to panel edges (`y < 30px` or `y > panelHeight - 30px`). Initiate smooth auto-scrolling with speed proportional to edge proximity.
- **Target Files / Components**: `src/components/editor/layers/LayersPanel.tsx`, `src/hooks/editor/useLayerDnd.ts`
- **Impact**: Seamless reordering across lists containing hundreds of inspection layers.

#### MLI-058: Drag Ghost Preview with Layer Count Badge for Batch Drags
- **Problem / Current Gap**: Dragging multiple items shows a faint single-item ghost, making operators question if all selected items are being moved.
- **Proposed Engineering Solution**: Construct a custom drag ghost element displaying a stack icon, the primary layer name, and a high-contrast badge (e.g. `+12 items`) during multi-item drags.
- **Target Files / Components**: `src/hooks/editor/useLayerDnd.ts`, `src/components/editor/layers/LayersPanel.tsx`
- **Impact**: Operator confidence is maintained during high-volume batch reordering tasks.

#### MLI-059: Multi-Layer Batch Deletion with Confirmation Guard
- **Problem / Current Gap**: Pressing Delete deletes only the last-selected item or silently destroys work without an undo option.
- **Proposed Engineering Solution**: Pressing `Delete` deletes all selected layer IDs in a single atomic undoable action, surfacing an immediate Sonner toast notification with a 5-second `Undo` button.
- **Target Files / Components**: `src/components/editor/layers/LayersToolbar.tsx`, `src/lib/editor/store/rules-slice.ts`
- **Impact**: Eliminates accidental data loss while accelerating batch layer cleanup.

#### MLI-060: Multi-Layer Alignment Toolbar (Align Left, Center, Right, Top, Middle, Bottom, Distribute)
- **Problem / Current Gap**: Distributing inspection boxes evenly across lead frames requires manual pixel math.
- **Proposed Engineering Solution**: Add CAD-standard alignment buttons to `LayersToolbar.tsx`: `Align Left`, `Align Center`, `Align Right`, `Align Top`, `Align Middle`, `Align Bottom`, `Distribute Horizontally`, `Distribute Vertically`.
- **Target Files / Components**: `src/components/editor/layers/LayersToolbar.tsx`, `src/lib/editor/align.ts`
- **Impact**: Instantly aligns and distributes 32+ pin inspection zones with mathematical precision.

---

### Category 7: Visual Styling, High-Contrast Handles & Elimination of Glitches (Items MLI-061 to MLI-070)

#### MLI-061: Elimination of Giant Purple Scrollbar and Overflow Leakage
- **Problem / Current Gap**: In certain desktop resolutions, `LayersPanel.tsx` exhibits an unstyled giant purple OS scrollbar and right-gutter overflow clipping issues.
- **Proposed Engineering Solution**: Apply unified CSS scrollbar utility classes: `scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent overflow-y-auto overflow-x-hidden`. Enforce `box-sizing: border-box` on all list containers.
- **Target Files / Components**: `src/components/editor/layers/LayersPanel.tsx`, `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Impact**: Eliminates ugly OS scrollbar glitches, reclaiming 16px of panel width for layer information.

#### MLI-062: High-Contrast Handle Knobs with Dual-Tone Strokes (White Inner / Dark Outer)
- **Problem / Current Gap**: Single-color handles disappear when rendered over matching backgrounds (e.g. black handles over dark IC packages or white handles over bright solder pads).
- **Proposed Engineering Solution**: Implement dual-tone handle styling in `SelectionOverlayHandles.tsx`: 8px square with `#00e5ff` cyan fill, 1px pure white inner stroke (`#ffffff`), and 1px dark charcoal outer shadow border (`rgba(0,0,0,0.85)`).
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlayHandles.tsx`, `src/components/editor/canvas/SelectionOverlayConstants.ts`
- **Impact**: Handles remain 100% visible against any background luminance, from 0 (pitch black) to 255 (specular white).

#### MLI-063: Sub-Pixel Antialiasing Glitch Elimination on Canvas Bounds
- **Problem / Current Gap**: Canvas 2D stroke operations at non-integer pixel coordinates result in blurry, washed-out 2px lines instead of crisp 1px borders.
- **Proposed Engineering Solution**: Snap coordinate stroke paths to half-pixel offsets `Math.floor(x) + 0.5` in `canvas-drawing.ts` when line width is 1px, ensuring sharp pixel antialiasing.
- **Target Files / Components**: `src/components/vision/white-box/canvas-drawing.ts`, `src/components/editor/canvas/CanvasViewportRenderer.ts`
- **Impact**: Renders ultra-crisp, hairline 1px inspection borders without blurry fuzziness.

#### MLI-064: Flicker-Free Double-Buffered Rendering Pass for Transform Operations
- **Problem / Current Gap**: Resizing an ROI rapidly causes momentary white flashes on low-end industrial IPC hardware as the canvas clears before drawing.
- **Proposed Engineering Solution**: Implement an offscreen canvas rendering buffer in `PatternCanvas.tsx`. Perform all clear and draw passes offscreen, then copy to the visible canvas in a single atomic `drawImage` call.
- **Target Files / Components**: `src/components/vision/white-box/PatternCanvas.tsx`, `src/components/vision/ZoomableCanvas.tsx`
- **Impact**: 100% flicker-free interactive resizing and rotating even on resource-constrained embedded IPCs.

#### MLI-065: High-Precision Coordinate Badge with Contrast Pill Backdrop
- **Problem / Current Gap**: Dimension readouts (`124 x 86`) placed without backdrops become illegible when overlapping busy circuit board traces.
- **Proposed Engineering Solution**: In `SelectionOverlayDimensionHud.tsx`, wrap dimension text in a high-contrast pill badge with `bg-black/85 text-cyan-300 font-mono text-[11px] px-1.5 py-0.5 rounded shadow-sm backdrop-blur-xs`.
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlayDimensionHud.tsx`
- **Impact**: Dimension readouts remain crisp and effortlessly readable regardless of underlying image texture.

#### MLI-066: Removal of Stuck Hover Rings on Mouse Leave
- **Problem / Current Gap**: Moving cursor quickly out of an ROI can leave its hover state ring permanently displayed until another element is hovered.
- **Proposed Engineering Solution**: Attach `onPointerLeave` listener on canvas viewport root. Ensure `activeStateId` is reset to `null` whenever pointer coordinates exit the canvas bounding rect.
- **Target Files / Components**: `src/components/vision/RoiBadge.tsx`, `src/components/editor/canvas/CanvasRoiLayer.tsx`, `src/lib/editor/store/rules-slice.ts`
- **Impact**: Eliminates annoying "stuck hover ring" UI artifacts across all inspection boxes.

#### MLI-067: Theme-Aware Contrast Ratios (WCAG 2.1 AAA 7:1) for Industrial Dark/Light Themes
- **Problem / Current Gap**: Gray text labels in `PhotoshopLayersPanel.tsx` fail WCAG contrast ratios in bright cleanroom lighting environments.
- **Proposed Engineering Solution**: Standardize UI colors to tokenized contrast variables satisfying 7:1 AAA ratios: replace muted `text-zinc-500` with `text-zinc-200` in dark mode and `text-zinc-800` in light mode.
- **Target Files / Components**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`, `src/components/editor/canvas/SelectionOverlayConstants.ts`
- **Impact**: Prevents eye fatigue and guarantees readability under intense overhead cleanroom fluorescent lamps.

#### MLI-068: Hardware-Accelerated CSS Layer Promotion via `transform: translate3d`
- **Problem / Current Gap**: DOM-based handles and badges cause frequent repaints of the entire viewport when animated.
- **Proposed Engineering Solution**: Promote all interactive selection overlays to dedicated GPU compositing layers using `transform: translate3d(x, y, 0)` and `will-change: transform`.
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlay.tsx`, `src/components/vision/RoiBadge.tsx`
- **Impact**: Uncouples overlay translation from main DOM repaint cycles, dropping CPU usage during drags by 40%.

#### MLI-069: Smooth Cubic-Bezier Handle Scale Transitions on Hover
- **Problem / Current Gap**: Handles expand abruptly on mouseover, creating a distracting, jarring visual pop.
- **Proposed Engineering Solution**: Add smooth transition timing to handle knobs: `transition: transform 120ms cubic-bezier(0.16, 1, 0.3, 1)`, smoothly scaling from `scale(1)` to `scale(1.25)` on hover.
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlayHandles.tsx`
- **Impact**: Delivers a tactile, polished feel that matches premier industrial CAD software.

#### MLI-070: Prevention of Text Selection During Canvas Drag Gestures
- **Problem / Current Gap**: Dragging an ROI across canvas text or UI labels accidentally highlights DOM text, disrupting the inspection workflow.
- **Proposed Engineering Solution**: Set `user-select: none` and `touch-action: none` on `CanvasViewport.tsx` root container while a drag operation is active.
- **Target Files / Components**: `src/components/editor/canvas/CanvasViewport.tsx`, `src/components/vision/white-box/PatternCanvas.tsx`
- **Impact**: Prevents annoying blue text-highlight selections during rapid canvas drag-and-drop operations.

---

### Category 8: Multi-Shape Support & Template Extraction (Items MLI-071 to MLI-080)

#### MLI-071: Multi-Shape ROI Geometry Model (Rect, RotatedRect, Circle, Annulus, Polygon)
- **Problem / Current Gap**: Vision models currently assume all ROIs are rectangular, making circular wafer alignment and donut-shaped BGA ball inspections awkward.
- **Proposed Engineering Solution**: Expand `ShapeType` model in `shapes.ts` with dedicated geometry schemas: `CircleGeometry { cx, cy, radius }`, `AnnulusGeometry { cx, cy, innerRadius, outerRadius }`, and `PolygonGeometry { points: Point[] }`.
- **Target Files / Components**: `src/domain/vision/shapes.ts`, `src/components/vision/white-box/types.ts`, `src/lib/editor/types.ts`
- **Impact**: Enables native inspection of circular semiconductor wafers, fiducials, and solder ball grids.

#### MLI-072: Circular & Annular ROI Transform Handles (Radius & Ring Thickness Grips)
- **Problem / Current Gap**: Circular ROIs currently render 8 rectangular bounding box handles, confusing operators trying to adjust circular radii.
- **Proposed Engineering Solution**: Render specialized circular handles: a single radial perimeter handle for circle radius, and dual concentric handles for annular inner/outer ring thickness.
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlayHandles.tsx`, `src/components/vision/standard/tools/StandardCircleGaugeTool.tsx`
- **Impact**: Intuitive, direct manipulation of circular and donut inspection regions.

#### MLI-073: Polygon Vertex Editing and Dynamic Vertex Addition/Removal
- **Problem / Current Gap**: Irregular PCB cutout regions cannot be tightly bounded with standard rectangles or circles.
- **Proposed Engineering Solution**: Implement interactive polygon editing in `SelectionOverlay.tsx`: render vertex handles on each polygon corner. Double-clicking an edge adds a new vertex; clicking a vertex and pressing `Delete` removes it.
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlay.tsx`, `src/lib/editor/types.ts`
- **Impact**: Allows custom irregular polygon bounding zones around oddly shaped electronic components.

#### MLI-074: Sub-Pixel Golden Template Cropping and Normalization Engine
- **Problem / Current Gap**: Cropping reference templates with integer pixel truncation causes sub-pixel alignment offsets in normalized cross-correlation (NCC) matching.
- **Proposed Engineering Solution**: Implement bilinear interpolation resampling in `white-box-marking.ts` `extractTemplateBuffer`, sampling fractional pixel coordinates to produce normalized floating-point template rasters.
- **Target Files / Components**: `src/lib/vision/white-box-marking.ts`, `src/components/vision/white-box/canvas-drawing.ts`
- **Impact**: Improves pattern matching accuracy from ±1.0 pixel to ±0.1 sub-pixel precision.

#### MLI-075: Multi-Shape Template Mask Generation (Binary & Alpha Mask Buffer)
- **Problem / Current Gap**: Template matching matches all pixels inside the bounding box, including irrelevant background noise around circular components.
- **Proposed Engineering Solution**: Generate an 8-bit alpha mask buffer alongside the template raster in `primitive.ts`, setting alpha to 0 for pixels outside circular or polygonal boundaries.
- **Target Files / Components**: `src/lib/editor/mask/primitive.ts`, `src/domain/vision/pattern-search.ts`
- **Impact**: Matches only the active component body, completely ignoring background conveyor tape texture.

#### MLI-076: Rotated Template Extraction with Bilinear Resampling
- **Problem / Current Gap**: Extracting a template from a rotated ROI introduces black corner clipping artifacts when aligned back to horizontal.
- **Proposed Engineering Solution**: Apply inverse rotation transformation matrix `R(-theta)` during template pixel extraction in `white-box-marking.ts`, sampling true rotated pixels and padding bounds cleanly.
- **Target Files / Components**: `src/lib/vision/white-box-marking.ts`, `src/lib/editor/rotation.ts`
- **Impact**: Pristine, rotated golden reference templates without black corner clipping anomalies.

#### MLI-077: Template Preview Card in Recipe Inspector
- **Problem / Current Gap**: Operators have no way to visually verify what golden pattern template is stored in the recipe without running inspection.
- **Proposed Engineering Solution**: Build `TemplatePreviewCard.tsx` inside `PatternGeometryCard.tsx` that renders a crisp zoomed preview of the stored template along with pixel dimensions and grayscale histogram.
- **Target Files / Components**: `src/components/vision/white-box/PatternGeometryCard.tsx`, `src/components/vision/standard/tools/pin1-config/Pin1ReviewPanel.tsx`
- **Impact**: Full transparency into active reference templates, preventing outdated recipe deployments.

#### MLI-078: Template Edge Gradient Extraction for ShapeTrax Contour Matching
- **Problem / Current Gap**: Grayscale correlation fails when ambient lighting shifts; geometric contour matching is needed.
- **Proposed Engineering Solution**: In `ShapeTrax3Tool.tsx`, run Sobel edge extraction over the template buffer to produce normalized vector edge gradient maps `(dx, dy, magnitude)`.
- **Target Files / Components**: `src/components/vision/ShapeTrax3Tool.tsx`, `src/lib/vision/pattern-matching.ts`
- **Impact**: Robust pattern recognition immune to 50% lighting and specular reflection variations.

#### MLI-079: Multi-Template Constellation Persistence (24-Box BGA Grid Alignment)
- **Problem / Current Gap**: Multi-ball BGA inspection requires tracking 24 individual solder balls, but current schemas treat each as an independent rule.
- **Proposed Engineering Solution**: Introduce `ConstellationGeometry` model in `pattern-geometry.ts` storing array of relative sub-regions locked to a master fiducial origin.
- **Target Files / Components**: `src/components/vision/white-box/types.ts`, `src/components/vision/white-box/pattern-geometry.ts`
- **Impact**: Drastically simplifies BGA inspection by treating multi-ball arrays as a single unified constellation.

#### MLI-080: Template Export to PNG / BMP with Embedded Calibration Metadata
- **Problem / Current Gap**: Sharing golden templates across machines requires manual file copying without optical calibration specs.
- **Proposed Engineering Solution**: Add `Export Template` command in `RecipeEditor.tsx` generating a PNG file with embedded tEXt metadata containing `pixelPitchUm`, `threshold`, and `roiGeometry`.
- **Target Files / Components**: `src/components/vision/RecipeEditor.tsx`, `src/lib/editor/json-export.ts`
- **Impact**: Guarantees seamless recipe sharing and golden master synchronization across factory lines.

---

### Category 9: Zoom, Pan & Multi-Viewport Coordinate Synchronization (Items MLI-081 to MLI-090)

#### MLI-081: Cursor-Centric Focal Zoom Engine (Zoom Towards Pointer)
- **Problem / Current Gap**: Canvas zooming currently centers on the viewport origin `(0,0)`, causing the area of interest under the operator's mouse to fly offscreen when zooming in.
- **Proposed Engineering Solution**: In `CanvasViewportZoom.tsx`, compute cursor offset relative to viewport pan: `newPanX = mouseX - (mouseX - panX) * (newZoom / oldZoom)`. Keep image point directly under cursor stationary.
- **Target Files / Components**: `src/components/editor/canvas/CanvasViewportZoom.tsx`, `src/lib/editor/coords.ts`
- **Impact**: Intuitive focal zoom matching Photoshop and Figma standards; zero lost context when zooming.

#### MLI-082: Spacebar-Drag Pan Gesture (Photoshop Hand Tool Ergonomics)
- **Problem / Current Gap**: Panning the canvas requires dragging tiny scrollbars or using two-finger touchpad gestures, which fail on standard cleanroom mice.
- **Proposed Engineering Solution**: In `useCanvasViewportKeyboard.ts`, hold `Spacebar` (via `KeyboardKeyType.isSpace(key)`) to temporarily engage the Hand Pan tool (`cursor-grab`). Left-click dragging pans canvas smoothly.
- **Target Files / Components**: `src/components/editor/canvas/useCanvasViewportKeyboard.ts`, `src/components/editor/canvas/CanvasViewport.tsx`, `src/types/ui/KeyboardKeyType.ts`
- **Impact**: Provides rapid, ergonomic canvas navigation familiar to every graphics and vision engineer.

#### MLI-083: Minimap Overview Viewport with Interactive Panning Rect
- **Problem / Current Gap**: When zoomed into a single microscopic solder joint at 800%, operators lose spatial orientation of where they are on the PCB.
- **Proposed Engineering Solution**: Render a mini 160x90 overview map in the canvas bottom-right corner showing full image thumbnail with a translucent blue rectangle representing current viewport. Dragging the rect pans the main viewport.
- **Target Files / Components**: `src/components/editor/canvas/CanvasViewportRenderer.ts`, `src/components/vision/ZoomableCanvas.tsx`
- **Impact**: Effortless spatial navigation across massive high-resolution (20MP+) PCB inspection images.

#### MLI-084: Dual-Viewport Split View Synchronization (Golden vs Live Inspection)
- **Problem / Current Gap**: In `SplitViewCanvas.tsx`, panning the live image leaves the reference golden image stationary, preventing side-by-side defect comparison.
- **Proposed Engineering Solution**: Bind pan and zoom state to a shared reactive hook in `useStandardWorkbench.ts`. Any zoom or pan action in either viewport updates both canvas views in lockstep.
- **Target Files / Components**: `src/components/vision/SplitViewCanvas.tsx`, `src/components/vision/standard/workbench/StandardWorkbenchCanvas.tsx`, `src/components/vision/standard/workbench/useStandardWorkbench.ts`
- **Impact**: Perfect synchronized inspection for instantaneous side-by-side golden reference comparison.

#### MLI-085: Dynamic Handle Scale Compensation Invariant Across Zoom Levels
- **Problem / Current Gap**: Handles scale with canvas zoom: at 50% zoom they become impossibly tiny (4px), and at 800% zoom they balloon into massive 64px blocks covering the component.
- **Proposed Engineering Solution**: In `SelectionOverlayHandles.tsx`, divide handle screen dimensions by current `viewport.zoom` factor: `cssSize = BASE_HANDLE_SIZE / zoom`, maintaining an invariant 8px visual screen size.
- **Target Files / Components**: `src/components/editor/canvas/SelectionOverlayHandles.tsx`, `src/components/editor/canvas/SelectionOverlayConstants.ts`
- **Impact**: Transform handles maintain optimal visual size and precision at any zoom level from 10% to 1600%.

#### MLI-086: Zoom Presets (Fit to Window, 100% 1:1 Pixel, 200%, 400%) with Quick Shortcuts
- **Problem / Current Gap**: Resetting canvas zoom back to 1:1 or full-frame overview requires tedious manual wheel adjustment.
- **Proposed Engineering Solution**: Add standard zoom preset buttons in `CanvasViewportZoom.tsx` and register shortcuts: `Ctrl+0` (Fit to Window), `Ctrl+1` (100% Actual Size), `Ctrl+2` (200%), `Ctrl+3` (400%).
- **Target Files / Components**: `src/components/editor/canvas/CanvasViewportZoom.tsx`, `src/lib/shortcuts/registry.ts`
- **Impact**: One-click instantaneous jumping between macro board overview and micro solder inspection.

#### MLI-087: Inertial Pan Momentum and Smooth Wheel Damping
- **Problem / Current Gap**: Canvas panning halts abruptly on pointer release, feeling stiff and unnatural on large cleanroom touch monitors.
- **Proposed Engineering Solution**: Add physics-based velocity tracking in `CanvasViewportUtils.ts`: on pointer release, apply smooth exponential decay `velocity *= 0.92` over 250ms for fluid inertial panning.
- **Target Files / Components**: `src/components/editor/canvas/CanvasViewportUtils.ts`, `src/components/editor/canvas/CanvasViewport.tsx`
- **Impact**: Smooth, tactile panning ergonomics on high-refresh rate industrial displays.

#### MLI-088: Sub-Pixel Pixel Grid Overlay Rendering at >400% Zoom
- **Problem / Current Gap**: At extreme zoom (>400%), individual camera sensor pixels blur into smooth gradients without boundary reference.
- **Proposed Engineering Solution**: In `CanvasViewportRenderer.ts`, if `zoom >= 4.0`, render a subtle hairline grid line (`stroke: rgba(255,255,255,0.08)`) outlining every individual camera pixel boundary.
- **Target Files / Components**: `src/components/editor/canvas/CanvasViewportRenderer.ts`
- **Impact**: Empowers vision algorithm engineers to inspect single-pixel edge transitions and Bayer demosaicing boundaries.

#### MLI-089: Viewport Bound Clamping Preventing Lost Canvas Syndrome
- **Problem / Current Gap**: Operators occasionally pan the image entirely outside the viewport, resulting in a blank gray screen and confusion.
- **Proposed Engineering Solution**: Enforce boundary clamping in `coords.ts`: ensure at least 25% of the inspection image remains visible inside the viewport bounds at all times.
- **Target Files / Components**: `src/lib/editor/coords.ts`, `src/components/editor/canvas/CanvasViewportUtils.ts`
- **Impact**: Eliminates "lost image" confusion by keeping the inspection subject always within operator reach.

#### MLI-090: Coordinate Status Bar with Crosshair Readouts and Color Sampler
- **Problem / Current Gap**: Operators lack real-time feedback on exact pixel coordinates and grayscale values under their mouse cursor.
- **Proposed Engineering Solution**: Add a live HUD status strip in `CanvasViewportStatusHud.tsx`: displays `Cursor: (X: 1420, Y: 832) • Intensity: 184 (72%) • RGB: (184, 182, 190)`.
- **Target Files / Components**: `src/components/editor/canvas/CanvasViewportStatusHud.tsx`, `src/components/vision/standard/StandardHeaderReadouts.tsx`
- **Impact**: Instant numerical feedback for lighting consistency, luminance thresholds, and feature coordinates.

---

### Category 10: Ergonomics, Shortcuts, Telemetry & Headless CLI Instrumentation (Items MLI-091 to MLI-100)

#### MLI-091: Standardized Industrial Keyboard Shortcuts Registry (`KeyboardKeyType` Helpers)
- **Problem / Current Gap**: Keyboard shortcuts are scattered across multiple components using brittle chained string comparisons (`e.key === "Enter" || e.key === " "`).
- **Proposed Engineering Solution**: Centralize all keyboard handling through `KeyboardKeyType` compound helpers (`KeyboardKeyType.isEnterOrSpace(e.key)`, `KeyboardKeyType.isEscape(e.key)`) in `src/lib/shortcuts/registry.ts`.
- **Target Files / Components**: `src/lib/shortcuts/registry.ts`, `src/types/ui/KeyboardKeyType.ts`, `src/components/editor/canvas/useCanvasViewportKeyboard.ts`
- **Impact**: Eliminates key-binding regressions and ensures strict compliance with repository complexity standards.

#### MLI-092: Alt-Key Mnemonic Overlays for Cleanroom Navigation
- **Problem / Current Gap**: Operators wearing cleanroom suits cannot use a mouse comfortably and need keyboard access to all on-screen actions.
- **Proposed Engineering Solution**: Enhance `AltMnemonicLayer.tsx`: pressing `Alt` renders visible hotkey badge overlays over every button (e.g. `[1]` for ROI, `[2]` for Mask, `[D]` for Duplicate, `[L]` for Lock).
- **Target Files / Components**: `src/components/shortcuts/AltMnemonicLayer.tsx`, `src/lib/shortcuts/scopes.ts`
- **Impact**: Complete hands-on-keyboard cleanroom operation without touching a mouse.

#### MLI-093: Single-Click Layer Re-ordering via Headless CLI Commands
- **Problem / Current Gap**: Automated recipe generation scripts cannot modify layer stacking orders without manual UI interaction.
- **Proposed Engineering Solution**: Expose headless CLI commands in `src/lib/cli/layer-commands.ts`: `cat-vision layer reorder --recipe=rec1.json --layer=roi-1 --position=front`.
- **Target Files / Components**: `src/lib/cli/layer-commands.ts`, `src/components/editor/layers/LayersPanel.tsx`
- **Impact**: Enables 100% automated headless recipe authoring and CI/CD validation.

#### MLI-094: Headless ROI Geometry Extraction and Verification CLI Facade
- **Problem / Current Gap**: Verifying that recipes conform to semiconductor geometric tolerances requires manual GUI loading.
- **Proposed Engineering Solution**: Implement `cat-vision roi verify --recipe=rec1.json --schema=smt-bga.json` to output structured JSON reporting bounding coordinates, aspect ratios, and layer hierarchy.
- **Target Files / Components**: `src/lib/cli/roi-commands.ts`, `src/lib/editor/store/rules-slice.ts`
- **Impact**: Integrates recipe compliance audits directly into automated factory CI/CD pipelines.

#### MLI-095: High-Frequency Transform Telemetry Ring Buffer
- **Problem / Current Gap**: Console logging during high-frequency mouse drags overwhelms the browser thread and drops frames.
- **Proposed Engineering Solution**: Implement a fixed-capacity (64 entries) in-memory ring buffer in `client-logger.ts` capturing drag velocities, transform deltas, and frame durations without console I/O overhead.
- **Target Files / Components**: `src/lib/observability/client-logger.ts`, `src/components/editor/canvas/useSelectionOverlayGestures.ts`
- **Impact**: Captures high-resolution diagnostic telemetry during gesture anomalies with zero runtime performance cost.

#### MLI-096: Undo/Redo History Stack for Layer Transforms and Hierarchy Edits
- **Problem / Current Gap**: Accidental deletion or dragging of a calibrated ROI cannot be undone, forcing operators to rebuild recipes from scratch.
- **Proposed Engineering Solution**: Implement an immutable command pattern undo/redo stack (50-state capacity) in `rules-slice.ts`. Bind `Ctrl+Z` to undo and `Ctrl+Y` / `Ctrl+Shift+Z` to redo all ROI transforms and layer reorders.
- **Target Files / Components**: `src/lib/editor/store/rules-slice.ts`, `src/lib/shortcuts/registry.ts`
- **Impact**: Complete peace of mind for operators; mistakes are reversed in a single keystroke.

#### MLI-097: Haptic & Audio Feedback for Snap Events and Boundary Collisions
- **Problem / Current Gap**: Cleanroom environments are noisy; operators miss visual alignment guide snaps when eyes are focused on machine fixtures.
- **Proposed Engineering Solution**: Add subtle high-frequency synthetic audio clicks (5ms 2kHz sine wave using Web Audio API) in `hmi-audio-feedback.ts` whenever an ROI snaps to an alignment guide or boundary lock.
- **Target Files / Components**: `src/lib/audio/hmi-audio-feedback.ts`, `src/lib/editor/snap.ts`
- **Impact**: Multi-sensory feedback ensures rapid, confidence-inspiring alignment on industrial factory floors.

#### MLI-098: Automated Crash Recovery and LocalStorage Autosave Ledger
- **Problem / Current Gap**: Unplanned browser crashes or power interruptions cause unsaved recipe configurations to be lost.
- **Proposed Engineering Solution**: Debounce-save recipe state to encrypted IndexedDB / LocalStorage every 2 seconds (`workspace-save-store.ts`). On reboot, offer instant "Restore Unsaved Recipe" recovery banner.
- **Target Files / Components**: `src/components/vision/workpiece/workspace-save-store.ts`, `src/lib/editor/store/rules-slice.ts`
- **Impact**: Zero work loss during sudden line power trips or workstation reboots.

#### MLI-099: Dual-Monitor Fullscreen Canvas Detach Mode
- **Problem / Current Gap**: Single-screen setups force canvas and properties panels to compete for limited screen space on 15" industrial monitors.
- **Proposed Engineering Solution**: Implement `Detach Canvas` button using the Window Management API, popping the inspection canvas into a dedicated fullscreen window on the secondary machine display while keeping controls on primary.
- **Target Files / Components**: `src/components/vision/standard/workbench/StandardWorkbenchShell.tsx`, `src/lib/window/window-bridge.ts`
- **Impact**: Maximizes canvas workspace for high-resolution cameras on dual-monitor industrial workstations.

#### MLI-100: Comprehensive E2E Diagnostic Test Suite for Layer Transforms & Physics
- **Problem / Current Gap**: Complex interactions between rotations, scaling, handle cursors, and layer reordering are vulnerable to subtle regressions.
- **Proposed Engineering Solution**: Author automated Vitest/Playwright test suites covering 100% of handle drag physics, angle cursor snapping, layer drag-and-drop reordering, and clipping mask boundaries.
- **Target Files / Components**: `src/components/editor/canvas/__tests__/SelectionOverlay.test.tsx`, `src/components/editor/layers/__tests__/LayersPanel.test.tsx`, `src/hooks/editor/__tests__/useLayerDnd.test.ts`
- **Impact**: Guarantees zero regressions across layer integration and transform controls for all future releases.

---

## 4. Verification & Implementation Roadmap

```mermaid
flowchart TD
    subgraph Phase 1: Core ROI Geometry & Handles [Sprint 1: MLI-001 to MLI-030]
        M01["MLI-001..010: SVG Clipping & Masks"]
        M11["MLI-011..020: 8-Point Physics & Handles"]
        M21["MLI-021..030: Header Grip & Spatial Separation"]
    end

    subgraph Phase 2: In-Canvas Controls & Layers [Sprint 2: MLI-031 to MLI-060]
        M31["MLI-031..040: Floating Action Toolbar"]
        M41["MLI-041..050: Photoshop Layers Panel"]
        M51["MLI-051..060: Drag-and-Drop & Multi-Select"]
    end

    subgraph Phase 3: Visual Polish & High-Fidelity [Sprint 3: MLI-061 to MLI-100]
        M61["MLI-061..070: Glitch Fixes & Contrast"]
        M71["MLI-071..080: Multi-Shape & Templates"]
        M81["MLI-081..090: Focal Zoom & Multi-Viewport"]
        M91["MLI-091..100: Ergonomics, CLI & E2E Tests"]
    end

    Phase 1 --> Phase 2
    Phase 2 --> Phase 3
```

### 4.1 Acceptance Criteria Matrix

| Group | Verification Method | Pass Target |
| :--- | :--- | :--- |
| **Transform Physics (MLI-011–020)** | Vitest unit tests for rotated handle drag vectors | Deviation < 0.01px from theoretical affine matrix |
| **Clipping Masks (MLI-001–010)** | Visual regression snapshot tests on nested annotations | 0px render bleed outside parent bounding box |
| **Drag & Drop (MLI-051–060)** | Synthetic DnD event tests in `LayersPanel.test.tsx` | 100% correct z-index reordering across 50 layers |
| **Zoom Synchronization (MLI-081–090)** | Viewport pointer event simulation tests | Target image coordinate invariant under cursor during zoom |
| **Automated CLI Verification (MLI-093–094)** | Headless shell execution tests | Exit code 0, matching JSON schema specifications |
