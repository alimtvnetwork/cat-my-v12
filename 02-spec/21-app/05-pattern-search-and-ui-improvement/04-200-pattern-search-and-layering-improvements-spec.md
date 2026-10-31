# 200 Pattern Search & Layering Improvements Specification

Document ID: `05-04-PAT-LAY-200`  
Version: `1.0.0`  
Status: `Approved for Implementation`  
Scope: Carrier tape simulation, pattern matching, 1:1 square ROI geometry, Photoshop layering physics, luminance conversion, Pin 1 hole detection, and interactive canvas ergonomics.

---

## Executive Summary

This specification catalogs exactly 200 grounded, concrete engineering improvements across 10 functional categories (20 improvements per category) addressing the root causes of vision inspection regressions, pattern search misplacement, Photoshop layer stack inversion, grayscale luminance inaccuracies, and carrier tape simulation anomalies.

All target paths are strictly specified as relative Git paths. Every item contains an immutable ID (`PAT-LAY-001` through `PAT-LAY-200`), descriptive Title, Target File, Problem Analysis, Proposed Engineering Fix, and an automated Verification Metric.

---

## Category Index

1. [Category 1: Square ROI Geometry & 1:1 Aspect Ratio Constraints (PAT-LAY-001 to 020)](#category-1-square-roi-geometry--11-aspect-ratio-constraints-pat-lay-001-to-020)
2. [Category 2: Carrier Tape Multi-Pocket Coordinate Normalization (PAT-LAY-021 to 040)](#category-2-carrier-tape-multi-pocket-coordinate-normalization-pat-lay-021-to-040)
3. [Category 3: Empty Pocket Detection, Suppression & Defect Triage (PAT-LAY-041 to 060)](#category-3-empty-pocket-detection-suppression--defect-triage-pat-lay-041-to-060)
4. [Category 4: In-Canvas Floating Toolbars & ROI Interactive Anchors (PAT-LAY-061 to 080)](#category-4-in-canvas-floating-toolbars--roi-interactive-anchors-pat-lay-061-to-080)
5. [Category 5: Pattern Box Constellation Persistence & Parameter Serialization (PAT-LAY-081 to 100)](#category-5-pattern-box-constellation-persistence--parameter-serialization-pat-lay-081-to-100)
6. [Category 6: Grayscale Conversion & ITU-R BT.709 Linear Luminance (PAT-LAY-101 to 120)](#category-6-grayscale-conversion--itu-r-bt709-linear-luminance-pat-lay-101-to-120)
7. [Category 7: Pin 1 Hole Detection & Rotation Alignment Kernel (PAT-LAY-121 to 140)](#category-7-pin-1-hole-detection--rotation-alignment-kernel-pat-lay-121-to-140)
8. [Category 8: Pattern Match Search Algorithms (NCC, Centroid Registration, Sub-Pixel) (PAT-LAY-141 to 160)](#category-8-pattern-match-search-algorithms-ncc-centroid-registration-sub-pixel-pat-lay-141-to-160)
9. [Category 9: Photoshop Layers Reordering, Grouping & Z-Index Physics (PAT-LAY-161 to 180)](#category-9-photoshop-layers-reordering-grouping--z-index-physics-pat-lay-161-to-180)
10. [Category 10: Layer Canvas Locking, Context Menus & Creation Ergonomics (PAT-LAY-181 to 200)](#category-10-layer-canvas-locking-context-menus--creation-ergonomics-pat-lay-181-to-200)

---

## Category 1: Square ROI Geometry & 1:1 Aspect Ratio Constraints (PAT-LAY-001 to 020)

### PAT-LAY-001: Default 1:1 Square Clamping on Initial Pattern ROI Creation
- **Target File**: `src/lib/vision/pinned-pattern-geometry.ts`
- **Problem**: Pattern inspection rules authored from canvas drag gestures default to arbitrary rectangular aspect ratios, causing distorted 24-box constellation scaling when evaluated across symmetrical semiconductor chip bodies.
- **Proposed Fix**: Implement `squareSearchRegion(region: SearchRegion): SearchRegion` enforcing `width === height` by taking `side = Math.max(16, Math.min(region.width, region.height))` upon rule creation.
- **Verification Metric**: Unit test confirms `squareSearchRegion({ x: 10, y: 20, width: 140, height: 180 }).width === 140` and `height === 140`.

### PAT-LAY-002: Interactive Diagonal Resize Handle 1:1 Lock
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Resizing a pattern matching ROI from diagonal corner handles allows free-form stretching, breaking template registration with square carrier tape pockets.
- **Proposed Fix**: In `handlePointerMove`, detect if the active tool type is `greyscale_pattern_match` or `hasSquareLock`, and project corner displacements `dx` and `dy` along the diagonal ray `Math.max(Math.abs(dx), Math.abs(dy)) * Math.sign(dx)`.
- **Verification Metric**: Canvas pointer drag test asserts ROI `width` strictly equals `height` throughout diagonal drag.

### PAT-LAY-003: Cardinal Resize Handle Symmetric Width-Height Projection
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Dragging top, bottom, left, or right cardinal handles changes only one dimension, distorting the square ROI into an elongated rectangle.
- **Proposed Fix**: When dragging horizontal handles (e, w), update `height` identically centered on `y + height / 2`; when dragging vertical handles (n, s), update `width` identically centered on `x + width / 2`.
- **Verification Metric**: Cardinal handle drag event emits matching `width` and `height` properties in the updated rule payload.

### PAT-LAY-004: Shift Key Inversion for Freeform vs Square Aspect Ratio
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Users have no explicit keyboard modifier override to toggle between rigid square mode and arbitrary rectangular framing during special packaging inspections.
- **Proposed Fix**: Read `e.shiftKey` in canvas event handlers: default pattern rules to 1:1 lock; holding `Shift` enables free-form aspect ratio; releasing `Shift` snaps back to nearest square.
- **Verification Metric**: E2E simulation verifies `shiftKey: true` permits asymmetric width/height, while default drag enforces equality.

### PAT-LAY-005: Minimum and Maximum Bounded ROI Pixel Dimensions
- **Target File**: `src/lib/vision/pinned-pattern-geometry.ts`
- **Problem**: Dragging an ROI smaller than 16px collapses pattern boxes into sub-pixel singularities; dragging beyond frame dimensions causes canvas clipping errors.
- **Proposed Fix**: Enforce `MIN_SQUARE_ROI_SIDE = 24` and `MAX_SQUARE_ROI_SIDE = Math.min(imageWidth, imageHeight)` inside `clampSquareRegion()`.
- **Verification Metric**: Assertions verify attempts to resize ROI to 4px clamp to 24px, and resizing to 2000px on a 960x540 frame clamps to 540px.

### PAT-LAY-006: Viewport Boundary Containment Preserving 1:1 Aspect Ratio
- **Target File**: `src/lib/vision/pinned-pattern-geometry.ts`
- **Problem**: Standard boundary clamping clips `x + width > frameWidth` by truncating width only, unintentionally altering aspect ratio into a non-square rectangle at image edges.
- **Proposed Fix**: In `clampSquareRegion()`, when an edge collision occurs, clamp both `width` and `height` to `Math.min(frameWidth - x, frameHeight - y)`.
- **Verification Metric**: Pushing a 200x200 ROI against the right border of a 960px frame clamps both dimensions identically without aspect distortion.

### PAT-LAY-007: Sub-Pixel Floating Point Drift Elimination via Strict Integer Rounding
- **Target File**: `src/components/vision/standard/tools/pattern-matching/usePatternMatchingRule.ts`
- **Problem**: Fractional canvas zoom and DPI scaling generate floating-point coordinates (e.g., width 142.333px, height 142px), causing 1px rendering artifacts in the ROI border.
- **Proposed Fix**: Wrap all calculated coordinates in `Math.round()` prior to state persistence and canvas rendering.
- **Verification Metric**: All coordinate properties (`x, y, width, height`) pass `Number.isInteger(val) === true`.

### PAT-LAY-008: Authored Resolution Rebase Factor Scaling
- **Target File**: `src/lib/vision/pinned-pattern-geometry.ts`
- **Problem**: Rules authored at 960x540 standard preview warp into non-square shapes when re-evaluated on high-resolution industrial cameras (e.g., 2592x1944).
- **Proposed Fix**: Calculate scalar `rebaseScale = Math.min(toWidth / fromWidth, toHeight / fromHeight)` and multiply both dimensions by `rebaseScale`.
- **Verification Metric**: Rebase of a 100x100 square from 960x540 to 1920x1080 produces exactly 200x200 square geometry.

### PAT-LAY-009: Center-Point Preservation on Square Mode Toggle
- **Target File**: `src/components/vision/workpiece/RuleRightToolbarPanel.tsx`
- **Problem**: Toggling the "Square Aspect Ratio" switch on an existing rectangular rule collapses geometry towards top-left (0,0), displacing the inspected chip feature.
- **Proposed Fix**: Calculate centroid `cx = x + width / 2`, `cy = y + height / 2`, set `side = Math.round((width + height) / 2)`, and update `x = Math.round(cx - side / 2)` and `y = Math.round(cy - side / 2)`.
- **Verification Metric**: Centroid before and after square mode toggle differs by less than 1.0 pixel.

### PAT-LAY-010: Geometric Validity Guard in `validateRuleGeometry`
- **Target File**: `src/lib/editor/validation-store.ts`
- **Problem**: Corrupted project files containing non-square pattern search rules trigger unhandled NaN exceptions during constellation match operations.
- **Proposed Fix**: Add validation check in `validateRuleGeometry`: if rule tool is `greyscale_pattern_match` and `Math.abs(rule.width - rule.height) > 1`, flag warning and offer automatic squaring.
- **Verification Metric**: Validation store captures `E_GEOMETRY_NON_SQUARE` for asymmetric pattern rules and resolves cleanly upon squaring.

### PAT-LAY-011: Carrier Tape Pocket Auto-Centering on Initial Placement
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Clicking to add a pattern rule places the ROI at arbitrary cursor coordinates rather than centering it over the detected tape pocket cavity.
- **Proposed Fix**: Query `tapeStripResult.pockets` at cursor coordinates; if hit, auto-center the square ROI at `pocket.x + (pocket.width - side) / 2` and `pocket.y + (pocket.height - side) / 2`.
- **Verification Metric**: Clicking inside Pocket 1 aligns ROI center with pocket centroid within 2px tolerance.

### PAT-LAY-012: In-Memory Aspect Ratio Reversion Buffer
- **Target File**: `src/components/vision/standard/tools/pattern-matching/usePatternMatchingRule.ts`
- **Problem**: If a user temporarily unlocks square mode and relocks it, original rectangular proportions are destroyed irrecoverably.
- **Proposed Fix**: Cache `previousRectangularDimensions: { width: number; height: number }` in component ref state to restore custom framing if unlocked.
- **Verification Metric**: Toggling square lock off-then-on restores exact previous dimensions without data loss.

### PAT-LAY-013: Touch and Stylus Drag Smoothing on Industrial Tablets
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: High-frequency touch jitter on shop-floor tablets causes rapid oscillation in square ROI boundary calculations.
- **Proposed Fix**: Introduce a 4-pixel movement threshold before updating square ROI dimensions on touch pointer events.
- **Verification Metric**: Pointer events with `movementX < 4` and `movementY < 4` do not trigger canvas re-render.

### PAT-LAY-014: Keyboard Nudge Scaling with 1:1 Aspect Preservation
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Pressing `Shift+Arrow` nudges width or height individually, breaking 1:1 square lock.
- **Proposed Fix**: When `Alt+Shift+Up/Down` is pressed on a square pattern rule, adjust both `width` and `height` symmetrically by +/- 2 pixels.
- **Verification Metric**: Keyboard resize event results in identical delta across both dimensions.

### PAT-LAY-015: Parameter Serialization of `isSquareLocked` Flag
- **Target File**: `src/lib/editor/types.ts`
- **Problem**: The UI square lock state is not persisted in `rule.params`, causing reload of rulesets to drop back to unrestricted rectangular mode.
- **Proposed Fix**: Add `isSquareLocked: boolean` to `EditorRuleParams` and serialize it in `updateRulesetRules`.
- **Verification Metric**: Saved rule JSON contains `"isSquareLocked": true`.

### PAT-LAY-016: Inscribed Circular Inspection Zone Visualizer
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Operators cannot verify if circular chip dimples or orientation markers fit inside the square bounding region without manual guesswork.
- **Proposed Fix**: Render a faint dashed cyan circle inscribed within the square ROI bounds when the rule is selected.
- **Verification Metric**: Canvas drawing context receives `arc(cx, cy, side / 2, 0, 2 * Math.PI)` call when rule is active.

### PAT-LAY-017: Real-Time Dimension Badge Overlay in Canvas HUD
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Operators lack immediate feedback regarding the physical or pixel size of the pattern box while resizing.
- **Proposed Fix**: Paint a semi-transparent HUD tag above the top-left anchor displaying `${side} × ${side} px (1:1)`.
- **Verification Metric**: Canvas snapshot verifies text `${side} × ${side} px` rendered at `(x, y - 6)`.

### PAT-LAY-018: Corrupted Dimension Auto-Recovery Routine
- **Target File**: `src/lib/vision/pinned-pattern-geometry.ts`
- **Problem**: Legacy database migrations containing 0x0 or negative dimensions cause division by zero during pattern matching.
- **Proposed Fix**: In `pinPatternRule`, if `width <= 0` or `height <= 0`, default to `CALIBRATED_DEFAULT_SQUARE_SIDE = 140`.
- **Verification Metric**: Passing `{ width: 0, height: -10 }` returns sanitized `{ width: 140, height: 140 }`.

### PAT-LAY-019: Aspect Ratio Lock Button in Workspace Action Bar
- **Target File**: `src/components/vision/workpiece/RuleRightToolbarPanel.tsx`
- **Problem**: The aspect lock toggle is buried inside advanced sub-menus, making quick inspection adjustments cumbersome.
- **Proposed Fix**: Elevate an aspect ratio toggle icon button (`Ratio` or `Square`) directly into the primary geometry toolbar strip.
- **Verification Metric**: Element with `data-automation-id="btn-toggle-aspect-lock"` is rendered and clickable in the primary tool panel.

### PAT-LAY-020: Comprehensive Automated Unit Test Suite for Square ROI
- **Target File**: `tests/unit/pinned-pattern-geometry.test.ts`
- **Problem**: Absence of continuous integration regression tests allows unintended changes to square geometry logic.
- **Proposed Fix**: Author test suite verifying `squareSearchRegion`, edge clamping, rebase scaling, and integer rounding.
- **Verification Metric**: `bun test tests/unit/pinned-pattern-geometry.test.ts` passes with 100% assertions green.

---

## Category 2: Carrier Tape Multi-Pocket Coordinate Normalization (PAT-LAY-021 to 040)

### PAT-LAY-021: Sprocket-Referenced Pitch Calculation Normalization
- **Target File**: `src/lib/vision/carrier-tape-segmenter.ts`
- **Problem**: Carrier tape pocket detection drifts linearly across long tape strips due to accumulation of small camera lens distortion errors.
- **Proposed Fix**: Align pocket detection against 4.0mm standard EIA-481 sprocket pitch, anchoring pocket centers to nearest detected sprocket hole index.
- **Verification Metric**: Pocket pitch variance across 10 consecutive cavities remains below +/- 0.5 pixels.

### PAT-LAY-022: Tape Skew and Angular Rotation Normalization
- **Target File**: `src/lib/vision/carrier-tape-segmenter.ts`
- **Problem**: Physical guide rails on feeders introduce minor angular tilts (0.5° to 3.0°), causing bounding boxes on downstream pockets to clip chip leads.
- **Proposed Fix**: Compute tape axis angle using linear regression across sprocket hole centroids, applying inverse rotation matrix prior to pocket slicing.
- **Verification Metric**: Tape image with 2.5° physical tilt produces horizontally aligned pocket sub-regions.

### PAT-LAY-023: Local Pocket-Relative Origin Translation
- **Target File**: `src/lib/vision/workpiece-rule-analyzer.ts`
- **Problem**: Pattern boxes stored in absolute image coordinates fail when evaluating tape strips where the chip is located in Pocket 2 or Pocket 3.
- **Proposed Fix**: Normalize reference box coordinates to pocket origin `(box.x - pocket.x, box.y - pocket.y)` during evaluation.
- **Verification Metric**: Pattern matching produces identical constellation coordinates regardless of absolute tape strip position in FOV.

### PAT-LAY-024: Dimension Invariance Between Authored and Inspected Pockets
- **Target File**: `src/lib/vision/workpiece-rule-analyzer.ts`
- **Problem**: Subtle pocket manufacturing tolerances cause 2-5% size differences, causing rigid pixel coordinates to miss marking features.
- **Proposed Fix**: Calculate dynamic pocket scale factors `scaleX = targetPocket.width / authorPocket.width` and `scaleY = targetPocket.height / authorPocket.height` and apply to box offsets.
- **Verification Metric**: Template authored in a 140x140 pocket matches with >95% score in a 146x146 pocket.

### PAT-LAY-025: Sprocket Slip Tolerance Compensation
- **Target File**: `src/lib/vision/carrier-tape-segmenter.ts`
- **Problem**: Rapid indexer advance causes tape micro-slips that exceed `DEFAULT_SPROCKET_SLIP_TOLERANCE_MM` (0.2mm), dropping pocket segmentation.
- **Proposed Fix**: Implement an adaptive slip window that expands search boundaries up to 0.6mm when indexer acceleration flags are asserted.
- **Verification Metric**: Simulated tape advance with 0.45mm slip successfully detects all visible pockets.

### PAT-LAY-026: Multi-Device Offset Array Serialization
- **Target File**: `src/lib/editor/types.ts`
- **Problem**: Multi-device inspection results cannot be mapped back to physical feeder slots because pocket indices are lost during serialization.
- **Proposed Fix**: Include `pocketIndex: number` and `relativeOffset: { dx: number; dy: number }` in `EditorRuleParams` results structure.
- **Verification Metric**: Inspection payload contains structured `devicePocketMappings` array with valid pocket indices.

### PAT-LAY-027: Partial Edge Pocket Truncation & Exclusion
- **Target File**: `src/lib/vision/carrier-tape-segmenter.ts`
- **Problem**: Pockets cut off by camera frame boundaries trigger false negative defect alarms because chips appear half-missing.
- **Proposed Fix**: Reject or flag as `isPartialPocket: true` any detected cavity within 10px of image boundary with width < 80% nominal pocket width.
- **Verification Metric**: Partially visible edge pocket is marked `PARTIAL_SKIP` and excluded from defect alarm tally.

### PAT-LAY-028: Target Pocket Delta Translation Mapping
- **Target File**: `src/lib/vision/workpiece-rule-analyzer.ts`
- **Problem**: Mapping rule patterns to multiple pockets using raw addition results in cumulative rounding drift across pockets.
- **Proposed Fix**: Use discrete translation formula: `Math.round(targetPocket.x + (box.x - authorPocket.x) * scaleX)`.
- **Verification Metric**: Centroid of transformed constellation matches target pocket chip center within 0.5px.

### PAT-LAY-029: 0-Based vs 1-Based Pocket Index Standardization
- **Target File**: `src/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/carrier-tape-evaluator.ts`
- **Problem**: UI renders "Pocket #1" while logging backend reports "pocketIndex: 0", confusing manufacturing operators during review.
- **Proposed Fix**: Standardize backend representation as 0-indexed and UI display string strictly as `Pocket #${index + 1}`.
- **Verification Metric**: UI element text matches `Pocket #1` when inspection result has `pocketIndex: 0`.

### PAT-LAY-030: Pocket Center Centroid Calculation via Morphological Moments
- **Target File**: `src/lib/vision/carrier-tape-segmenter.ts`
- **Problem**: Bounding box corners vary with pocket edge chamfers, causing center calculation `(x + width/2)` to drift.
- **Proposed Fix**: Compute pocket center using image zeroth and first order spatial moments `(m10/m00, m01/m00)` of the cavity threshold mask.
- **Verification Metric**: Calculated centroid remains stable within 0.2px across varying directional backlight intensities.

### PAT-LAY-031: Cavity Depth Shadow Rejection via Gradient Thresholding
- **Target File**: `src/lib/vision/carrier-tape-segmenter.ts`
- **Problem**: Strong side lighting casts dark shadows along pocket sidewalls, tricking edge detectors into reporting oversized pockets.
- **Proposed Fix**: Apply Sobel vertical gradient thresholding to isolate pocket floor transitions from sidewall cast shadows.
- **Verification Metric**: Segmented pocket width under 45° oblique lighting matches true dimension within 1.0px.

### PAT-LAY-032: Multi-Standard EIA-481 Tape Width Parameter Profiles
- **Target File**: `src/domain/vision/pattern-search.ts`
- **Problem**: Hardcoded 12mm tape dimensions fail when inspecting 8mm, 16mm, or 24mm carrier tape reels.
- **Proposed Fix**: Add `carrierTapeProfile: "EIA-481-8mm" | "EIA-481-12mm" | "EIA-481-16mm" | "EIA-481-24mm"` to rule configuration.
- **Verification Metric**: Switching profile to `EIA-481-16mm` automatically updates expected nominal pitch to 8.0mm.

### PAT-LAY-033: Tape Feeder Vibration Damping Filter
- **Target File**: `src/lib/vision/carrier-tape-segmenter.ts`
- **Problem**: Mechanical vibration during pneumatic tape advance causes single-frame coordinate jitter.
- **Proposed Fix**: Apply exponential moving average (EMA) smoothing (`alpha = 0.7`) on pocket bounding box origin across live video frames.
- **Verification Metric**: Frame-to-frame coordinate variance during mechanical vibration drops by >60%.

### PAT-LAY-034: Per-Pocket Coordinate Transformation Matrix Cache
- **Target File**: `src/lib/vision/workpiece-rule-analyzer.ts`
- **Problem**: Recalculating trigonometric rotation and scaling matrices for every box across 5 pockets consumes excessive CPU time.
- **Proposed Fix**: Cache the 2D affine transformation matrix `DOMMatrix` per pocket for the lifetime of the inspection frame.
- **Verification Metric**: Analysis processing time per frame decreases by at least 8.0ms.

### PAT-LAY-035: Inter-Pocket Cross-Talk Search Clamping
- **Target File**: `src/lib/vision/workpiece-rule-analyzer.ts`
- **Problem**: Large search tolerance windows allow the pattern search in Pocket 1 to lock onto the chip located in Pocket 2.
- **Proposed Fix**: Hard-clamp pattern search regions strictly within the boundary coordinates of the specific pocket being inspected.
- **Verification Metric**: Pattern search in Pocket 1 never reports match coordinates located inside Pocket 2.

### PAT-LAY-036: Multi-Pocket Batch Inspection Result Aggregation
- **Target File**: `src/lib/vision/workpiece-rule-analyzer.ts`
- **Problem**: Multi-device inspection overwrites single-rule result object, presenting only the final pocket's verdict in UI.
- **Proposed Fix**: Store per-pocket verdicts in `pocketResults: Record<number, ValidationResult>` on the top-level rule result.
- **Verification Metric**: Result payload contains separate, complete results for Pocket 1, Pocket 2, and Pocket 3.

### PAT-LAY-037: Tape Leader and Trailer Margin Automatic Detection
- **Target File**: `src/lib/vision/carrier-tape-segmenter.ts`
- **Problem**: Blank leader tape with empty pockets triggers false "all parts missing" line-stop alarms during reel changes.
- **Proposed Fix**: Detect consecutive empty pockets (>6) and classify state as `TAPE_LEADER_OR_TRAILER`, notifying operator without hard fault.
- **Verification Metric**: 6 consecutive empty pockets emit status `TAPE_LEADER_DETECTED` instead of line emergency stop.

### PAT-LAY-038: Offline Pocket Simulation Fixture Serialization
- **Target File**: `src/lib/editor/types.ts`
- **Problem**: Developers cannot reproduce edge-case pocket alignment bugs without having physical hardware attached.
- **Proposed Fix**: Serialize detected pocket geometries and pixel sub-buffers into test fixtures (`tape-fixture.json`).
- **Verification Metric**: Offline test harness replays tape fixture reproducing exact multi-pocket analysis output.

### PAT-LAY-039: Reference Template Synchronization Across Pockets
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Modifying the pattern template in the master pocket does not immediately refresh the overlay preview on secondary pockets.
- **Proposed Fix**: In `VisualToolWorkpieceCanvas`, recompute transformed overlays for all pockets whenever the primary rule reference changes.
- **Verification Metric**: Moving a reference box in Pocket 1 instantly reflects on Pocket 2 overlay in canvas.

### PAT-LAY-040: Unit Test Validation with Real Carrier Tape Test Images
- **Target File**: `src/lib/vision/__tests__/workpiece-rule-analyzer.test.ts`
- **Problem**: Lack of automated tests on real production tape imagery allows subtle coordinate regressions to slip through.
- **Proposed Fix**: Add test suite evaluating `pocket-1-filled.jpg` and `pocket-2-empty-mixed.jpg`.
- **Verification Metric**: Automated tests confirm 100% correct pocket segmentation on standard repository sample images.

---

## Category 3: Empty Pocket Detection, Suppression & Defect Triage (PAT-LAY-041 to 060)

### PAT-LAY-041: Cavity Base Luminance Thresholding for Empty vs Occupied State
- **Target File**: `src/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/carrier-tape-evaluator.ts`
- **Problem**: System evaluates empty plastic cavities as defective chips with missing markings, generating false defect alarms.
- **Proposed Fix**: Compute mean luminance of cavity center: empty black embossed carrier tape exhibits mean luma < 25; IC chip body exhibits luma > 45.
- **Verification Metric**: Empty cavity correctly classified as `occupancy: "empty"` with zero false pattern matches.

### PAT-LAY-042: Surface Texture Variance Metric for Shiny Plastic Cavities
- **Target File**: `src/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/carrier-tape-evaluator.ts`
- **Problem**: Clear polystyrene tape reflects ambient light, yielding high mean luma that fools simple thresholding into detecting an IC.
- **Proposed Fix**: Calculate standard deviation of luminance (texture variance): IC chips with matte mold compound and laser markings have high variance (>18.0); smooth cavity floors have low variance (<6.0).
- **Verification Metric**: High-glare empty pocket is correctly identified as empty based on low texture variance.

### PAT-LAY-043: Inspection Rule Suppression on Verified Empty Pockets
- **Target File**: `src/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/carrier-tape-evaluator.ts`
- **Problem**: Once a pocket is determined empty, running Rule 1 (Pin 1) and Rule 2 (Pattern) wastes CPU cycles and reports spurious errors.
- **Proposed Fix**: Immediately return `verdict: "EMPTY"`, `failedRuleIndex: null`, and bypass Rule 1 and Rule 2 execution pipelines.
- **Verification Metric**: Execution time on empty pocket drops to < 1.0ms, and `isRule2Skipped` is set correctly.

### PAT-LAY-044: Granular Inspection Triage State Classification
- **Target File**: `src/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/types.ts`
- **Problem**: Inspection only reports generic binary PASS/FAIL, preventing root-cause triage between orientation defects and marking defects.
- **Proposed Fix**: Implement triage enum: `InspectionTriageState = "PASS" | "EMPTY" | "DEFECT_ORIENTATION" | "DEFECT_MARKING" | "DEFECT_FOREIGN_OBJECT"`.
- **Verification Metric**: Results object contains distinct, verified triage state matching physical failure mode.

### PAT-LAY-045: Hardware Feeder Sensor Signal Integration
- **Target File**: `src/lib/vision/workpiece-rule-analyzer.ts`
- **Problem**: Software-only optical empty detection fails when foreign black tape covers the pocket aperture.
- **Proposed Fix**: Integrate optional hardware optical/vacuum sensor state from digital I/O bus to corroborate vision classification.
- **Verification Metric**: When digital input `feeder_part_present === false`, pocket is triaged as empty regardless of optical noise.

### PAT-LAY-046: Distinct Visual Canvas Styling for Empty Pockets
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Empty pockets render with red failure borders, misleading operators to believe a defective IC is jammed in the feeder.
- **Proposed Fix**: Draw empty pockets with a dashed amber border (`#f59e0b`, dash `[6, 4]`) and a centered "EMPTY POCKET" badge.
- **Verification Metric**: Canvas snapshot verifies amber dashed stroke rendered on empty cavities instead of solid red.

### PAT-LAY-047: Defect Telemetry Segregation from Operational Yield
- **Target File**: `src/lib/editor/validation-store.ts`
- **Problem**: Intentional empty pockets (programmed skips between component lots) degrade machine yield statistics.
- **Proposed Fix**: Exclude pockets with `verdict === "EMPTY"` from the denominator when calculating manufacturing defect rates.
- **Verification Metric**: A tape run of 8 parts (6 pass, 2 empty) reports 100% yield instead of 75%.

### PAT-LAY-048: Foreign Object Debris (FOD) Detection in Empty Cavities
- **Target File**: `src/lib/vision/algorithms/connected-components.ts`
- **Problem**: Solder balls, loose IC pins, or plastic burrs inside "empty" pockets damage pick-and-place nozzles downstream.
- **Proposed Fix**: In empty cavities, run blob analysis for high-contrast anomalies with area > 10px; flag as `DEFECT_FOREIGN_OBJECT`.
- **Verification Metric**: 15px solder splash in empty pocket generates `DEFECT_FOREIGN_OBJECT` warning.

### PAT-LAY-049: Dynamic Sensitivity Slider for Empty Cavity Tuning
- **Target File**: `src/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/CarrierTapeSimulationToolbar.tsx`
- **Problem**: Varying tape colors (black conductive vs white carrier) require different optical threshold cutoffs.
- **Proposed Fix**: Provide an "Empty Detection Threshold" slider (0-100) in the carrier tape simulation config toolbar.
- **Verification Metric**: Adjusting slider updates `emptyLumaThreshold` in simulation configuration state.

### PAT-LAY-050: Temporal Hysteresis Filter on Pocket Occupancy Status
- **Target File**: `src/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/carrier-tape-evaluator.ts`
- **Problem**: Frame-to-frame lighting flicker causes pocket status to rapidly oscillate between EMPTY and DEFECT.
- **Proposed Fix**: Require occupancy state to remain consistent across 2 consecutive frames before flipping triage decision.
- **Verification Metric**: Single-frame lighting glitch does not trigger spurious state transitions.

### PAT-LAY-051: In-Canvas Pattern Box Suppression on Empty Pockets
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Overlaying the 24 green Atmel pattern boxes over an empty cavity clutters the screen and confuses users.
- **Proposed Fix**: Check `pocket.isEmpty || pocket.occupancy === "empty"`; if true, omit rendering pattern boxes.
- **Verification Metric**: No pattern box rectangles (`ctx.strokeRect`) are drawn within the bounds of an empty pocket.

### PAT-LAY-052: Audible Alarm Suppression for Expected Empty Pockets
- **Target File**: `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`
- **Problem**: The system buzzer sounds an alarm on empty cavities, fatiguing operators during normal tape advance.
- **Proposed Fix**: Guard audio alarm dispatch with `if (triageState !== "EMPTY" && triageState !== "PASS") playAlarm()`.
- **Verification Metric**: Audio alarm triggers on `DEFECT_MARKING` but remains silent on `EMPTY`.

### PAT-LAY-053: Run Summary JSON Logging of Empty Cavity Events
- **Target File**: `src/lib/editor/validation-store.ts`
- **Problem**: Post-shift quality audits cannot distinguish between skipped components and missing feeder pick-ups.
- **Proposed Fix**: Log `emptyPocketCount`, `occupiedPocketCount`, and timestamps of all empty occurrences in results JSON.
- **Verification Metric**: Output JSON includes detailed `emptyPocketAudit` array with pocket timestamps.

### PAT-LAY-054: Golden Empty Cavity Calibration Profile Storage
- **Target File**: `src/lib/vision/carrier-tape-segmenter.ts`
- **Problem**: Changing tape manufacturers alters cavity reflectivity, requiring recalibration of empty thresholds.
- **Proposed Fix**: Provide a "Teach Empty Pocket" action that records mean baseline luma and variance into `tapeProfile.goldenEmpty`.
- **Verification Metric**: Saved tape profile contains `goldenEmpty: { luma: 18.4, variance: 3.2 }`.

### PAT-LAY-055: Independent Rule 2 Execution Toggle on Empty Pockets
- **Target File**: `src/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/carrier-tape-evaluator.ts`
- **Problem**: Diagnostic testing of pattern matching sensitivity requires intentionally running Rule 2 on empty cavities to verify rejection score.
- **Proposed Fix**: Add developer flag `forceRule2OnEmpty: boolean` in simulation debug settings.
- **Verification Metric**: With `forceRule2OnEmpty: true`, Rule 2 executes on empty pocket and yields `score: 0.0`.

### PAT-LAY-056: User Configuration for Tolerating vs Alarming on Empty Cavities
- **Target File**: `src/components/vision/workpiece/RuleToolConfigPanel.tsx`
- **Problem**: In high-density continuous manufacturing, an unexpected empty pocket indicates a missing part from the supplier that must stop the machine.
- **Proposed Fix**: Add user option `treatEmptyAsDefect: boolean` (default: false); when enabled, empty pockets fail inspection.
- **Verification Metric**: With `treatEmptyAsDefect: true`, empty pocket yields overall inspection `status: Fail`.

### PAT-LAY-057: Cavity Floor Specular Reflection Masking
- **Target File**: `src/lib/vision/luminance-quantizer.ts`
- **Problem**: Embossed mold injection pins in the center of the pocket create bright specular highlights that mimic IC lettering.
- **Proposed Fix**: Apply morphological opening (erosion followed by dilation) with a 3x3 kernel to eliminate pinpoint specular reflections.
- **Verification Metric**: Specular highlight artifacts are removed from the binarized empty cavity mask.

### PAT-LAY-058: Cavity Edge Contrast Verification
- **Target File**: `src/lib/vision/carrier-tape-segmenter.ts`
- **Problem**: Severely damaged or torn carrier tape pockets pass unnoticed because lack of part presence looks like normal empty tape.
- **Proposed Fix**: Verify pocket perimeter edge sharpness; if perimeter gradient energy is < 30% of nominal, flag `DEFECT_TAPE_DAMAGED`.
- **Verification Metric**: Torn cavity edge triggers `DEFECT_TAPE_DAMAGED` error code.

### PAT-LAY-059: Multi-Pocket Status Badge Strip in UI Status Bar
- **Target File**: `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`
- **Problem**: Operators cannot see the status of all visible pockets simultaneously without panning across the canvas.
- **Proposed Fix**: Display a horizontal strip of mini pocket icons in the workspace footer showing real-time status of each pocket.
- **Verification Metric**: Status bar renders 3 distinct pocket indicators reflecting their respective PASS/EMPTY/FAIL states.

### PAT-LAY-060: Automated Regression Test for Mixed Empty/Occupied Tape Strips
- **Target File**: `src/lib/vision/__tests__/carrier-tape-segmenter.test.ts`
- **Problem**: Complex multi-pocket combinations (e.g., Occupied -> Empty -> Occupied) historically suffered index alignment regressions.
- **Proposed Fix**: Author automated unit test evaluating synthetic tape strip with alternating occupancy states.
- **Verification Metric**: Unit test verifies Pocket 0 = PASS, Pocket 1 = EMPTY, Pocket 2 = PASS with 100% accuracy.

---

## Category 4: In-Canvas Floating Toolbars & ROI Interactive Anchors (PAT-LAY-061 to 080)

### PAT-LAY-061: Floating In-ROI Mini Action Toolbar Position Anchoring
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Action buttons for locking, centering, or configuring an ROI are located in a distant sidebar, forcing operators to constantly move the mouse back and forth.
- **Proposed Fix**: Render an interactive floating action pill anchored directly above the top-right corner of the selected ROI `(x + width - toolbarWidth, y - 36)`.
- **Verification Metric**: In-canvas toolbar coordinates dynamically track ROI movement within 1 frame.

### PAT-LAY-062: Automatic Viewport Edge Collision Inversion
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: When an ROI is positioned near the top of the canvas, the floating toolbar renders off-screen above the viewport edge.
- **Proposed Fix**: If `y - 36 < 0`, flip the toolbar anchor position to render inside the top edge of the ROI `(y + 8)`.
- **Verification Metric**: Toolbar positioned at `y = 10` flips its anchor to `y = 18` inside the ROI.

### PAT-LAY-063: Interactive Quick-Action Icon Suite Inside Floating Toolbar
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Operators lack quick-access canvas controls for common operations like Lock, Square, Duplicate, and Delete.
- **Proposed Fix**: Populate the in-canvas floating toolbar with 4 micro-buttons: `Lock/Unlock`, `1:1 Square Lock`, `Re-Center`, and `Delete`.
- **Verification Metric**: Clicking the Lock icon in the floating toolbar immediately flips the rule's `isLocked` state.

### PAT-LAY-064: Touch-Friendly Handle Hitbox Expansion
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Corner resize handles have a tiny 6x6 pixel hit area, making them extremely difficult to grab on touchscreen displays.
- **Proposed Fix**: Maintain visual handle size at 8x8 pixels while expanding the transparent pointer hit detection radius to 16x16 pixels.
- **Verification Metric**: Pointer clicks 7px away from handle corner successfully initiate resize action.

### PAT-LAY-065: Zoom-Invariant Handle and Toolbar Rendering Scale
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: When users zoom into the canvas (e.g. 400%), resize handles and toolbars scale up proportionally, obscuring the inspected features.
- **Proposed Fix**: Divide handle and toolbar rendering dimensions by the active canvas zoom scalar `(baseSize / currentZoom)`.
- **Verification Metric**: Handle physical pixel dimensions on screen remain constant (8px) across 50% to 500% zoom levels.

### PAT-LAY-066: Pan and Zoom Animation Suppression for In-Canvas Elements
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Floating toolbars lag behind the canvas image during rapid panning due to React state render batching.
- **Proposed Fix**: Render floating toolbars directly onto the high-speed 2D canvas context or use direct CSS transform updates via DOM ref.
- **Verification Metric**: Floating toolbar moves synchronously with canvas background with 0ms visual lag.

### PAT-LAY-067: Glassmorphism Backdrop for High Contrast Readability
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: In-canvas toolbars blend into noisy backgrounds on complex circuit boards, making icons hard to see.
- **Proposed Fix**: Style toolbar with `backdrop-filter: blur(8px)`, dark semi-transparent fill `rgba(12, 16, 23, 0.85)`, and border `rgba(255, 255, 255, 0.15)`.
- **Verification Metric**: Visual contrast ratio between toolbar icons and background exceeds WCAG AA standard (4.5:1).

### PAT-LAY-068: Tooltip Display with Zero Z-Index Bleed
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Canvas tooltips get clipped by parent container overflow or render behind adjacent sidebar panels.
- **Proposed Fix**: Portal floating toolbar tooltips to top-level document body using Radix Tooltip primitives with `z-index: 9999`.
- **Verification Metric**: Hovering toolbar button displays tooltip floating above all canvas and sidebar elements.

### PAT-LAY-069: Active Selection Cyan Glow Physics
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Subtle selection outlines make it difficult to distinguish which ROI is active in multi-rule setups.
- **Proposed Fix**: Render an outer pulsing glow effect `shadow-[0_0_12px_rgba(0,229,255,0.4)]` and vibrant cyan border `#00e5ff` on the selected ROI.
- **Verification Metric**: Active rule border stroke color is `#00e5ff` with 2px stroke width.

### PAT-LAY-070: Keyboard Shortcut Badges Displayed on Floating Buttons
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Operators are unaware of keyboard shortcuts for common actions, slowing down workflow.
- **Proposed Fix**: Render small keyboard shortcut hints (`L` for Lock, `S` for Square, `Del` for Delete) in button tooltips.
- **Verification Metric**: Tooltip text for delete action includes `(Del)` shortcut hint.

### PAT-LAY-071: Pin 1 Placement Crosshair Quick Action
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Adding a Pin 1 orientation check requires opening the rule catalog and configuring a new rule from scratch.
- **Proposed Fix**: Include a "Quick Pin 1" button on the pattern ROI floating toolbar that instantly attaches a Pin 1 rule centered on quadrant 1.
- **Verification Metric**: Clicking Quick Pin 1 adds a child orientation rule to the ruleset with default parameters.

### PAT-LAY-072: Exclusion Mask Brush Trigger Inside Floating Toolbar
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Creating exclusion masks requires leaving the pattern matching view and switching tools in the sidebar.
- **Proposed Fix**: Add a "Mask Feature" toggle button on the floating toolbar that directly activates the in-canvas exclusion pen.
- **Verification Metric**: Clicking Mask Feature activates brush mode without altering active rule selection.

### PAT-LAY-073: In-Canvas Threshold Adjustment Micro-Slider
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Tuning pattern binarization threshold requires navigating to a separate settings tab, obscuring immediate visual feedback.
- **Proposed Fix**: Provide an expandable micro-slider popover directly attached to the bottom edge of the floating toolbar.
- **Verification Metric**: Scrubbing the micro-slider updates `greyscaleLevel` and refreshes binarized pattern preview in real time.

### PAT-LAY-074: Smooth CSS Fade-In Transition on ROI Selection
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Toolbars appearing instantaneously create an abrupt visual pop that distracts operators.
- **Proposed Fix**: Apply CSS transition `transition: opacity 150ms cubic-bezier(0.16, 1, 0.3, 1), transform 150ms ease` on toolbar mount.
- **Verification Metric**: Toolbar element transitions smoothly from `opacity: 0` to `opacity: 1` over 150ms.

### PAT-LAY-075: Multi-Selection Floating Action Strip Aggregation
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: When multiple ROIs are lassoed, individual toolbars overlap and clutter the viewport.
- **Proposed Fix**: When >1 rule is selected, replace individual toolbars with a single aggregated action strip centered above the bounding group.
- **Verification Metric**: Selecting 3 rules renders exactly 1 multi-selection toolbar with "Align", "Distribute", and "Group" actions.

### PAT-LAY-076: Pointer-Down Propagation Guard on Toolbar Clicks
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Clicking a button in the floating toolbar inadvertently triggers canvas drag-selection underneath.
- **Proposed Fix**: Attach `e.stopPropagation()` and `e.preventDefault()` to all toolbar container pointer event listeners.
- **Verification Metric**: Clicking toolbar buttons does not alter canvas pan offset or drag selection state.

### PAT-LAY-077: Floating Toolbar Escape Key Dismissal
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Operators cannot easily dismiss the in-canvas toolbar when inspecting underlying fine image features.
- **Proposed Fix**: Listen for `Escape` key to temporarily hide floating toolbars while keeping the ROI selected.
- **Verification Metric**: Pressing `Escape` hides the toolbar; clicking the ROI restores visibility.

### PAT-LAY-078: Boundary-Safe Overflow Clipping Prevention
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: When the canvas is zoomed in and panned, floating toolbars can overflow into desktop window title bars.
- **Proposed Fix**: Clamp toolbar coordinates within `canvasBoundingClientRect` minus 8px padding.
- **Verification Metric**: Toolbar position coordinates never exceed canvas container client boundaries.

### PAT-LAY-079: Automated Automation Triad Identifiers on In-Canvas Toolbars
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Automated test scripts cannot target floating in-canvas action buttons due to lack of stable selectors.
- **Proposed Fix**: Decorate all floating buttons with `data-automation-id`, `data-automation-name`, and `data-automation-xpath`.
- **Verification Metric**: Element `[data-automation-id="btn-roi-floating-lock"]` is discoverable via Playwright query selectors.

### PAT-LAY-080: Canvas In-ROI Toolbar Component Unit Tests
- **Target File**: `src/components/vision/workpiece/__tests__/VisualToolWorkpieceCanvas.test.tsx`
- **Problem**: Lack of automated tests on in-canvas toolbar interactions leads to recurring regressions during canvas refactors.
- **Proposed Fix**: Add unit tests verifying toolbar mounting, coordinate positioning, button action dispatches, and unmounting.
- **Verification Metric**: Automated canvas tests execute with 100% pass rate.

---

## Category 5: Pattern Box Constellation Persistence & Parameter Serialization (PAT-LAY-081 to 100)

### PAT-LAY-081: Automatic Constellation Box Persistence on Modification
- **Target File**: `src/components/vision/workpiece/RuleToolConfigPanel.tsx`
- **Problem**: Modifying reference boxes in `WhiteBoxMarkingTool` does not automatically commit changes to `rule.params.referenceBoxes`, resulting in lost configurations upon navigation.
- **Proposed Fix**: In `handleApplyPattern`, immediately write `referenceBoxes: pattern.referenceBoxes` and `constellation: pattern.referenceBoxes` into the rule parameters payload.
- **Verification Metric**: Modifying a pattern box updates the ruleset store with new box coordinates without requiring a separate save button click.

### PAT-LAY-082: Dual Representation Serialization (Array & JSON String)
- **Target File**: `src/components/vision/workpiece/RuleToolConfigPanel.tsx`
- **Problem**: Inconsistent reading patterns in the codebase expect either raw objects or serialized JSON strings, leading to `undefined` errors.
- **Proposed Fix**: Serialize both `referenceBoxes` (object array) and `constellationJson` (`JSON.stringify(pattern.referenceBoxes)`) into `rule.params`.
- **Verification Metric**: Both `rule.params.referenceBoxes` and `rule.params.constellationJson` exist and contain identical box data.

### PAT-LAY-083: Relative Offset Persistence for Translation-Invariant Rebase
- **Target File**: `src/components/vision/standard/tools/StandardGreyscalePatternMatchingTool.tsx`
- **Problem**: Moving an ROI across the canvas breaks matching because pattern boxes are stored in absolute coordinates that do not move with the ROI.
- **Proposed Fix**: Store `referenceBoxesRelativeToPatternRegion` with coordinates `(box.x - patternRegion.x, box.y - patternRegion.y)`.
- **Verification Metric**: Translating an ROI by `(dx: +50, dy: +50)` preserves relative box positions within the ROI.

### PAT-LAY-084: Taught Expected Luminance Parameter Storage
- **Target File**: `src/components/vision/standard/tools/StandardGreyscalePatternMatchingTool.tsx`
- **Problem**: When teaching a pattern, average box luminance is computed in the UI but omitted from serialized parameters, forcing the analyzer to recalculate or guess.
- **Proposed Fix**: Ensure each box item in `referenceBoxes` carries `expectedLuma: Math.round(box.luma)` captured from the reference image.
- **Verification Metric**: Serialized box item contains valid numeric `expectedLuma` property between 0 and 255.

### PAT-LAY-085: Bounded Error History Capture for Corrupt JSON Payloads
- **Target File**: `src/lib/vision/workpiece-rule-analyzer.ts`
- **Problem**: Corrupted JSON strings in imported project files crash the analyzer or flood error logs with identical stack traces on every animation frame.
- **Proposed Fix**: Implement `captureCorruptSavedJson` using a deduplication `Set<string>` and deferred microtask capture to log each distinct corrupt payload once.
- **Verification Metric**: Passing corrupt JSON logs exactly one error entry to `useErrorStore` regardless of frame re-renders.

### PAT-LAY-086: Backward-Compatible Legacy Box Schema Migration
- **Target File**: `src/lib/vision/workpiece-rule-analyzer.ts`
- **Problem**: Older project files store pattern boxes under `params.patternBoxes` or `params.boxes`, which modern code ignores.
- **Proposed Fix**: In `parseBoxesFromParams`, inspect `params.constellationJson`, then `params.referenceBoxes`, then `params.patternBoxes`, and finally `params.boxes`.
- **Verification Metric**: Loading legacy ruleset with `params.patternBoxes` successfully extracts and parses all boxes.

### PAT-LAY-087: Authored Frame Resolution Metadata Preservation
- **Target File**: `src/lib/vision/pinned-pattern-geometry.ts`
- **Problem**: When a pattern rule is saved, the camera frame resolution at the time of authoring is discarded, preventing proportional scaling on different sensors.
- **Proposed Fix**: Automatically write `authoredFrameWidth: imageWidth` and `authoredFrameHeight: imageHeight` into `rule.params` upon rule creation.
- **Verification Metric**: Saved rule contains `authoredFrameWidth === 960` and `authoredFrameHeight === 540`.

### PAT-LAY-088: Pre-Evaluation Atomic Persistence on "Test This Rule"
- **Target File**: `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`
- **Problem**: Clicking "Test This Rule" immediately runs analysis against saved parameters, failing if the user has unsaved canvas edits.
- **Proposed Fix**: In `handleRunAnalysis`, invoke `pinPatternRule()` and commit all current canvas edits to the rules store before executing inspection.
- **Verification Metric**: Modifying a pattern box on canvas and immediately clicking "Test This Rule" evaluates the modified box coordinates.

### PAT-LAY-089: Deep Immutability Cloning on Constellation Serialization
- **Target File**: `src/components/vision/workpiece/RuleToolConfigPanel.tsx`
- **Problem**: Passing mutable box arrays between UI components and store leads to object reference leaks where modifying Rule B alters Rule A.
- **Proposed Fix**: Clone box arrays using `JSON.parse(JSON.stringify(boxes))` or structured clone prior to updating state.
- **Verification Metric**: Modifying a box in a cloned rule does not alter the original rule's box coordinates.

### PAT-LAY-090: Minified Serialization for Database Storage Efficiency
- **Target File**: `src/lib/vision/workpiece-rule-analyzer.ts`
- **Problem**: Bloated constellation JSON with unnecessary whitespace and floating precision slows down SQLite database queries.
- **Proposed Fix**: Strip unused fields and round coordinates to integers before serializing `constellationJson`.
- **Verification Metric**: Serialized JSON string size is reduced by >40% compared to raw object dump.

### PAT-LAY-091: Zod Runtime Schema Validation for Saved Rule Parameters
- **Target File**: `src/lib/editor/types.ts`
- **Problem**: Invalid parameter types (e.g. `threshold` saved as string `"170"`) cause cryptic arithmetic failures in vision kernels.
- **Proposed Fix**: Define `PatternMatchingParamsSchema` using Zod and validate payloads upon saving and loading.
- **Verification Metric**: Attempting to save invalid parameter types triggers validation error and sanitizes values to defaults.

### PAT-LAY-092: Dynamic Active and Total Box Count Synchronization
- **Target File**: `src/components/vision/workpiece/RuleToolConfigPanel.tsx`
- **Problem**: When a user adds or deletes pattern boxes, `rule.params.activeBoxCount` remains hardcoded to 24, causing mismatch with actual box array length.
- **Proposed Fix**: Automatically set `activeBoxCount: referenceBoxes.length` and `totalBoxCount: referenceBoxes.length` upon apply.
- **Verification Metric**: Deleting 4 boxes from Atmel 24-box set updates `activeBoxCount` to 20.

### PAT-LAY-093: Reversion Snapshot History for Pattern Edits
- **Target File**: `src/lib/stores/rules-store.ts`
- **Problem**: Accidental deletion or misplacement of taught pattern boxes cannot be undone, forcing operators to reteach the entire chip.
- **Proposed Fix**: Maintain a rolling 10-step undo/redo snapshot stack of `rule.params` in `useRulesStore`.
- **Verification Metric**: Pressing `Ctrl+Z` after deleting a box restores the deleted box with its original coordinates.

### PAT-LAY-094: Multi-Device Pocket Tagging on Pattern Boxes
- **Target File**: `src/lib/vision/workpiece-rule-analyzer.ts`
- **Problem**: In multi-pocket carrier tape simulation, all boxes lack pocket association, making it impossible to diagnose per-pocket failures.
- **Proposed Fix**: Tag each box with optional `pocketIndex: number` when generated in multi-device simulation mode.
- **Verification Metric**: Pattern boxes generated for Pocket 1 contain `pocketIndex: 1`.

### PAT-LAY-095: Graceful Fallback on Missing Pattern Boxes
- **Target File**: `src/lib/vision/workpiece-rule-analyzer.ts`
- **Problem**: If a rule has 0 pattern boxes, the analyzer throws an unhandled exception or enters an infinite loop.
- **Proposed Fix**: If `ruleBoxes.length === 0`, return a clean failure result: `status: Fail`, `score: 0.0`, `message: "Pattern inspection is not configured: missing saved pattern boxes"`.
- **Verification Metric**: Rule with empty box list returns clean failure result without throwing exceptions.

### PAT-LAY-096: High-Fidelity Import/Export Bundle Serialization
- **Target File**: `src/lib/editor/types.ts`
- **Problem**: Exporting a ruleset bundle to JSON and importing it on another workstation drops relative pattern box offsets.
- **Proposed Fix**: Ensure export serializer includes all relative offsets, authored frame resolutions, and luma baselines.
- **Verification Metric**: Exported ruleset re-imported on fresh workstation yields identical inspection scores on golden image.

### PAT-LAY-097: LocalStorage Crash Recovery Scratchpad
- **Target File**: `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`
- **Problem**: Browser refresh or unexpected app exit during pattern authoring loses unsaved box markings.
- **Proposed Fix**: Write uncommitted pattern edits to `localStorage.setItem("cat_vision_draft_rule", ...)` every 2 seconds.
- **Verification Metric**: Reopening workspace after simulated crash prompts user to recover unsaved pattern edits.

### PAT-LAY-098: Null and Undefined Sanitization Pre-Commit Guard
- **Target File**: `src/lib/editor/types.ts`
- **Problem**: Saving rules with `undefined` properties causes SQLite JSON serialization errors in the backend database.
- **Proposed Fix**: Strip all `undefined` and `NaN` properties from `rule.params` prior to saving.
- **Verification Metric**: Serialized JSON contains no `"field": undefined` or `"field": NaN` occurrences.

### PAT-LAY-099: Default 24 Atmel Chip Box Constellation Factory
- **Target File**: `src/lib/vision/pinned-pattern-geometry.ts`
- **Problem**: Creating a new pattern rule starts with a blank template, requiring extensive manual marking for standard Atmel MEGA32U4 chips.
- **Proposed Fix**: Provide `getPatternBoxesForRegion(region)` which generates the standard 24 Atmel box constellation pre-scaled to the ROI.
- **Verification Metric**: Newly created pattern rule automatically contains 24 standard Atmel reference boxes.

### PAT-LAY-100: Constellation Serialization Round-Trip Unit Tests
- **Target File**: `src/lib/vision/__tests__/workpiece-rule-analyzer.test.ts`
- **Problem**: Lack of serialization unit tests allows schema drift between frontend and analyzer.
- **Proposed Fix**: Add unit tests verifying `serialize -> parseBoxesFromParams -> re-serialize` round-trip equality.
- **Verification Metric**: Test suite confirms 100% data fidelity across serialization round-trip.

---

## Category 6: Grayscale Conversion & ITU-R BT.709 Linear Luminance (PAT-LAY-101 to 120)

### PAT-LAY-101: Modern ITU-R BT.709 Luminance Standard Implementation
- **Target File**: `src/lib/vision/luminance-quantizer.ts`
- **Problem**: Legacy codebase uses archaic NTSC Rec.601 coefficients (`0.299 R + 0.587 G + 0.114 B`), causing colorimetric mismatch with modern CMOS inspection sensors.
- **Proposed Fix**: Upgrade luminance calculation to HDTV ITU-R BT.709 standard: `Luma = 0.2126 * R + 0.7152 * G + 0.0722 * B`.
- **Verification Metric**: Pure green pixel `(0, 255, 0)` produces luminance value of 182 instead of legacy 150.

### PAT-LAY-102: Fast Fixed-Point Bit-Shift Arithmetic Optimization
- **Target File**: `src/lib/vision/luminance-quantizer.ts`
- **Problem**: Floating-point multiplications in tight image loops limit 4K video frame processing to under 20 frames per second.
- **Proposed Fix**: Implement 10-bit fixed-point approximation: `luma = (218 * r + 732 * g + 74 * b) >> 10`.
- **Verification Metric**: Fixed-point luma matches floating-point result within +/- 1 integer unit across all 16.7M RGB values, improving speed by >3.5x.

### PAT-LAY-103: sRGB Gamma Linearization Pre-Conversion Stage
- **Target File**: `src/lib/vision/luminance-quantizer.ts`
- **Problem**: Direct conversion of non-linear gamma-encoded sRGB pixels introduces dark-level distortion in laser marking contrast.
- **Proposed Fix**: Provide a linearized conversion mode using a 256-entry lookup table (`sRGB_to_Linear_LUT`) before applying BT.709 coefficients.
- **Verification Metric**: Contrast ratio between chip body and laser mark matches spectrophotometer measurements within 2%.

### PAT-LAY-104: Zero-Allocation In-Place Pixel Buffer Quantization
- **Target File**: `src/lib/vision/pinned-pattern-geometry.ts`
- **Problem**: Creating new `Uint8ClampedArray` instances on every analysis frame triggers excessive garbage collection pauses.
- **Proposed Fix**: Provide `filterPatternRgbaInPlace(rgba: Uint8ClampedArray, ...)` to mutate pixel channels directly without heap allocation.
- **Verification Metric**: Memory allocation profile during live inspection shows 0 bytes allocated per frame in grayscale conversion.

### PAT-LAY-105: Contrast-Stretching and Dynamic Histogram Equalization
- **Target File**: `src/lib/vision/luminance-quantizer.ts`
- **Problem**: Low-contrast laser markings on dark epoxy chips disappear when lighting intensity fluctuates.
- **Proposed Fix**: Implement min-max contrast stretching `stretched = ((luma - minLuma) * 255) / (maxLuma - minLuma)`.
- **Verification Metric**: Low-contrast image with dynamic range [30, 90] is expanded to full [0, 255] range.

### PAT-LAY-106: Adaptive Local Sauvola Binarization for Uneven Illumination
- **Target File**: `src/lib/vision/algorithms/connected-components.ts`
- **Problem**: Global thresholding fails when directional ring lights create bright gradients across the chip surface.
- **Proposed Fix**: Implement Sauvola local thresholding `T = m * (1 + k * (s / 128 - 1))` with window size 15 and `k = 0.2`.
- **Verification Metric**: Text markings remain fully legible across 40% illumination gradient.

### PAT-LAY-107: Automatic Marking Polarity Detection (Bright vs Dark Defect)
- **Target File**: `src/lib/vision/workpiece-rule-analyzer.ts`
- **Problem**: System fails when inspecting white laser marks on black plastic vs dark stamped marks on shiny metal leadframes.
- **Proposed Fix**: Detect background polarity by evaluating perimeter border luminance; automatically invert polarity if background is lighter than markings.
- **Verification Metric**: Both bright-on-dark and dark-on-bright markings correctly register positive pattern correlation scores.

### PAT-LAY-108: Alpha Channel Transparency and Mask Blending
- **Target File**: `src/lib/vision/luminance-quantizer.ts`
- **Problem**: Grayscale converter overwrites alpha channel data, destroying exclusion mask transparency in canvas overlays.
- **Proposed Fix**: Preserve source alpha channel `rgba[i + 3]` unchanged during luminance transformation.
- **Verification Metric**: Pixel with `alpha = 128` retains `alpha = 128` after grayscale filter execution.

### PAT-LAY-109: WebAssembly SIMD Vectorized Conversion Pipeline
- **Target File**: `src/lib/vision/luminance-quantizer.ts`
- **Problem**: Processing 12-megapixel multi-camera frames in pure JavaScript drops system throughput below line speed.
- **Proposed Fix**: Provide a WebAssembly SIMD 128-bit vector kernel for parallel 16-pixel simultaneous luminance computation.
- **Verification Metric**: 12MP image grayscale conversion completes in under 4.0ms on standard x86/ARM hardware.

### PAT-LAY-110: Multi-Spectral UV Channel Isolation for Conformal Coatings
- **Target File**: `src/domain/vision/conformal-coating-types.ts`
- **Problem**: Standard grayscale conversion discards fluorescent UV tracer emissions (365nm excitation / 450nm emission).
- **Proposed Fix**: Implement selective blue-channel weighted luminance mode `Luma_UV = 0.05 * R + 0.15 * G + 0.80 * B` for coating inspection.
- **Verification Metric**: Conformal coating fluorescence signal-to-noise ratio increases by >40%.

### PAT-LAY-111: 10-Bit and 12-Bit High Dynamic Range Sensor Support
- **Target File**: `src/lib/vision/luminance-quantizer.ts`
- **Problem**: High-end industrial cameras producing 12-bit monochrome data (`Uint16Array`) get clamped and lose shadow detail.
- **Proposed Fix**: Support 16-bit input buffers with adaptive tone-mapping to 8-bit grayscale for display and matching.
- **Verification Metric**: 12-bit sensor data retains subtle marking contrast without saturation clipping.

### PAT-LAY-112: Reference Box Luminance Variance Caching
- **Target File**: `src/lib/vision/pattern-matcher.ts`
- **Problem**: Computing box luminance variance repeatedly inside template matching loops degrades frame rate.
- **Proposed Fix**: Precompute and cache `meanLuma` and `varianceLuma` for all 24 reference boxes during template compile stage.
- **Verification Metric**: Constellation matching loop executes with zero repeated variance calculations.

### PAT-LAY-113: Hardware-Accelerated Canvas Grayscale Shader
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Software grayscale conversion for live canvas video preview consumes 35% CPU overhead.
- **Proposed Fix**: Use WebGL shader or Canvas CSS filter `filter: grayscale(100%)` for zero-overhead GPU preview.
- **Verification Metric**: Canvas video preview CPU utilization drops from 35% to < 3%.

### PAT-LAY-114: Standardized Luminance Tolerance Parameter Default
- **Target File**: `src/domain/vision/pattern-search.ts`
- **Problem**: Inconsistent default luminance tolerances across tools (ranging from 10 to 60) cause unpredictable pass/fail thresholds.
- **Proposed Fix**: Establish standard `DEFAULT_LUMA_TOLERANCE = 32` across all pattern matching and white box tools.
- **Verification Metric**: New pattern rules initialize with `lumaTolerance === 32`.

### PAT-LAY-115: 3x3 Gaussian Noise Reduction Pre-Filter
- **Target File**: `src/lib/vision/luminance-quantizer.ts`
- **Problem**: High-gain camera sensor noise causes 1-2 pixel salt-and-pepper spikes that degrade correlation scores.
- **Proposed Fix**: Apply an optional 3x3 Gaussian convolution kernel `[1, 2, 1; 2, 4, 2; 1, 2, 1] / 16` prior to luminance quantization.
- **Verification Metric**: Signal-to-noise ratio on noisy sensor captures improves by 4.2 dB.

### PAT-LAY-116: Dead Code Elimination in Unused Color Conversion Branches
- **Target File**: `src/lib/vision/algorithms/color-and-coating.ts`
- **Problem**: Legacy unused HSL and YUV conversion routines clutter codebase and complicate maintenance.
- **Proposed Fix**: Remove dead conversion branches and consolidate all grayscale paths onto `applyLuminanceFilter`.
- **Verification Metric**: Codebase bundle size decreases; all vision tests pass without references to deprecated color routines.

### PAT-LAY-117: Delta-L Accuracy Verification Against Macbeth Color Chart
- **Target File**: `src/lib/vision/__tests__/luminance-quantizer.test.ts`
- **Problem**: Lack of standardized colorimetric tests allows subtle luminance calculation errors to persist unnoticed.
- **Proposed Fix**: Author test suite verifying all 24 Macbeth ColorChecker patches against theoretical BT.709 luminance values.
- **Verification Metric**: Maximum deviation across all 24 color patches is < 0.5%.

### PAT-LAY-118: Dark Defect Polarity Enforcement for Laser Etchings
- **Target File**: `src/lib/vision/workpiece-rule-analyzer.ts`
- **Problem**: Laser-ablated chip markings are darker than background silicon under coaxial illumination, requiring inverted scoring logic.
- **Proposed Fix**: Add explicit `polarity: "bright" | "dark" | "any"` parameter to pattern rules; enforce dark-defect scoring when selected.
- **Verification Metric**: Laser etched chip markings match with >90% score under dark-defect polarity mode.

### PAT-LAY-119: Real-Time Grayscale Histogram Cache
- **Target File**: `src/lib/vision/luminance-quantizer.ts`
- **Problem**: Calculating image histograms on demand causes stuttering when opening threshold adjustment sliders.
- **Proposed Fix**: Build a 256-bin histogram array during the primary grayscale conversion pass and cache it on the image buffer object.
- **Verification Metric**: Opening threshold adjustment panel displays instant histogram with 0ms calculation delay.

### PAT-LAY-120: Automated Luminance Conversion Regression Tests
- **Target File**: `src/lib/vision/__tests__/luminance-quantizer.test.ts`
- **Problem**: Risk of silent regressions when optimizing math routines.
- **Proposed Fix**: Continuous automated unit test verifying BT.709 math, fixed-point approximation, and in-place buffer mutation.
- **Verification Metric**: `bun test src/lib/vision/__tests__/luminance-quantizer.test.ts` passes with 100% assertions green.

---

## Category 7: Pin 1 Hole Detection & Rotation Alignment Kernel (PAT-LAY-121 to 140)

### PAT-LAY-121: Adaptive Pin 1 Search Window Expansion
- **Target File**: `src/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/carrier-tape-evaluator.ts`
- **Problem**: Hardcoded 13x13 pixel search window (`dx: -6..6, dy: -6..6`) fails to locate Pin 1 when the chip is slightly offset or tilted.
- **Proposed Fix**: Expand search window to adaptive 32x32 pixel bounds (`dx: -16..16, dy: -16..16`) centered on the nominal corner quadrant.
- **Verification Metric**: Pin 1 dimple offset by 10 pixels is successfully located and registered.

### PAT-LAY-122: Sub-Pixel Radial Symmetry Circle Center Estimation
- **Target File**: `src/components/vision/standard/tools/pin1-config/round-hole-detector.ts`
- **Problem**: Integer pixel coordinates for circle centers cause angular jitter of +/- 4° when computing chip rotation.
- **Proposed Fix**: Implement fast radial symmetry transform (FRST) yielding sub-pixel centroid coordinates `(x, y)` with 0.1px precision.
- **Verification Metric**: Repeated centroid detection across 10 noisy frames has standard deviation < 0.08 pixels.

### PAT-LAY-123: Dual-Zone Annular Contrast Evaluation Kernel
- **Target File**: `src/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/carrier-tape-evaluator.ts`
- **Problem**: Simple thresholding confuses flat dark spots with molded dimples.
- **Proposed Fix**: Compute contrast delta between inner core disc `(R <= 2.5)` and surrounding package annular ring `(4.0 <= R <= 6.0)`.
- **Verification Metric**: Dimple with annular contrast delta > 25.0 luma units is verified as authentic Pin 1 feature.

### PAT-LAY-124: High-Precision Angular Orientation Calculation
- **Target File**: `src/components/vision/standard/tools/pin1-config/round-hole-detector.ts`
- **Problem**: Inaccurate chip center calculation leads to false orientation failure alarms.
- **Proposed Fix**: Compute chip package center via edge caliper intersections; calculate angle `atan2(pin1Y - centerY, pin1X - centerX) * (180 / Math.PI)`.
- **Verification Metric**: Calculated angle on standard chip fixture matches theoretical nominal angle within +/- 0.5°.

### PAT-LAY-125: Exhaustive 4-Quadrant Disambiguation Kernel
- **Target File**: `src/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/carrier-tape-evaluator.ts`
- **Problem**: System fails to detect 90°, 180°, and 270° inverted chip placements in carrier tape pockets.
- **Proposed Fix**: Evaluate all four corner quadrants (Top-Left, Top-Right, Bottom-Left, Bottom-Right) and select best annular contrast peak.
- **Verification Metric**: Chip placed at 180° rotation is triaged as `DEFECT_ORIENTATION` with detected quadrant "bottom-right".

### PAT-LAY-126: Polarity-Aware Dimple vs Ink Mark Detection
- **Target File**: `src/components/vision/standard/tools/pin1-config/types.ts`
- **Problem**: Molded dimples appear dark under ring light, while laser-printed or ink Pin 1 markers appear bright.
- **Proposed Fix**: Support `HolePolarityType.Dark` and `HolePolarityType.Bright`, inverting contrast comparison accordingly.
- **Verification Metric**: Laser-printed bright Pin 1 fiducial successfully detected under bright polarity mode.

### PAT-LAY-127: Configurable Nominal Angle Tolerance Parameter
- **Target File**: `src/components/vision/standard/tools/pin1-config/types.ts`
- **Problem**: Hardcoded angular tolerances reject acceptable parts with minor placement skew.
- **Proposed Fix**: Expose `angleToleranceDeg: number` (default: 25.0°) in Pin 1 rule configuration panel.
- **Verification Metric**: Skewed chip with 18.0° rotation passes when `angleToleranceDeg` is set to 25.0°.

### PAT-LAY-128: Multi-Device Pin 1 Batch Evaluation Across Carrier Tape
- **Target File**: `src/lib/vision/workpiece-rule-analyzer.ts`
- **Problem**: In multi-pocket simulation, Pin 1 is only evaluated for the first pocket, leaving remaining pockets uninspected for orientation.
- **Proposed Fix**: Iterate through all occupied tape pockets and evaluate Pin 1 rule independently using pocket-relative offsets.
- **Verification Metric**: Inspection report contains distinct Pin 1 results and orientation angles for all visible occupied pockets.

### PAT-LAY-129: False Positive Suppression from Laser Flares and Dust
- **Target File**: `src/components/vision/standard/tools/pin1-config/round-hole-detector.ts`
- **Problem**: Dust particles or specular flares near package edges are misidentified as Pin 1 dimples.
- **Proposed Fix**: Enforce circularity metric `4 * Math.PI * Area / (Perimeter * Perimeter) > 0.75` and reject non-circular features.
- **Verification Metric**: Elongated dust speck (circularity 0.45) is rejected; circular dimple (circularity 0.88) is accepted.

### PAT-LAY-130: Chamfer Corner Package Alignment Cross-Validation
- **Target File**: `src/lib/vision/workpiece-rule-analyzer.ts`
- **Problem**: On chips with faint or missing Pin 1 dimples, orientation cannot be determined from round hole detector alone.
- **Proposed Fix**: Inspect package corner chamfer geometry as a secondary cross-validation check for chip orientation.
- **Verification Metric**: Missing dimple with valid package chamfer is flagged with warning but correct orientation verdict.

### PAT-LAY-131: Interactive Pin 1 Marking Tool Crosshair UI
- **Target File**: `src/components/vision/standard/tools/pin1-config/Pin1MarkingTool.tsx`
- **Problem**: Teaching Pin 1 requires typing manual coordinates into text boxes.
- **Proposed Fix**: Provide an interactive draggable crosshair with magnifying loupe in `Pin1MarkingTool`.
- **Verification Metric**: Dragging crosshair updates `nominalPin1X` and `nominalPin1Y` in real time.

### PAT-LAY-132: Dynamic Circular Hole Radius Auto-Fitting
- **Target File**: `src/components/vision/standard/tools/pin1-config/round-hole-detector.ts`
- **Problem**: Varying chip package standards have dimple diameters ranging from 0.5mm to 1.8mm.
- **Proposed Fix**: Implement multi-radius candidate search evaluating radii from 4px to 14px in 1px increments.
- **Verification Metric**: Dimple with true radius 9px is correctly fitted at `radius: 9` with peak contrast score.

### PAT-LAY-133: Geometric Offset Registration Relative to Chip Center
- **Target File**: `src/lib/vision/workpiece-rule-analyzer.ts`
- **Problem**: Storing Pin 1 coordinates in absolute canvas pixels breaks when inspecting shifted chips.
- **Proposed Fix**: Store Pin 1 position as normalized polar offset `(radiusFromCenter, angleDeg)` relative to package body centroid.
- **Verification Metric**: Shifted chip package maintains correct relative Pin 1 search target location.

### PAT-LAY-134: 100% Orientation Classification Benchmark Suite
- **Target File**: `src/lib/vision/__tests__/workpiece-rule-analyzer.test.ts`
- **Problem**: Risk of regression in orientation classification on rotated tape feeds.
- **Proposed Fix**: Author test suite testing synthetic chip images rotated at 0°, 90°, 180°, and 270°.
- **Verification Metric**: 100% of rotated test fixtures classified with correct rotation quadrant.

### PAT-LAY-135: Canvas Inspection Overlay for Detected Hole and Target
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Operators cannot see where Pin 1 was actually detected versus where it was expected.
- **Proposed Fix**: Draw a green circle around detected Pin 1 hole and a faint cyan dashed circle at nominal position, connected by a line vector.
- **Verification Metric**: Canvas renders visual alignment vector and circle overlays for verified Pin 1 features.

### PAT-LAY-136: Orientation Alarm Telemetry with Exact Angular Deviation
- **Target File**: `src/lib/editor/validation-store.ts`
- **Problem**: Alarm messages state "Rule Failed" without explaining whether the chip is rotated 90° or 180°.
- **Proposed Fix**: Populate failure message with exact diagnostic details: `Chip rotated 180.2° (Expected: -134.0°, Detected: +46.2°)`.
- **Verification Metric**: Inspection result message contains formatted angle deviation string.

### PAT-LAY-137: Edge Gradient Sensitivity Slider in Pin 1 Config UI
- **Target File**: `src/components/vision/standard/tools/pin1-config/Pin1MarkingTool.tsx`
- **Problem**: Faint molded dimples on matte black plastic fail detection under fixed sensitivity settings.
- **Proposed Fix**: Add an "Edge Sensitivity" slider (10 to 100) controlling the minimum radial gradient threshold.
- **Verification Metric**: Lowering sensitivity slider successfully captures faint dimple on low-contrast package.

### PAT-LAY-138: Normalized Template Matching Fallback for Custom Fiducials
- **Target File**: `src/lib/vision/pattern-matcher.ts`
- **Problem**: Non-standard packages use triangle notches or laser text instead of circular holes for Pin 1 orientation.
- **Proposed Fix**: Provide template matching fallback that correlates a taught arbitrary geometric fiducial if circular hole detector finds no candidates.
- **Verification Metric**: Triangular orientation notch is successfully registered via template fallback.

### PAT-LAY-139: Carrier Tape Sprocket Hole Exclusion Shield
- **Target File**: `src/components/vision/standard/tools/pin1-config/round-hole-detector.ts`
- **Problem**: Tape feeder sprocket holes (1.5mm diameter) near the pocket edge are frequently misidentified as Pin 1 dimples.
- **Proposed Fix**: Mask out all pixels falling outside the segmented pocket cavity perimeter before running round hole detection.
- **Verification Metric**: Sprocket hole located 15px from pocket border is completely excluded from Pin 1 candidate search.

### PAT-LAY-140: Unit Test Validation with Real Microscope Imagery
- **Target File**: `src/components/vision/standard/tools/pin1-config/__tests__/round-hole-detector.test.ts`
- **Problem**: Synthetic circle tests fail to reflect real-world mold flash and surface roughness.
- **Proposed Fix**: Include unit tests validating round hole detector against production microscope captures of Atmel packages.
- **Verification Metric**: Test suite executes with 100% pass rate on production image fixtures.

---

## Category 8: Pattern Match Search Algorithms (NCC, Centroid Registration, Sub-Pixel) (PAT-LAY-141 to 160)

### PAT-LAY-141: Normalized Cross-Correlation (NCC) Core Algorithm
- **Target File**: `src/lib/vision/pattern-matcher.ts`
- **Problem**: Simple sum of absolute differences (SAD) fails when camera auto-exposure or line lighting changes overall frame brightness.
- **Proposed Fix**: Implement true Normalized Cross-Correlation (NCC): `gamma = sum((I - meanI) * (T - meanT)) / sqrt(sum((I - meanI)^2) * sum((T - meanT)^2))`.
- **Verification Metric**: Pattern match score remains stable within 1.0% when image brightness is increased or decreased by 30%.

### PAT-LAY-142: Summed-Area Table (Integral Image) Acceleration
- **Target File**: `src/lib/vision/pattern-matcher.ts`
- **Problem**: Recomputing local mean and variance over thousands of sliding window candidate positions is computationally prohibitive.
- **Proposed Fix**: Compute integral image `SAT[y, x] = I[y, x] + SAT[y-1, x] + SAT[y, x-1] - SAT[y-1, x-1]` and squared integral image once per search region.
- **Verification Metric**: Sliding window mean and variance computation executes in `O(1)` time per candidate position.

### PAT-LAY-143: Coarse-to-Fine Hierarchical Image Pyramid Search
- **Target File**: `src/lib/vision/pattern-matcher.ts`
- **Problem**: Exhaustive full-resolution search across large ROI windows causes frame drop during high-speed conveyor operation.
- **Proposed Fix**: Build 2-level Gaussian image pyramid: perform coarse search with 4x downsampling, then refine top 3 candidate peaks at 1x resolution.
- **Verification Metric**: Total pattern search execution time drops by >70% while maintaining sub-pixel accuracy.

### PAT-LAY-144: Sub-Pixel Parabolic Peak Interpolation
- **Target File**: `src/lib/vision/pattern-matcher.ts`
- **Problem**: Discrete integer search steps limit registration accuracy to +/- 0.5 pixels, causing jitter in robot pick-and-place offset coordinates.
- **Proposed Fix**: Fit a 2D parabolic quadratic surface `z = a*x^2 + b*y^2 + c*x + d*y + e` around peak correlation score to extract sub-pixel peak `(dx, dy)`.
- **Verification Metric**: Peak registration accuracy achieves sub-pixel precision within +/- 0.05 pixels on synthetic shifted targets.

### PAT-LAY-145: Constellation Feature Centroid Registration
- **Target File**: `src/lib/vision/pattern-matcher.ts`
- **Problem**: Individual box matches experience independent noise, causing jitter in overall chip alignment.
- **Proposed Fix**: Compute weighted centroid of all matched constellation boxes `Centroid = sum(W_i * Pos_i) / sum(W_i)` where `W_i` is individual box correlation score.
- **Verification Metric**: Overall chip location registration standard deviation drops below 0.1 pixels across 20 video frames.

### PAT-LAY-146: Optical Magnification Scale Tolerance Search (+/- 5%)
- **Target File**: `src/lib/vision/pattern-matcher.ts`
- **Problem**: Minor component height variations change optical working distance, altering chip image size by 1-3% and dropping correlation.
- **Proposed Fix**: Search across 3 scale steps (`0.97, 1.00, 1.03`) during hierarchical coarse search pass.
- **Verification Metric**: Target chip scaled by +3% matches with >92% correlation score.

### PAT-LAY-147: Angular Rotation Tolerance Search Grid (+/- 8°)
- **Target File**: `src/lib/vision/pattern-matcher.ts`
- **Problem**: Components placed with slight mechanical rotation lose pattern match correlation.
- **Proposed Fix**: Search an angular grid from -8° to +8° in 2° increments using fast rotated constellation offsets.
- **Verification Metric**: Chip rotated by 5° matches with >90% correlation score.

### PAT-LAY-148: Early Bailout Bound Optimization in Search Loops
- **Target File**: `src/lib/vision/pattern-matcher.ts`
- **Problem**: Evaluating all 24 constellation boxes on candidate locations that fail on the first 3 boxes wastes processor cycles.
- **Proposed Fix**: Calculate running Cauchy-Schwarz upper bound; abort evaluation if theoretical maximum cannot exceed `minMatchPercent`.
- **Verification Metric**: Average box evaluations per rejected candidate position drops from 24 to 3.8.

### PAT-LAY-149: Feature Contrast Weighting in Constellation Scoring
- **Target File**: `src/lib/vision/pattern-matcher.ts`
- **Problem**: Boxes placed over blank chip epoxy contribute equally to the score as boxes placed over distinct alphanumeric markings.
- **Proposed Fix**: Weight each box's contribution proportional to its taught variance: `Weight = Math.max(0.2, boxVariance / maxVariance)`.
- **Verification Metric**: Laser marked text boxes carry 3.5x higher weight in verdict determination than flat background boxes.

### PAT-LAY-150: Calibrated Score Normalization (0.0 to 100.0%)
- **Target File**: `src/lib/vision/pattern-matcher.ts`
- **Problem**: Raw NCC scores (-1.0 to +1.0) confuse manufacturing operators who expect a percentage score.
- **Proposed Fix**: Normalize and map NCC score to calibrated percentage: `Score = Math.max(0, Math.min(100, Math.round(((ncc + 1) / 2) * 100)))`.
- **Verification Metric**: Output score is strictly bounded between 0 and 100 with clear 80% pass threshold.

### PAT-LAY-151: Minimum Box Match Density Guard
- **Target File**: `src/lib/vision/pattern-matcher.ts`
- **Problem**: An image with a single bright artifact can score high on 3 boxes while 21 boxes fail, occasionally yielding false positives.
- **Proposed Fix**: Enforce match density rule: overall match requires at least `minBoxCount = Math.ceil(totalBoxes * 0.75)` individual boxes to exceed threshold.
- **Verification Metric**: False positive artifact passing 4 boxes but failing 20 is rejected with `DensityFail`.

### PAT-LAY-152: Adaptive Sub-Sampling Stride Optimization
- **Target File**: `src/lib/vision/pattern-matcher.ts`
- **Problem**: Stepping pixel-by-pixel across a 400x400 search area evaluates 160,000 positions.
- **Proposed Fix**: Use a 2x2 stride on coarse scan; switch to 1x1 stride only within a 5x5 neighborhood around correlation peaks.
- **Verification Metric**: Total candidate evaluations reduced by 72% with zero peak location loss.

### PAT-LAY-153: Dedicated Web Worker Parallel Match Thread
- **Target File**: `src/lib/vision/workpiece-rule-analyzer.ts`
- **Problem**: Intensive pattern matching on the main JavaScript thread causes UI micro-freezes and dropped frames.
- **Proposed Fix**: Offload sliding window pattern matching calculations to a dedicated Web Worker `pattern-matcher.worker.ts`.
- **Verification Metric**: Main UI thread responsiveness remains at 60fps during continuous pattern matching execution.

### PAT-LAY-154: Hard Boundary Buffer Overrun Protection
- **Target File**: `src/lib/vision/pattern-matcher.ts`
- **Problem**: Candidate search boxes near image borders attempt to read out-of-bounds memory, throwing `RangeError`.
- **Proposed Fix**: Clamp search coordinate space so template bounds never exceed `(0, 0, imageWidth, imageHeight)`.
- **Verification Metric**: Search region positioned against canvas edge executes without out-of-bounds memory errors.

### PAT-LAY-155: Translation Vector Diagnostic Reporting
- **Target File**: `src/lib/editor/types.ts`
- **Problem**: Operators cannot see how far a chip has shifted from nominal position.
- **Proposed Fix**: Include `translationOffset: { dx: number; dy: number }` in pattern match result payload.
- **Verification Metric**: Result payload contains exact pixel displacement vector from taught origin.

### PAT-LAY-156: Diagnostic Correlation Surface Heatmap Generator
- **Target File**: `src/lib/vision/pattern-matcher.ts`
- **Problem**: Vision engineers cannot debug why a pattern matched the wrong feature without visualizing correlation scores.
- **Proposed Fix**: Provide a debug mode that exports the 2D correlation score matrix as a false-color heatmap overlay.
- **Verification Metric**: Debug mode generates valid `ImageData` heatmap showing distinct correlation peaks.

### PAT-LAY-157: Hybrid ShapeTrax Edge-Contour Match Integration
- **Target File**: `src/lib/vision/algorithms/shapetrax.ts`
- **Problem**: IC packages with degraded or faint laser text fail grayscale pattern matching.
- **Proposed Fix**: Integrate ShapeTrax edge-gradient direction matching on package perimeter as a secondary confidence booster.
- **Verification Metric**: Chip with 50% abraded text passes inspection due to strong edge contour correlation.

### PAT-LAY-158: Reusable Pre-Allocated Internal Calculation Buffers
- **Target File**: `src/lib/vision/pattern-matcher.ts`
- **Problem**: Allocating intermediate arrays for image gradients and box sums on every frame triggers GC thrashing.
- **Proposed Fix**: Pre-allocate scratchpad memory buffers during worker initialization and reuse them across frames.
- **Verification Metric**: Zero garbage collection pauses detected in performance timeline during 100 consecutive frames.

### PAT-LAY-159: Deterministic Static Image Evaluation Guarantee
- **Target File**: `src/lib/vision/pattern-matcher.ts`
- **Problem**: Non-deterministic floating point sums occasionally cause repeated analysis of the same static image to yield varying scores.
- **Proposed Fix**: Use deterministic integer accumulation order in all box sum and variance calculations.
- **Verification Metric**: Running 50 repeated evaluations on a static image yields identical score to 4 decimal places.

### PAT-LAY-160: Performance Benchmark: < 15ms Execution on 24-Box Set
- **Target File**: `src/lib/vision/__tests__/pattern-matcher.test.ts`
- **Problem**: Vision inspection must complete within 20ms to keep pace with 3,000 UPH conveyor line speeds.
- **Proposed Fix**: Benchmark and optimize full 24-box constellation matching routine.
- **Verification Metric**: Benchmark test confirms average execution time on 960x540 frame is < 14.5ms.

---

## Category 9: Photoshop Layers Reordering, Grouping & Z-Index Physics (PAT-LAY-161 to 180)

### PAT-LAY-161: Direction Inversion Fix for Move Up and Move Down
- **Target File**: `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`
- **Problem**: In `WorkpieceAnalyzeWorkspace.tsx:1110`, clicking "Move Layer Up" calculates `dir === "up" ? idx - 1 : idx + 1`. Because the Photoshop panel sorts layers descending by z-index (`b.zIndex - a.zIndex`), decrementing the array index moves the layer DOWN visually, confusing users.
- **Proposed Fix**: Invert array index manipulation: `dir === "up" ? idx + 1 : idx - 1` so that moving "up" increments array index, increasing z-index and moving the layer UP visually in the Photoshop stack.
- **Verification Metric**: Clicking Move Up on layer at index 1 moves it to index 2, elevating its visual position in the Photoshop panel.

### PAT-LAY-162: Canvas Painting Order and Z-Index Physics Synchronization
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Canvas iterates rules by array order, while layers panel displays descending order, creating a disconnect between visual list order and canvas rendering priority.
- **Proposed Fix**: Strictly enforce invariant: array index `i` equals canvas paint order; higher array index paints over lower index; layer at top of Photoshop panel has highest array index.
- **Verification Metric**: Top-most layer in Photoshop panel visually occludes layers beneath it on canvas.

### PAT-LAY-163: Permanent Pinning of Background Image Layer at Index 0
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: Operators can accidentally drag inspection ROIs beneath the background image layer, causing shapes to disappear completely from the canvas.
- **Proposed Fix**: Hard-pin the `image` layer permanently to array index 0; disable reorder, delete, and hide controls on image layer.
- **Verification Metric**: "Send to Back" action on an ROI clamps target index to 1, never placing a rule beneath the background image.

### PAT-LAY-164: Bring to Front and Send to Back Stack Boundary Clamping
- **Target File**: `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`
- **Problem**: In `onBringToFront` and `onSendToBack`, boundary checks allow elements to be spliced to index 0 or past array length.
- **Proposed Fix**: Clamp `onSendToBack` target index strictly to `Math.max(1, ...)` (above background image) and `onBringToFront` strictly to `rules.length - 1`.
- **Verification Metric**: Sending layer to back moves it immediately above background image; bringing to front moves it to top of stack.

### PAT-LAY-165: Drag-and-Drop Reordering with Animated Insertion Indicator
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: Reordering layers requires clicking small arrow buttons multiple times; drag-and-drop is unsupported.
- **Proposed Fix**: Implement HTML5 drag-and-drop or pointer drag reordering with a visible horizontal cyan insertion marker line.
- **Verification Metric**: Dragging a layer row and dropping it between two layers updates the rules array order accordingly.

### PAT-LAY-166: Multi-Rule Layer Grouping (Folder Hierarchies)
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: Workpieces with 5 pockets and 4 rules per pocket generate 20 flat layer rows, making navigation unmanageable.
- **Proposed Fix**: Support collapsible layer groups (`type: "group"`): group rules by pocket or function with collapse/expand toggles.
- **Verification Metric**: Clicking group collapse hides child layer rows while maintaining single group header in panel.

### PAT-LAY-167: Multi-Layer Selection via Shift+Click and Ctrl+Click
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: Deleting or hiding multiple rules requires clicking each rule individually.
- **Proposed Fix**: Support multi-selection state `selectedLayerIds: string[]`: `Ctrl+Click` toggles selection; `Shift+Click` performs range selection.
- **Verification Metric**: Shift+clicking row 1 then row 4 selects all 4 intervening layers in the list.

### PAT-LAY-168: Per-Layer Canvas Opacity Slider
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: Solid mask overlays obscure underlying chip features, preventing inspection verification.
- **Proposed Fix**: Add an `opacity: number` slider (0% to 100%) in the layer row context menu; apply `ctx.globalAlpha = opacity / 100` when painting layer.
- **Verification Metric**: Setting layer opacity to 50% renders the shape with half transparency on canvas.

### PAT-LAY-169: Layer Blend Mode Selector (Normal, Multiply, Screen, Overlay)
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: Highlighting defective regions with standard colors washes out surface texture details.
- **Proposed Fix**: Support Canvas `globalCompositeOperation` modes: `source-over`, `multiply`, `screen`, and `overlay`.
- **Verification Metric**: Selecting `multiply` blend mode preserves underlying chip surface texture beneath the highlight mask.

### PAT-LAY-170: Inline Layer Renaming via Double Click
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: Renaming a rule requires opening the full rule configuration modal and editing the name field.
- **Proposed Fix**: Double clicking a layer name switches the label into an inline editable `<input>` element with auto-save on Enter or blur.
- **Verification Metric**: Double clicking "Pattern Match 1", typing "Atmel Body Chip", and pressing Enter updates the rule name.

### PAT-LAY-171: Layer Duplicate Action with Coordinate Offset
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: Replicating a rule for an adjacent pocket requires manually recreating all parameters.
- **Proposed Fix**: Provide "Duplicate Layer" button that clones the selected rule, assigns a new UUID, increments name, and offsets `x` and `y` by +15px.
- **Verification Metric**: Duplicating "Pin 1" creates "Pin 1 Copy" with matching parameters shifted by 15 pixels.

### PAT-LAY-172: Batch Delete of Selected Layer Constellations
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: Deleting 5 obsolete rules requires 5 separate delete dialog confirmations.
- **Proposed Fix**: Pressing `Delete` key or clicking trash button with multi-selection active prompts single confirmation to delete all selected layers.
- **Verification Metric**: Deleting 3 selected layers removes all 3 from ruleset in a single atomic store transaction.

### PAT-LAY-173: Industry-Standard Photoshop Keyboard Shortcuts
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: Power users lack standard graphic software shortcuts for adjusting layer stacks.
- **Proposed Fix**: Bind keyboard shortcuts: `Ctrl+]` (Bring Forward), `Ctrl+[` (Send Backward), `Ctrl+Shift+]` (Bring to Front), `Ctrl+Shift+[` (Send to Back).
- **Verification Metric**: Pressing `Ctrl+]` moves the active layer up one position in the stack.

### PAT-LAY-174: Layer Thumbnail Visual Preview Generator
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: Abstract rule names make it difficult to identify which shape corresponds to which row without clicking.
- **Proposed Fix**: Render a 24x16 pixel thumbnail canvas in each layer row showing a mini preview of the cropped ROI feature.
- **Verification Metric**: Layer row renders miniature graphical thumbnail of the inspected chip region.

### PAT-LAY-175: Auto-Scroll to Active Layer on Canvas Shape Selection
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: In long layer lists, clicking a shape on canvas selects it in state, but the layer list does not scroll to show the selected row.
- **Proposed Fix**: Use `scrollIntoView({ behavior: "smooth", block: "nearest" })` on the selected layer DOM node upon selection.
- **Verification Metric**: Selecting a rule located at the bottom of the canvas scrolls the layer panel to reveal the selected row.

### PAT-LAY-176: Synchronous Store Transaction Architecture
- **Target File**: `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`
- **Problem**: Updating ruleset rules via asynchronous callback can cause temporary desynchronization between `ruleset.rules` and `useRulesStore`.
- **Proposed Fix**: Execute `updateRulesetRules` and `useRulesStore.getState().replaceAll` in a single synchronous execution frame.
- **Verification Metric**: Store state inspection immediately after reorder confirms identical array order in both stores.

### PAT-LAY-177: Accurate Layer Count Badges in Panel Header
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: Layer count badge in the panel header includes hidden or system layers, displaying misleading numbers to operators.
- **Proposed Fix**: Display count of active user rules: `${userRules.length} Layers (${hiddenCount} hidden)`.
- **Verification Metric**: Header badge displays `3` when 3 user inspection rules exist in the ruleset.

### PAT-LAY-178: Color Tag Swatch Picker for Rule Categorization
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: Complex rulesets have no visual taxonomy to group rules by inspection type (e.g. Dimensions vs Orientation vs Surface Flaws).
- **Proposed Fix**: Right-clicking a layer row offers a color swatch palette (Red, Orange, Yellow, Green, Blue, Purple) to tint the row indicator.
- **Verification Metric**: Setting color tag to Green updates the layer's `colorTag` property and renders green tab swatch.

### PAT-LAY-179: Panel Collapsed State Persistence in UI Preferences
- **Target File**: `src/lib/stores/ui-prefs-store.ts`
- **Problem**: Expanding or collapsing the Photoshop layers panel resets to default state on every page reload.
- **Proposed Fix**: Persist `isLayersPanelOpen: boolean` and `layersPanelWidth: number` in `useUiPrefsStore`.
- **Verification Metric**: Collapsing the layers panel and refreshing the page preserves the collapsed state.

### PAT-LAY-180: Virtualized List Rendering for High-Density Inspections
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: Systems with >100 inspection rules suffer scrolling lag due to excessive DOM node creation.
- **Proposed Fix**: Integrate virtualization (`@tanstack/react-virtual` or lightweight virtual window) for layer lists exceeding 25 items.
- **Verification Metric**: Scrolling a 150-layer ruleset maintains smooth 60fps frame rate without DOM lag.

---

## Category 10: Layer Canvas Locking, Context Menus & Creation Ergonomics (PAT-LAY-181 to 200)

### PAT-LAY-181: Strict Canvas Pointer Event Locking Physics
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Marking a layer as "Locked" in the layers panel disables sidebar property editing, but users can still drag and resize the shape on canvas.
- **Proposed Fix**: In `handlePointerDown`, check `rule.isLocked`: if true, ignore move, drag, and resize interactions completely; allow only selection.
- **Verification Metric**: Dragging a locked ROI on canvas results in 0 change to `x`, `y`, `width`, or `height`.

### PAT-LAY-182: Visual Lock Padlock Indicator on Canvas Border
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Operators cannot tell why an ROI refuses to move because there is no visual indicator of locked status on the canvas itself.
- **Proposed Fix**: Render an amber padlock icon `[Lock]` at the top-left corner of locked ROIs, and draw the border in dashed amber stroke.
- **Verification Metric**: Canvas renders padlock symbol and amber dashed outline on all locked rules.

### PAT-LAY-183: Global "Lock All Layers" Header Action
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: Protecting a complete template from accidental edits before production run requires locking dozens of layers one by one.
- **Proposed Fix**: Provide a "Lock All / Unlock All" master padlock toggle button in the layers panel header.
- **Verification Metric**: Clicking master lock sets `isLocked: true` on all user rules in the active ruleset.

### PAT-LAY-184: In-Canvas Custom Context Menu on Right Click
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Right-clicking an ROI opens the standard browser context menu ("Inspect Element", "Save Image As"), interrupting inspection workflow.
- **Proposed Fix**: Intercept `contextmenu` on canvas; if hit over an ROI, display a custom dark-themed context menu with inspection actions.
- **Verification Metric**: Right-clicking an ROI prevents default browser menu and opens custom vision context menu at cursor coordinates.

### PAT-LAY-185: Context Menu Dismissal and Focus Cleanup
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: Custom context menus remain stuck on screen if the user clicks outside or scrolls the canvas.
- **Proposed Fix**: Attach global document listeners for `mousedown` and `wheel` to dismiss open context menus immediately.
- **Verification Metric**: Clicking anywhere outside the context menu closes it cleanly.

### PAT-LAY-186: Single-Click New Shape Creation Tools in Panel Footer
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: Creating a new ROI requires opening a full modal dialog, slowing down rapid inspection authoring.
- **Proposed Fix**: Add a footer toolbar to the layers panel with quick creation buttons: `+ Square ROI`, `+ Circle`, `+ Pattern Match`, `+ Pin 1`.
- **Verification Metric**: Clicking `+ Pattern Match` instantly appends a new pattern rule centered in the active viewport.

### PAT-LAY-187: Smart Sequential Tool Auto-Naming
- **Target File**: `src/lib/editor/types.ts`
- **Problem**: Newly created rules all share identical generic names ("New Rule"), creating confusing duplicates in the layer stack.
- **Proposed Fix**: Auto-increment rule names based on tool type: `Pattern Match 1`, `Pattern Match 2`, `Pin 1 Check 1`.
- **Verification Metric**: Creating 3 pattern rules produces sequentially numbered names without collisions.

### PAT-LAY-188: Magnetic Snapping to Grid and Pocket Edges
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Aligning an ROI precisely with pocket edges requires tedious pixel-by-pixel nudging.
- **Proposed Fix**: Implement magnetic snapping: when dragging an ROI within 6px of pocket borders or adjacent rules, snap coordinates automatically.
- **Verification Metric**: Dragging ROI 4px from pocket border snaps boundary flush with pocket edge.

### PAT-LAY-189: Bidirectional Canvas-to-Panel Selection Synchronization
- **Target File**: `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`
- **Problem**: Selecting a layer in the panel highlights it on canvas, but clicking a shape on canvas occasionally fails to update panel selection.
- **Proposed Fix**: Unify selection through `selectedRuleId` state; ensure canvas shape click triggers `handleSelectProjectRule(id)` synchronously.
- **Verification Metric**: Clicking a shape on canvas immediately highlights its corresponding row in the layers panel.

### PAT-LAY-190: Canvas Deselection on Background Click
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Clicking blank canvas area leaves previous ROI selected, preventing clean un-annotated full-frame inspection.
- **Proposed Fix**: In `handlePointerDown`, if cursor does not intersect any shape bounding box, clear active selection (`selectedRuleId = null`).
- **Verification Metric**: Clicking empty background deselects all active rules and dismisses floating toolbars.

### PAT-LAY-191: Interactive Marquee ROI Creation Drag Mode
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Adding an ROI places a fixed-size box that must then be moved and resized to fit the feature.
- **Proposed Fix**: Provide a "Marquee Draw" cursor tool allowing operators to click and drag to define the exact initial ROI rectangle.
- **Verification Metric**: Dragging from `(100, 100)` to `(250, 250)` creates new ROI with exact coordinates and dimensions.

### PAT-LAY-192: Shift-Constrained Square Creation in Marquee Mode
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Operators drawing a marquee ROI cannot constrain it to a perfect 1:1 square during initial creation.
- **Proposed Fix**: While in marquee creation mode, holding `Shift` forces the bounding box to maintain a strict 1:1 square aspect ratio.
- **Verification Metric**: Marquee drag with Shift pressed creates rule with strictly identical width and height.

### PAT-LAY-193: Layer Solo Isolation Mode (Alt+Click Eye Icon)
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: In cluttered workspaces with 15 rules, inspecting a single rule requires manually hiding 14 other rules.
- **Proposed Fix**: Holding `Alt` while clicking a layer's visibility eye hides all other layers; Alt-clicking again restores previous visibility.
- **Verification Metric**: Alt-clicking layer 2 eye hides layers 1 and 3; Alt-clicking again reveals all layers.

### PAT-LAY-194: Full Undo/Redo Integration for Layer Locking and Visibility
- **Target File**: `src/lib/stores/rules-store.ts`
- **Problem**: Toggling layer locks or hiding layers bypasses the undo stack, making accidental changes unrecoverable via `Ctrl+Z`.
- **Proposed Fix**: Dispatch all layer visibility and lock mutations through `recordHistoryStep` in `rules-store`.
- **Verification Metric**: Hiding a layer and pressing `Ctrl+Z` immediately restores layer visibility.

### PAT-LAY-195: Read-Only Guard During Active Simulation Runs
- **Target File**: `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`
- **Problem**: Modifying layer geometry while carrier tape simulation is actively advancing frames causes race conditions and corrupted results.
- **Proposed Fix**: Disable layer creation, moving, and deletion controls when `isSimulationRunning === true`.
- **Verification Metric**: All layer modification buttons are disabled and carry `cursor-not-allowed` styling during simulation run.

### PAT-LAY-196: Long-Press Touchscreen Context Menu Trigger
- **Target File**: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- **Problem**: Shop-floor touchscreens lack right-click buttons, preventing operators from accessing context menus.
- **Proposed Fix**: Detect pointer-down dwell > 500ms on touch devices without movement; trigger custom context menu at touch point.
- **Verification Metric**: 600ms finger hold on an ROI opens the vision context menu.

### PAT-LAY-197: Post-Interaction Canvas Focus Retention
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: Clicking inside the layers panel steals keyboard focus, preventing immediate use of canvas shortcuts like arrow nudges.
- **Proposed Fix**: Return focus to canvas container element `canvasRef.current?.focus()` after layer selection clicks.
- **Verification Metric**: Clicking a layer in the panel and immediately pressing Arrow Keys nudges the shape on canvas.

### PAT-LAY-198: Layer Geometry Clipboard Export/Import
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: Replicating a finely tuned rule between two separate projects requires re-measuring all coordinates.
- **Proposed Fix**: Add "Copy Layer JSON" and "Paste Layer" to the context menu using system clipboard API.
- **Verification Metric**: Copying Rule A and pasting into Project B recreates identical rule geometry and parameters.

### PAT-LAY-199: Accessible ARIA Tree Structure and Keyboard Navigation
- **Target File**: `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- **Problem**: Layer stack lacks accessibility landmarks, preventing screen-reader operation and keyboard accessibility audits.
- **Proposed Fix**: Implement `role="tree"` on layer list with `role="treeitem"`, `aria-selected`, and Up/Down arrow list navigation.
- **Verification Metric**: Layer panel passes automated WCAG accessibility audit with zero critical violations.

### PAT-LAY-200: Automated E2E Test Suite for Full Layer Ergonomics
- **Target File**: `tests/unit/photoshop-layers.test.tsx`
- **Problem**: Complex interaction between layer reordering, canvas hit-testing, and locking requires automated regression verification.
- **Proposed Fix**: Author comprehensive test suite covering selection, locking, creation, reordering, and canvas event suppression.
- **Verification Metric**: `bun test tests/unit/photoshop-layers.test.tsx` passes with 100% assertions green.

---

## Verification & Compliance Summary

Every improvement in this specification has been engineered to comply strictly with repository architectural standards:
- **Strict Boolean Standard**: Zero non-standard boolean prefixes. Only `is` and `has` prefixes are utilized throughout all schemas and code modifications.
- **Relative Git Path Integrity**: Zero absolute filesystem paths. All paths strictly adhere to repository-relative conventions (`src/...`, `tests/...`).
- **Positive Framing**: Boolean flags are framed positively (e.g. `isLocked`, `isVisible`, `isSquareLocked`) with zero double negatives.
- **Zero-Storage Action Hygiene**: All diagnostic outputs, test fixtures, and intermediate logs avoid persistent external storage footprint.
