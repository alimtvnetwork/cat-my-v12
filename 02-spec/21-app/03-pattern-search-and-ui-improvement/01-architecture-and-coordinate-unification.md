# 01 — Architecture and Coordinate Unification

**Status:** Draft spec for `03-pattern-search-and-ui-improvement`. This file covers
root cause RC1 (four coordinate spaces, zero conversion between them) and the
architecture contract that fixes it.

**Parent spec:** `.ai-memory/plans/completed/01-pattern-search-spec.md` (the
authoritative pattern-search build spec). This file does not restate that screen;
it fixes the coordinate layer underneath it.

**Scope of this file:** canonical image space, the conversion contract between
the four existing coordinate spaces, zoom/pan purity, backend ROI intake, and
simulation isolation. Threshold and luminance semantics belong to file 02.
Square-ROI rules belong to file 03. Region/toolbar UX belongs to the component
spec. Dispatcher routing belongs to the matcher/data-model spec.

**Non-negotiable inheritance (from the parent spec §0, in priority order):**

1. Do not modify or degrade the Modern UI. The Standard UI is an additional
   presentation of the same data and the same domain logic.
2. DRY is the highest priority. The coordinate conversion helpers, the canonical
   space definition, and the geometry persistence adapter are defined **once**
   in shared domain code and consumed by every UI and every evaluation path.
   A second conversion helper written for one tool is a failed implementation.
3. A UI-mode switch is used in every case. Only *presentation* branches; state,
   validation, persistence, and computation do not.
4. Do not invent semantics for the parent spec §12 unknowns (Unit Time, zoom
   100% reference, `1 - 000` reference-image semantics, Image Region purpose,
   Extract Colors enablement, `>>` expander contents, Counts semantics, the
   three view-mode icon toggles). This file renders no opinion on them.
5. Everything on screen must exist. Coordinate fixes must not remove, move, or
   hide any control, readout, or overlay.

**Also binding:** `02-spec/21-app/32-shape-model.md` (single geometry source of
truth; image-space integer coordinates only), `02-spec/21-app/35-zoom-and-pan.md`
(zoom/pan are pure view transforms), `02-spec/21-app/62-rule-mask-image.md`
(coordinate boundary only: mask geometry is image-space geometry; the mask
threshold formula itself is file 02's concern).

---

## 1. Problem statement (RC1)

Pattern search, simulation, the editor, and the backend each live in a
different coordinate space, and no file anywhere converts between them. A
region drawn in one space and evaluated in another lands in the wrong place —
off by 1280/960 = 1.33x in both axes even when aspect ratios match, and worse
when they do not, because two of the spaces stretch images instead of
preserving aspect.

Observed failure signature (operator screenshots, 31-Oct-26):

- Amber `Res Mismatch` warnings: loaded images of 1042x403 and 392x373 against
  a calibrated 960x540 frame.
- A 930x174 ROI, sized for the calibrated frame, drawn larger than a 392x373
  image, with 49 numbered pattern boxes spilling past the image edges into
  black canvas.
- Rule 2 (Greyscale Pattern Matching) failing with "missing saved pattern
  boxes", both rules failing, workspace rejected.

Why it broke when simulation arrived: before simulation, operators accidentally
lived in one stretched space. Simulation added a fourth space and a second
evaluation path, so the same rule name can now route to tools living in
different spaces. The regression is structural, not a single bad line.

---

## 2. Canonical image space (the contract)

All geometry in the pattern-search system is expressed in **canonical image
space**, defined as follows (32-shape-model §3, restated here so this file is
self-contained):

| Property    | Rule                                                                 |
| ----------- | -------------------------------------------------------------------- |
| Origin      | Top-left of the source image.                                        |
| Axis        | X increases right; Y increases down.                                 |
| Unit        | Integer image pixels.                                                |
| Persistence | Persist image-space coordinates only. Never persist CSS pixels, zoom, |
|             | pan, or device-pixel ratio.                                          |
| Bounds      | Every point must satisfy `0 <= X < ImageWidth` and `0 <= Y < ImageHeight`. |
| Transform   | UI owns a reversible `ImageToScreen` transform for zoom/pan;         |
|             | hit-testing uses the inverse transform.                              |

Additional rules this spec adds:

- **Canonical space is native source-image pixels.** The 960x540 normalization
  (see §3, Space B) is a legacy evaluation convenience, not the canonical
  space. Any evaluation that downsamples or normalizes must record its scale
  factors and map results back to canonical space before scoring or display.
- **Every image load records its transform.** At load time the loader records
  `sourceWidth`, `sourceHeight`, and the scale factors used to reach any
  working space (`scaleX`, `scaleY`). A region is meaningless without the
  image dimensions it was drawn against; a loader that discards them is a bug.
- **No aspect-destroying stretch on the evaluation path.** Drawing an image
  to fill a target rectangle of a different aspect ratio (`drawImage` with a
  forced target width/height) is forbidden for any image that feeds geometry
  or evaluation. Display-only stretch, if it ever exists, must be labelled as
  display-only and must never feed a region coordinate, a box position, or a
  score.
- **The `geometryJson` envelope is the persisted form** (32-shape-model §5):
  `SchemaVersion`, `ShapeKind` (`RECTANGLE` | `ELLIPSE` | `POLYGON`; `FREEFORM`
  is not a persisted v1 kind), `RegionRole`, `ImageWidth`, `ImageHeight`, and
  the shape geometry. `ImageWidth`/`ImageHeight` in the envelope are the
  canonical dimensions the geometry was drawn against, and they are what makes
  migration (§4.4) possible.
- **One conversion helper set, in shared domain code.** All conversions go
  through it. No tool, canvas, hook, or route may hand-roll a scale factor.
  The helper set owns: canonical-to-working-space, working-space-to-canonical,
  pointer-to-canonical (via the inverse `ImageToScreen`), and clamping to
  image bounds. This is the DRY requirement applied to coordinates.

---

## 3. The four existing spaces (as-built evidence)

| Space | Size | Where it lives | How it is created |
| ----- | ---- | -------------- | ----------------- |
| A — Editor | 1280x720 | `src/lib/editor/coords.ts:9` (`IMAGE_BOUNDS`); consumed by `src/components/vision/standard/StandardCanvas.tsx` (image stretched with `object-fill` + `backgroundSize: 100% 100%` into an `IMAGE_BOUNDS x zoom` box) and `src/components/vision/standard/RegionOverlay.tsx` (drag/resize clamped to `IMAGE_BOUNDS`) | Hardcoded constant; image stretched to fit |
| B — Pattern | 960x540 | `src/lib/vision/white-box-marking.ts:225` (`STANDARD_CANVAS_WIDTH/HEIGHT`) and `readImageFile`/`readImageUrl` (draw stretched to 960x540); `src/components/vision/standard/tools/pattern-matching/usePatternMatchingRule.ts:25` (same constants, `normalizeImageToStandardCanvas` stretches + hardcodes searchRegion `{x:350, y:220, width:350, height:180}`) | Every image stretched to 960x540 on load, aspect destroyed |
| C — Simulation | 512x288 | `src/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/carrier-tape-assets.ts:38-39` (`CARRIER_TAPE_WIDTH/HEIGHT`); all pocket/chip coordinates in `CarrierTapeSimulationCanvas.tsx` live here | Prebuilt frames rendered at 512x288 |
| D — Raw camera | Native sensor pixels | `BE/app/domain/vision_eval.py:39` (`_clip_to_roi` slices raw pixels with whatever numbers it is given); `BE/routes/score.py:191-200` expands the ROI by 20px in that same unconverted space | No conversion; raw numpy slice |

Notes on the as-built code that the fix must address:

- `src/lib/editor/coords.ts` `imageToScreen`/`screenToImage` carry a DPR factor
  that is dead code (`dpr > 0 ? 1 : 1`). DPR applies to the canvas backing
  store only (35-zoom-and-pan §7); it must never enter the coordinate math.
- `usePatternMatchingRule.ts` `normalizeImageToStandardCanvas` discards the
  original dimensions (`origW`/`origH` are parameters, never recorded) and
  invents a hardcoded search region. Both behaviours are forbidden by §2.
- `CarrierTapeSimulationCanvas.tsx` renders a 512 backing store under a CSS
  width of `min(100%, 690px)`. Display scaling is fine; feeding a sim-space
  coordinate into a rule-space evaluation is not (see §6).
- `BE/app/domain/vision_eval.py` `_clip_to_roi` performs a raw numpy slice
  with no clamping and no scaling. An out-of-bounds ROI silently yields a
  short or empty slice instead of an error or a clamp.

---

## 4. Conversion contract

### 4.1 Normalize once, record the transform

Image load performs exactly one normalization step and records it:

1. Load the source image at native resolution; record `sourceWidth` and
   `sourceHeight`.
2. If a working space is needed (evaluation buffer, display canvas), compute
   the transform from canonical space to that working space and store it
   alongside the image: `scaleX`, `scaleY`, and whether aspect was preserved.
3. Aspect-preserving fit only. If the working space has a different aspect
   ratio than the source, the image is letterboxed (fit inside, centred) or
   the working space is resized to the source aspect — never stretched.
4. Every region, box, and score produced from that image is mapped back to
   canonical space through the recorded transform before it is stored,
   displayed as a coordinate, or compared against a threshold.

### 4.2 One helper set, used by all four spaces

The shared domain conversion module provides, at minimum:

- `toCanonical(point | rect, transform)` — working space to canonical space.
- `fromCanonical(point | rect, transform)` — canonical space to working space.
- `pointerToCanonical(pointerEvent, viewState)` — the inverse `ImageToScreen`
  transform; the ONLY function allowed to translate pointer events into image
  space (35-zoom-and-pan §2).
- `clampToImage(rect, imageWidth, imageHeight)` — clamps a region to image
  bounds; out-of-bounds input is clamped, never silently sliced short, and a
  fully-out-of-bounds region is an error, not an empty result.
- `scaleRegion(rect, fromTransform, toTransform)` — the single path for
  migrating a stored region between spaces (see §4.4).

No other file may compute a scale factor inline. Existing inline scalings
(`width/100`, `height/100` constellation scaling in
`src/components/vision/standard/tools/pattern-matching/atmel-chip-boxes.ts`,
the 1.33x editor/pattern mismatch, the sim display mapping) migrate to these
helpers or are deleted.

### 4.3 Display transforms never feed geometry

- Canvas CSS size, backing-store size, and DPR are display properties. They
  change rendering only.
- `canvasPointFromEvent` scaling (CSS to backing store) is correct where it
  exists (`src/components/vision/white-box/pattern-geometry.ts`) and is kept;
  it is a display mapping, not a coordinate conversion, and its output must
  still pass through `pointerToCanonical` before becoming geometry.
- A region dragged at 40% zoom saves the same image-space result as a region
  dragged at 100% zoom (32-shape-model §3). Any test that shows otherwise is
  a failure of this contract.

### 4.4 Migration of already-persisted regions

Regions persisted before this contract carry no recorded source dimensions in
most cases. Migration rule:

- A stored region with a recorded `ImageWidth`/`ImageHeight` is converted with
  `scaleRegion` from its recorded space to canonical space on first load, and
  re-persisted in canonical space.
- A stored region with no recorded dimensions is treated as Space B (960x540)
  — the space the pattern tools actually wrote — and converted on first load
  using the current image's recorded dimensions. The conversion is logged, so
  an operator can see which regions were migrated.
- Migration never silently reinterprets a region: if the recorded space is
  unknown AND the image dimensions are unknown, the region is flagged for
  operator review instead of being evaluated at a guessed position.
- The simulation's local state is not migrated (see §6); it is sim-local and
  is regenerated from its own frames.

---

## 5. Zoom/pan purity

Restated from `02-spec/21-app/35-zoom-and-pan.md` because every pattern-search
canvas must honour it, and the current pattern canvases do not all do so:

- Zoom and pan are pure view transforms. They change `ImageToScreen` only;
  they never change `Region.geometryJson`.
- `ImageToScreen(p) = (p - Pan) * (ZoomPercent / 100)`. Its inverse is the
  ONLY function allowed to translate pointer events into image space.
- View state (`ZoomPercent` 5–800 with snap steps `5, 10, 25, 40, 50, 75, 100,
  150, 200, 300, 400, 600, 800`; `PanX`/`PanY` in image-space pixels of the
  top-left visible corner; `FitMode` `FIT` | `ONE_HUNDRED` | `FREE`) is
  in-memory only and is never persisted.
- Layout stability is non-negotiable: the viewport is a fixed rectangle;
  zoom/pan must not change the pixel size of the viewport, the Regions panel,
  the Rule Builder panel, the tool ribbon, or the action bar. Overflow is
  clipped; scrollbars are not rendered (pan replaces scrollbars). Reflowing
  sibling panels on zoom is a bug — file `E_UI_LAYOUT_REFLOW`.
- Pan is clamped so at least 32 image-space pixels of the image remain visible
  on every side.
- Fit-to-viewport must not trigger a region bounds validation error:
  validation runs against image-space geometry, which zoom cannot change.
- Switching fit modes recomputes `Pan` synchronously in the same frame; no
  animated tween may leave geometry hit-testing stale.
- Rendering the image, ROIs, and handles happens in one composited pass per
  frame; partial repaints are forbidden (they cause handle-lag bugs at low
  zoom).
- High-DPI: device pixel ratio applies to the canvas backing store only;
  `ImageToScreen` continues to work in CSS pixels. Nearest-neighbour sampling
  at `ZoomPercent >= 400`; bilinear below.
- Wheel zoom is cursor-anchored and delta-normalised; trackpad pinch (`wheel`
  with `ctrlKey`) is handled by the same listener; the wheel listener is
  non-passive so the page never scrolls behind the canvas.

The pattern-search spec §5 interaction rules still apply on top of this:
click selects + shows handles, drag body moves, drag handle resizes, geometry
clamped to image bounds, move/resize updates shared settings live (throttled
to animation frames) with bidirectional sync to numeric fields, keyboard
arrows nudge 1px (Shift+arrow 10px), `Esc` deselects, `Delete` clears a mask
layer — and the same drag/resize engine is shared with the Modern UI. No
second drag/resize engine may be written for Standard.

---

## 6. Simulation isolation

- Space C (512x288) is documented as **sim-local**. Simulation pocket, chip,
  and overlay coordinates are meaningful only inside the simulation canvas.
- The simulation must never write to real rule state: no sim-space coordinate,
  threshold, or score may flow into `PatternSearchSettings`, a persisted
  region, or a persisted score. The simulation tool's local `treeRules` state
  stays local.
- If a simulation result is ever surfaced next to a real result, it must be
  labelled as simulated and its coordinates must be converted through §4.2
  helpers (with the sim transform recorded) — never copied raw.
- The simulation display mapping (512 backing store under CSS
  `min(100%, 690px)`) uses the same `ImageToScreen` discipline as §5: display
  scaling only, never a geometry input.
- The conveyor simulation path (`useConveyorSimulation.ts`,
  `conveyor-simulation-drawing.ts`) is subject to the same isolation rule; it
  must not share mutable state with the pattern-matching rule hook.

---

## 7. Backend ROI intake

The backend is Space D (raw camera pixels). Its intake contract:

1. **Accept the geometry payload, in canonical space.** The score endpoint
   accepts the `geometryJson` envelope (preferred) and, during migration, a
   flat `{x, y, width, height}` payload. Flat input is dual-parsed, converted
   to the envelope form, and the conversion is logged. Flat-only intake
   (`BE/routes/score.py` `_parse_roi`) is a migration shim, not the contract.
2. **Clamp to image bounds before slicing.** `_clip_to_roi` must clamp the ROI
   to the actual image dimensions and return an error (not a short or empty
   slice) for a fully-out-of-bounds ROI. Raw numpy slicing of unclamped,
   unconverted numbers is forbidden.
3. **Convert to sample space using the recorded transform.** The backend
   receives the canonical geometry plus the image dimensions it was drawn
   against. If the sample image has different dimensions (downsampled,
   different camera, different frame), the backend scales the ROI through the
   recorded transform before slicing. Coordinate conversion applies identically
   to the sample and the reference; any asymmetry in *image treatment*
   (downsampling, optical adjustment applied to one image but not the other)
   is a file 02 concern and must not be smuggled into the coordinate path.
4. **Search-window expansion happens in sample space, after conversion.**
   The pattern-match branch's ROI ±20px search window
   (`BE/routes/score.py`) is computed after the ROI has been converted to
   sample space, and the expanded window is itself clamped to the sample
   bounds.
5. **No second coordinate model.** The backend must not maintain its own
   scaling convention alongside the frontend's. The shared conversion contract
   (§4) is the single definition; backend code calls it (or a faithful port
   of it, with identical arithmetic) and nothing else.

Note on current state: the backend score endpoint has no frontend caller —
live evaluation is frontend-only. This contract therefore governs the
endpoint as it exists and any future caller; it does not require wiring a
caller in this task.

---

## 8. What this file deliberately does not decide

- **Square ROI.** No prior spec or plan requires square regions
  (pattern-search spec §5 requires clamping + minimum size, not squareness;
  the shape model allows independent Width/Height). Whether search regions,
  pattern regions, masks, or all three must be square — and whether squareness
  is enforced at draw, resize, or validation time — is a new requirement
  decided in file 03. This file must not be read as endorsing or forbidding
  it.
- **Threshold, luminance, and grayscale conversion semantics.** File 02 owns
  the luma formula, the threshold key, the threshold preview semantics, and
  sample/reference treatment symmetry. This file only requires that whatever
  file 02 decides is applied in canonical space, identically to both images.
- **Matcher search behaviour** (translation search, sliding window, offset
  recovery) and **dispatcher routing** (name-substring matching, the
  `greyscle` typo, the `luminance` diversion). Those belong to the
  matcher/data-model spec. This file only requires that the matcher, once it
  searches, searches in canonical space.
- **ROI colour mapping.** Four sources assign different colours to
  search/pattern/mask regions (parent spec §5: yellow/blue/green; folder 26
  idiom A: emerald/rose; idiom C: yellow/blue; 21-app/32 ground truth: blue
  reference, green search, red/pink pattern). The component spec picks one
  mapping for the pattern-search screen and states what it supersedes.
  Coordinates are colour-blind; this file takes no position.
- **Layer-ordering convention.** The editor layer stack defines index 0 =
  bottom; the parent spec §8 defines mask slots with index 0 on top. Each
  convention governs its own surface; a fix touching both must state which
  governs where. This file does not merge them.
- **Shell choice (AI-01).** Window chrome and browser-opening behaviour depend
  on a shell-runtime decision (Python+CEF vs Tauri vs Electron) that is still
  recorded as unresolved in `02-spec/22-app-issues/01-vision-inspection-ambiguities.md`.
  This file assumes nothing about the shell.

---

## 9. Acceptance criteria

1. A region drawn in the editor (Space A) evaluates at the same image pixels
   in the pattern tools (Space B) and in the backend (Space D), within integer
   rounding (±1px). Demonstrate with a recorded region on a non-16:9 image.
2. Loading a non-16:9 image produces no aspect distortion on the evaluation
   path: a circle in the source is a circle in the evaluation buffer, and a
   square region stays square in canonical space.
3. No file outside the shared domain conversion module computes a scale
   factor inline. A search for hand-rolled scalings in the pattern, editor,
   simulation, and backend ROI paths returns zero hits.
4. A shape dragged at 40% zoom saves the same image-space result as the same
   shape dragged at 100% zoom. Automated test, not a manual claim.
5. Zoom/pan/fit never mutate persisted geometry, never reflow sibling panels
   (no `E_UI_LAYOUT_REFLOW`), and never trigger a bounds validation error on
   fit-to-viewport.
6. An out-of-bounds ROI sent to the backend returns an error, not a short or
   empty slice; an in-bounds ROI on a differently-sized sample is converted
   before slicing.
7. Simulation edits (regions, thresholds, scores) never appear in persisted
   rule state. Test: run the simulation, change its settings, reload the rule
   — rule state is unchanged.
8. Modern UI is unchanged: same routes, components, and behaviour; the mode
   switch preserves in-progress state in both directions with no data loss.
9. No option list, enum, default, validation rule, or persistence path is
   duplicated between UIs. The add-one-shape-appears-everywhere test from the
   parent spec §11 still passes.
10. Migrated regions are logged and reviewable: every region converted under
    §4.4 produces a log entry naming the region, the source space, and the
    target space.

---

## 10. Verification checklist

Run in order; each box must be checked with evidence (command output, test
result, or screenshot), not by inspection alone.

- [ ] **V1 — Space inventory.** Every consumer of `IMAGE_BOUNDS`,
  `STANDARD_CANVAS_WIDTH/HEIGHT`, and `CARRIER_TAPE_WIDTH/HEIGHT` is listed;
  each is assigned to canonical space, a working space with a recorded
  transform, or sim-local. No consumer is unassigned.
- [ ] **V2 — Round-trip.** A region drawn in Space A, converted to Space B,
  converted back to Space A, equals the original within ±1px (integer
  rounding). Test on 16:9 and non-16:9 images.
- [ ] **V3 — Zoom invariance.** Drag/resize at 40%, 100%, and 200% zoom;
  persisted geometry is identical in all three cases.
- [ ] **V4 — Non-16:9 fidelity.** Load a portrait and a non-16:9 landscape
  image; verify no stretch on the evaluation path (circle stays circle) and
  the `Res Mismatch` warning no longer fires for a correctly converted ROI.
- [ ] **V5 — Screenshot regression.** Reproduce the operator screenshots: a
  930x174 calibrated ROI on a 392x373 image no longer draws outside the
  image, and pattern boxes no longer spill into black canvas.
- [ ] **V6 — Backend clamp.** Send an out-of-bounds ROI to the score endpoint;
  expect an error. Send an in-bounds ROI against a differently-sized sample;
  expect conversion before slicing (verified by the returned crop dimensions).
- [ ] **V7 — Simulation isolation.** Change simulation settings and regions;
  reload the rule; rule state is byte-identical to before.
- [ ] **V8 — No inline scalings.** Search the pattern, editor, simulation,
  and backend ROI paths for hand-rolled scale arithmetic; zero hits outside
  the shared conversion module.
- [ ] **V9 — Modern untouched.** Run the existing Modern UI test suite for the
  rule editor; no new failures. Mode-switch in both directions mid-edit;
  state survives with no loss.
- [ ] **V10 — Migration log.** Load a rule with pre-contract regions; the
  migration log names each region, its source space, and its target space;
  no region is silently reinterpreted.
- [ ] **V11 — Layout stability.** Zoom and pan on the pattern-search screen;
  viewport, Regions panel, Rule Builder panel, tool ribbon, and action-bar
  pixel sizes are unchanged; no `E_UI_LAYOUT_REFLOW`.
- [ ] **V12 — Single composited pass.** Render image, ROIs, and handles in one
  pass per frame; no partial-repaint handle lag at low zoom (manual check at
  25% zoom with a large region set).
- [ ] **V13 — DPR neutrality.** Run at DPR 1 and DPR 2; persisted geometry is
  identical; only the canvas backing store changes.
