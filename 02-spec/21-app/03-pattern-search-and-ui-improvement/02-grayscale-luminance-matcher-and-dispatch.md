# 02 — Grayscale, luminance, matcher, and dispatch

Spec for pattern search and UI improvement, part 2 of 3.
Companion files: `01-coordinates-regions-layers-and-roi.md`
(coordinate unification, region geometry, layers, square ROI, toolbars),
`03-run-install-window-and-version.md`
(run pipeline, installation, window chrome, version display, menu performance).
Parent plan: `.ai-memory/plans/pending/03-pattern-search-and-ui-improvement.md`.

This file covers RC2 (grayscale / luminance) and RC3 (matcher, data model,
dispatch) from the Research 01 report. It does **not** cover coordinate
spaces (RC1, companion file 01) except where a grayscale or matcher fix
touches a coordinate intake.

## 0. Governing invariants (do not contradict)

In priority order, this file is subordinate to:

1. `.ai-memory/plans/completed/01-pattern-search-spec.md`, §0 rules and
   §11 acceptance criteria — the controlling document for this screen:
   - Do not modify or degrade the Modern UI. Standard UI is an
     *additional* presentation of the same data and same domain logic.
   - DRY is the highest priority: every option list, enum, default,
     validation rule, and persistence path is defined **once** in shared
     domain code and consumed by both UIs. Duplicating an option array
     into a "standard" copy is a failed implementation.
   - A UI-mode switch is used in every case; only *presentation*
     branches — state, validation, persistence, computation do not.
   - Do not invent semantics for the unknowns (§12 of that spec, carried
     forward verbatim in §8 below) — render them exactly as shown, wire
     to state, raise the open question, never guess a formula or unit.
   - Everything on screen must exist, in the same relative position,
     even when its handler is a documented TODO.
   - Exactly 4 fixed mask slots in Standard (index 0 on top), unlimited
     in Modern, both reading and writing the same `masks: MaskLayer[]`
     array. A Modern-authored case with more than 4 masks opened in
     Standard shows the first four plus a non-destructive notice that
     additional layers exist and are still applied — never silently
     drop them.
   - Geometry is stored in image pixel coordinates, never screen
     coordinates, converted through the current zoom/pan transform.
   - All colours are semantic tokens; no hardcoded colour utilities in
     components.
2. `02-spec/21-app/32-shape-model.md` — the shape model is the single
   geometry source of truth; image-space integer coordinates only, never
   CSS pixels, zoom, pan, or device-pixel ratio; zoom/pan/fit never
   mutate geometry; v1 kinds RECTANGLE / ELLIPSE / POLYGON; FREEFORM is
   NOT a persisted v1 kind.
3. `02-spec/21-app/62-rule-mask-image.md` — the only documented
   grayscale/luminance contract for ROI masking: `maskImageUrl`,
   `maskThreshold` (0–255, default 128), `maskInvert` (default false);
   luminance is BT.601; fully-transparent source pixels (alpha 0) are
   always "outside" regardless of threshold; the worker rescales the
   mask to the rule's rectangle, applies threshold + invert, intersects
   with the rectangle, and every acceptance check then operates on
   intersected pixels only.

No file in this folder may cite a "Yasi and George release" as a source.
No repo record of such a release exists (see §8, open question O-10).

---

## 1. The three grayscales — name which one before fixing

This repo contains three distinct things called "grayscale". Every
defect report, fix, and test must name which one it targets. Conflating
them is itself a defect class.

| # | Grayscale | Definition | Status |
|---|-----------|------------|--------|
| G1 | Standard UI theme grayscale | Standard Mode forces hue 0 (pure grayscale) via `--std-*` tokens (`02-spec/26-design-system-reverse-engineered/01-color-system.md` §1.6) | **By design, not a bug.** Do not "fix" it. |
| G2 | Rule-mask luminance threshold | BT.601, `maskThreshold` 0–255 default 128, `maskInvert`, alpha-0 always outside, per `02-spec/21-app/62-rule-mask-image.md` | Specified. This file does not change it; it only requires that mask-path code use the shared luma function (§2). |
| G3 | Pattern-match image conversion | How a pattern template and a sample image are converted to gray for comparison, whether they are thresholded, and how "luminance features" are computed | **Unspecified today.** This file pins the formula (§2–§4). |

**Open question O-1 (do not guess):** the user report "grayscale does
not convert colours properly / luminance features do not work" does not
say which path is broken. Before any fix ships, run the diagnostic in
§7 and record which of G1 / G2 / G3 the failure belongs to. A fix that
targets the wrong grayscale repeats the root cause.

A fourth, related trap: the dispatcher routes any tool name containing
"luminance" to `StandardIntensityTool` (step 12), not to pattern
matching. If an operator names a pattern tool with "luminance" in it,
it will never reach the pattern matcher. That diversion is fixed by §6,
not by touching the matcher.

---

## 2. RC2 — One luma function (G3 pinned)

### 2.1 The formula

The single luminance function for the whole repo, frontend and backend:

```
L = 0.299 * R + 0.587 * G + 0.114 * B        (BT.601)
```

Input is RGBA (frontend canvas) or RGB/BGR (backend, see §2.2). Output
is a single-channel value on the same 0–255 scale as the input. This is
the formula already used consistently on the frontend
(`src/lib/vision/white-box-marking.ts`, `carrier-tape-evaluator.ts`,
`atmel-chip-boxes.ts`, `Pin1Canvas.tsx`) and the formula already
specified for the mask path (G2). The bug is not the formula; it is
that each path applies it to a different image, in a different space,
under a different threshold. This file fixes the application, not the
coefficients.

### 2.2 Backend fix: the numpy fallback swaps red and blue

`BE/app/domain/vision_eval.py`, `_to_grayscale`:

- The cv2 path (`COLOR_BGR2GRAY`) is correct for BGR images.
- The numpy fallback computes `0.299 * ch0 + 0.587 * ch1 + 0.114 * ch2`,
  treating channel 0 as red. For OpenCV BGR images channel 0 is **blue**,
  so the fallback swaps the red and blue weights. Same function name,
  different grayscale numbers depending on whether cv2 is installed —
  which is exactly the shape of "grayscale does not convert colours
  properly" when it reproduces on one machine and not another.

**Required fix:** the numpy fallback must index channels as BGR
(`0.299 * ch2 + 0.587 * ch1 + 0.114 * ch0`) or, preferably, convert to
RGB once at the intake boundary and share one implementation. The two
paths must be proven equal by a unit test that feeds the same image
through both and asserts identical output (see §9).

### 2.3 Frontend fix: the threshold preview is half-binarized

`src/lib/vision/white-box-marking.ts`, `toThresholdPreviewRgba`:

- Current behaviour: pixels at or above the threshold become 255, but
  pixels below the threshold **keep their original gray value**. That is
  a half-binarization, not the binary image the matcher and the operator
  expect.
- Required behaviour: a true binary threshold. Pixels at or above the
  threshold become 255; pixels below become 0. The preview must show
  exactly what the matcher measures — a preview that disagrees with the
  matcher is worse than no preview.

This is distinct from `toTwoBitGray` (same file), which quantizes to
four levels [0, 85, 170, 255] at breaks [64, 128, 192], and from backend
`cv2.threshold BINARY`. After this fix there are exactly two image
conversions in the pattern path, both named and both shared:

1. **Continuous gray** — `toContinuousGray`, BT.601, no threshold.
   Used wherever a mean luma is measured.
2. **Binary threshold** — one threshold, one semantic (§3), pixels
   either 0 or 255. Used for the preview and for any binary comparison.

`toTwoBitGray` survives only if a caller is documented as needing
four-level quantization; otherwise it is deleted, not left as a third
semantic for the same slider.

---

## 3. RC2 — One threshold

### 3.1 The current mess (as found)

Threshold is resolved from at least five disagreeing sources:

- A 6-key resolution chain in
  `src/components/vision/standard/tools/pattern-matching/usePatternMatchingRule.ts`,
  defaulting to 170.
- `settings.threshold ?? 170` in
  `src/components/vision/white-box/useWhiteBoxMarking.ts`.
- `greyscaleLevel` 170 in the carrier-tape simulation
  (`useCarrierTapeSimulation.ts`, `carrier-tape-evaluator.ts`).
- `thresholdLuma` 35 in pin-one
  (`src/components/vision/standard/tools/pin1-config/usePin1Rule.ts`).
- `toleranceLuma` hardcoded to 22 at **every** 24-box matcher call site
  (`atmel-chip-boxes.ts`, `evaluateChipPixelsReal`).
- Backend `tolerance` default 40 in `BE/routes/score.py`.

No single source of truth exists. Two operators with the same slider
value can get different results depending on which tool routed them.

### 3.2 The single setting

Introduce one named setting in the shared domain module
(`src/domain/vision/pattern-search.ts`, inside `PatternSearchSettings`):

```
detection.greyscaleThreshold   // 0–255, default 170
detection.lumaTolerance        // 0–255, default 22
```

- `greyscaleThreshold` is the binary threshold from §2.3. It replaces
  the 6-key chain, the `settings.threshold ?? 170` fallback, and the
  simulation's `greyscaleLevel` 170. All three resolve to this one key.
- `lumaTolerance` is the per-box mean-luma deviation allowed before a
  box counts as failed. It replaces the hardcoded 22 at every matcher
  call site. It becomes a real, operator-visible setting, not a constant
  buried in code.
- `thresholdLuma` 35 (pin-one) is **not** folded into
  `greyscaleThreshold`. Pin-one hole detection and pattern matching are
  different measurements with different operating points; folding them
  into one key would break both. Instead, pin-one keeps its own key,
  renamed for clarity to `pin1.thresholdLuma`, documented as a
  pin-one-only setting, and resolved from the same shared settings
  object (see §5). One settings object, two named thresholds, each with
  one owner.
- Backend `tolerance` default 40 in `BE/routes/score.py` is replaced by
  the same two keys, read from the request / rule settings, never from
  a local default. A backend default that disagrees with the frontend
  default is a bug, not a fallback.

### 3.3 Migration rule

- Existing saved rules that carry any of the old keys (`threshold`,
  `greyscaleLevel`, `tolerance`, `toleranceLuma`) are migrated once, at
  load, into `detection.greyscaleThreshold` / `detection.lumaTolerance`
  by the intake parser (see §4). The old keys are then dropped from the
  saved payload on the next write.
- If a rule carries more than one old key with conflicting values, the
  migration keeps the value from the tool that actually evaluated the
  rule last (pattern tool > simulation tool > backend default), and
  logs the conflict. It never silently averages them.
- After migration, no code path may read an old key. A search for the
  old key names in `src/` and `BE/` after the fix must return zero
  production hits (tests may reference them in migration tests only).

---

## 4. RC2 — Sample / reference symmetry (backend)

`BE/routes/score.py` currently applies `maybe_downsample` (12 MP
threshold) and `apply_optical_settings` (luminance multiplier from
exposure / gain / light / strobe, gamma LUT, white balance, from
`BE/app/domain/vision_preprocess.py`) to the **sample only**. The
reference gets neither.

Consequences, both observed-class:

1. Even a perfect sample scores a systematic luminance offset, because
   it is compared against an unadjusted reference.
2. For samples above 12 MP, the sample is downsampled but the ROI
   coordinates are not rescaled, so the ROI no longer addresses the
   pixels it names.

**Required rule:** the sample and the reference receive the **same**
treatment — either both are downsampled and optically adjusted, or
neither is. The choice is recorded on the rule, not re-decided per
request. If downsampling is applied, ROI coordinates are rescaled by
the same factor as the image, in the same function, before any
evaluation — never in a later step that can be skipped. If the ROI
cannot be rescaled (e.g. the downsample factor is unknown), evaluation
fails with an explicit error instead of silently scoring the wrong
pixels.

This is a backend-only fix today: the backend score endpoint has **no
frontend caller** — live evaluation is frontend-only. The fix still
ships, because the endpoint is the documented evaluation contract and
the next frontend caller will inherit the asymmetry if it is left in
place. The fix must land with a test that evaluates the same image as
both sample and reference and asserts a perfect score.

---

## 5. RC3 — One region representation

### 5.1 The fragmentation (as found)

One concept — "the region" — currently has five representations:

1. Domain `{shape, geometry}` (`src/domain/vision/pattern-search.ts`).
2. Flat `{x, y, w, h}` (pattern hooks).
3. `searchRegionJson` string
   (`usePatternMatchingRule.ts`, `handleSearchRegionChange`).
4. `referenceBoxes` / `constellation` arrays
   (`StandardGreyscalePatternMatchingTool.tsx`, `handleApply`).
5. `maskRegions` vs domain `masks` — `useWhiteBoxMarking.ts` reads
   **only** `maskRegions`, so domain `masks` are silently dropped.

Worse, `usePatternMatchingRule` writes back a flat `searchRegion`,
clobbering `.shape` / `.geometry` — after it runs,
`settings.searchRegion.geometry` is undefined, and any consumer that
reads the domain shape (e.g. `StandardCanvas`) sees a region with no
geometry.

### 5.2 The canonical form

The canonical representation is the domain form from
`src/domain/vision/pattern-search.ts`:

```
searchRegion: { shape, geometry }
patternRegion: { shape, geometry }
masks: MaskLayer[]          // Standard: exactly 4 slots, index 0 on top
```

- Dual-parsing (accepting geometry-wrapped OR flat input) is allowed
  **only at the intake boundary** — the single parser that loads a
  saved rule or an incoming request. Everywhere else, code reads and
  writes the domain form. A component that dual-parses internally is
  re-introducing the fragmentation.
- The `maskRegions`-only read in `useWhiteBoxMarking.ts` is a **bug to
  fix, not a pattern to extend**: masks are read from the domain
  `masks` array, and `maskRegions` is either migrated into it at intake
  or deleted. After the fix, a mask set in the domain must survive a
  round trip through the white-box tool unchanged.
- `searchRegionJson` is deleted as a stored form. If a JSON string is
  needed at a transport boundary, it is `JSON.stringify` of the domain
  form at that boundary, parsed back by the intake parser — never a
  second, parallel representation with its own write path.
- `referenceBoxes` / `constellation` are **derived** data, not stored
  region state. They are computed from the pattern region and the
  reference image by `computePatternGeometry` and cached, never edited
  directly. Editing a box edits the pattern region; the boxes follow.

### 5.3 Mask-slot discipline (restated, because this file touches masks)

Standard shows exactly 4 mask slots, fixed, never more, never fewer;
index 0 is on top; empty slots still render showing `None`. Modern
shows unlimited layers with add / remove / reorder. Both read and
write the same `masks` array. A Modern-authored case with more than 4
masks opened in Standard shows the first four plus a non-destructive
notice that additional layers exist and are still applied. This is
§0 rule 1, restated here because the mask-read bug in §5.2 is exactly
how layers get silently dropped today.

Note the ordering conflict this file does **not** resolve by fiat:
the editor layer stack defines index 0 = bottom
(`02-spec/24-app-ui-design-system/04-rule-layers.md`), while pattern
mask slots define index 0 = top (01-pattern-search-spec §8). Each rule
governs its own surface. A "move layers" fix must state which surface
it touches and must not silently re-order the other one. (See
companion file 01 for the layer-UX work.)

---

## 6. RC3 — A matcher that actually searches

### 6.1 The current matcher does not search

`src/components/vision/standard/tools/pattern-matching/atmel-chip-boxes.ts`,
`evaluateChipPixelsReal` (line 168):

- It measures mean luma of each of the 24 boxes **only at their
  expected positions** — `matchedX = boxX`, `offsetX / offsetY`
  hardcoded to 0.
- There is no translation search, no sliding window, no offset
  recovery. A chip shifted by a few pixels fails all 24 boxes.
- Non-square regions additionally distort the constellation, because
  `scaleX = width / 100` and `scaleY = height / 100` differ. (Square
  enforcement is companion file 01; this file requires only that the
  matcher not silently distort when the region is not square — it must
  either use a uniform scale or report the distortion.)
- `toleranceLuma` is hardcoded to 22 at every call site, so the
  operator cannot tune it, and `minMatchPercent` does not come from
  settings in this path.

Score today is `matched / 24` against `minMatchPercent`. That formula
survives; what changes is **where** the boxes are measured.

### 6.2 Required matcher behaviour

1. **Translation search.** Before scoring, the matcher recovers the
   best offset of the constellation within the search region, over a
   bounded window derived from the search margin setting (see §6.3).
   Minimum viable implementation: coarse-to-fine translation search
   over integer-pixel offsets within ±`searchMarginPx`, scoring each
   candidate by matched-box count, keeping the best. The search window
   and step are settings, not constants.
2. **One score, one threshold.** Each candidate offset is scored by
   mean luma per box against the golden lumas, with per-box pass/fail
   decided by `detection.lumaTolerance` (§3.2). The reported score is
   the best offset's `matched / total`, compared against
   `detection.minMatchPercent` from settings (default 40, per the
   01-pattern-search-spec). The best offset itself is reported as a
   result field (offset X/Y in image pixels), so an operator can see
   *where* the pattern was found, not just *whether* it passed.
3. **No distortion by stealth.** If the pattern region is not square,
   the matcher uses a single uniform scale for the constellation
   (documented choice: the smaller of scaleX / scaleY, centred in the
   region) and records that choice in the result. It never applies
   different X and Y scales to the same constellation without saying so.
4. **The 24-box / 31-box lie is resolved.** `ATMEL_31_BOX_DEFINITIONS`
   is currently an alias of `ATMEL_24_BOX_DEFINITIONS` — there is no
   real 31-box data. Either real 31-box definitions are supplied and
   tested, or the "31 box" dispatcher keyword and any UI label promising
   31 boxes are removed. Promising data that does not exist is a defect,
   not a TODO.
5. **One convention for the box table.** `evaluateChipPixelsReal`
   scales `relX / relY` as percentages of the region, while
   `buildAccuratePatternMatchResult` (conveyor simulation only) adds
   the same fields as raw pixels. After this fix there is one
   convention: percentages of the pattern region, scaled once, in one
   function, consumed by both the live matcher and the simulation.
   The conveyor-simulation-only raw-pixel path is deleted or migrated
   to the shared function.

### 6.3 Search margin and angle (settings, not constants)

- `searchMarginPx` (default 8, per the observed tool parameters) bounds
  the translation search window in §6.2. It is a setting, shown in the
  tool panel, persisted with the rule.
- `angleRangeDeg` (default 30, per the 01-pattern-search-spec) bounds
  any rotation search. Rotation search is **not** required by this
  file — the current matcher does no rotation search, and inventing a
  rotation model would violate §0 rule 4. What is required: the setting
  is wired to state, displayed, persisted, and either honoured by a
  documented rotation step or explicitly recorded as not-yet-implemented
  with a TODO handler. It must not be silently ignored while the UI
  implies it works.

---

## 7. RC3 — Deterministic dispatch

### 7.1 The current dispatch (as found)

`src/components/vision/standard/tools/StandardInspectionToolDispatcher.tsx`
routes a rule to a tool by substring-matching a lowercased string built
from `toolType || ruleName || settings.toolType || settings.type`,
through a 15-step name-sniffing chain. Consequences, all observed-class:

- Simulation is checked **before** pattern. `isGreyscaleSimulation`
  matches "greyscle simulation" (literal typo, in the code),
  "greyscale simulation", "carrier tape", "carrier-tape", toolType
  "Greyscle simulation", or type "greyscale_simulation", and returns
  `StandardGreyscaleSimulationTool`. Only then does `isGreyscalePattern`
  match "pattern match", "greyscale pattern", "grayscale pattern",
  "white box", "24 box", "31 box", "2-bit", "light pattern", type
  `pattern_match`, or a `constellation` flag.
- Any tool whose name contains "carrier tape" or "simulation" will
  **never** reach the pattern-search component, even if it is a pattern
  tool. Any pattern tool whose name also matches an earlier step is
  silently diverted.
- The simulation tool's own built-in rule is named "Greyscale Pattern
  Match 24-Box" — it contains "greyscale pattern" but not "carrier
  tape", so its routing depends on which name field happens to be
  populated. One rule can route to different tools depending on which
  name field is filled. This is the single most concrete mechanism
  consistent with "initially it worked, but after adding the
  simulation, it does not" and "pattern search goes in different ways".
- Later steps divert further: "luminance" routes to
  `StandardIntensityTool` (step 12); gray/grey + blob/particle routes
  to `StandardGrayscaleBlobTool`; plain blob/particle/count routes to
  `StandardBlobTool`; the default (step 15) returns
  `StandardPatternSearch`.
- Spelling split: the codebase uses both "greyscale" and "grayscale".
  The dispatcher compensates by matching both spellings in most steps —
  but any new code that matches only one spelling silently misses the
  other.

### 7.2 Required dispatch

1. **Explicit type field, no name sniffing.** Every rule carries an
   explicit `toolType` (enum, defined once in the shared domain module).
   The dispatcher switches on that field. Name-based routing is
   deleted. A rule with a missing or unknown `toolType` renders an
   explicit "unknown tool type" state with the rule's type shown — it
   never falls through to a guessed tool.
2. **Fix the typo, then delete the predicate.** The literal
   "greyscle simulation" is fixed in the same commit that replaces
   name-sniffing, so no commit in history re-introduces it. The typo
   fix alone, without replacing the chain, is not an acceptable fix.
3. **Simulation is checked on explicit type, never by name substring.**
   A simulation rule and a pattern rule are distinguishable by their
   `toolType` even if their display names are identical. The simulation
   tool's built-in rules get explicit simulation types; the pattern
   tool's rules get explicit pattern types.
4. **One spelling for new identifiers.** New identifiers use
   "greyscale" (matching the pattern tool family:
   `StandardGreyscalePatternMatchingTool`,
   `StandardGreyscaleSimulationTool`). Routing predicates that must
   accept legacy data accept both spellings, in one shared helper, not
   by duplicating match lists per step.
5. **Migration.** Existing saved rules without an explicit `toolType`
   are classified once, at load, by a documented, tested migration
   function that maps the old name-sniffing outcome to a `toolType`.
   The migration is logged per rule. After migration, no production
   code path performs substring routing. A search for the old
   name-sniffing predicates in the dispatcher must return zero hits
   outside the migration function and its tests.

### 7.3 Simulation state isolation

`StandardGreyscaleSimulationTool` currently initialises its own hook
state (`useCarrierTapeSimulation` with `initialMarginTolerancePx: 8`,
`initialAngleToleranceDeg: 1.0`, `initialMinMatchPercent: 80`,
`initialGreyscaleLevel: 170`) and renders its own local rules
(`rule-pin1`, `rule-pattern`). Its min-match default (80) and greyscale
level (170) do **not** match the shared `PatternSearchSettings`
defaults (minMatchPercent 40, no greyscale level at all).

- Simulation settings live in simulation-local state and are labelled
  as simulation settings in the UI. They never write to real rule
  state, and real rule settings never flow into the simulation except
  through an explicit "import from rule" action the operator invokes.
- If the simulation screen is where operators currently configure
  matching, that workflow is broken by design (DRY violation, §0 rule
  2) and must be replaced by the explicit import action, not by syncing
  the two states silently.
- Simulation coordinate space is sim-local (512×288, companion file
  01). Simulation results are never written back as pattern-search
  results.

---

## 8. RC3 — Backend tape logic confined to tape paths

`BE/app/domain/vision_eval.py`, `evaluate_grayscale_tolerance`, embeds
tape-strip logic in a generic evaluator: aspect-ratio-derived pocket
slicing (`k_pockets = round(smp_ar / ref_ar)`) plus `phaseCorrelate`
shifts up to ±25px. On non-tape images it slices arbitrarily and shifts
the comparison window — literally "search goes in different
directions".

**Required fix:** the pocket-slicing and phaseCorrelate shift steps
move behind an explicit "tape" mode flag on the evaluation request.
The generic evaluator performs no slicing and no shifting. A caller
that wants tape behaviour sets the flag; a caller that does not gets a
plain whole-ROI comparison. The flag, its default (off), and the tape
path are tested separately.

Related backend intake fix: `BE/routes/score.py`, `_parse_roi`, accepts
only flat `{x, y, width, height}`. After §5, it accepts the domain
`{shape, geometry}` form as well, through the same intake parser as the
frontend, and rejects anything else with an explicit error — it never
silently treats a geometry payload as flat coordinates.

---

## 9. Pin-one configuration

Pin-one is an isolated workstream that shares only the luma helper (§2)
and the region parser (§5) with this file. Its contract:

1. **Detect.** Hole detection uses the shared BT.601 luma (§2) on the
   pin-one region, with `pin1.thresholdLuma` (default 35) as its own
   named setting — not the pattern `greyscaleThreshold` (§3.2).
2. **Persist.** Holes are stored as relative percentages
   (`relativeX / relativeY`) plus absolute centres, with the angle
   computed from the region centre. Relative storage is what makes the
   configuration survive region moves; absolute-only storage is a bug.
3. **Re-evaluate.** Changing the pin-one region, its threshold, or its
   holes re-evaluates the rule and updates the result. A pin-one edit
   that does not re-evaluate, or a re-evaluation that reads stale hole
   positions, is a defect.
4. **Focus area.** The pin-one focus area (the region within which
   holes are searched) is configurable and persisted as part of the
   pin-one tool settings — this is the "pin-one configuration" the user
   asked to be fixed, and it is a settings-plumbing fix, not a
   detection-algorithm change.
5. **Simulation short-circuit, documented.** The carrier-tape evaluator
   short-circuits: Rule 1 (pin-one) failure skips Rule 2 (pattern).
   That ordering is intentional for tape evaluation and must be
   labelled as such in the UI. It must not leak into the generic
   pattern path, where a pin-one failure must not silently suppress a
   pattern result.

Files: `src/components/vision/standard/tools/pin1-config/*`
(`usePin1Rule.ts`, `Pin1Canvas.tsx`, `round-hole-detector.ts`),
`BE/app/domain/pin1_detection.py`, and the Rule 1 section of
`carrier-tape-evaluator.ts` (coordinated with the simulation owner,
companion file 01).

---

## 10. Diagnostics — which grayscale, which path, before fixing

Run this before writing any grayscale fix, and record the outcome in
the plan. Each step distinguishes one ambiguity named in §1 and §8.

1. **Theme vs image (G1 vs G2/G3).** Does the complaint survive
   switching the UI flavour between Standard and Modern? If the
   "grayscale" complaint disappears on flavour switch, it is G1 (theme)
   and is not a bug — close it as by-design and stop.
2. **Mask vs match (G2 vs G3).** Does the failure reproduce on a rule
   with no mask image (`maskImageUrl` empty, full-rectangle ROI)? If
   yes, it is not the mask path. If it reproduces only with a mask
   image set, it is G2 — check `maskThreshold` / `maskInvert` against
   the 62-rule-mask-image contract.
3. **Backend vs frontend (cv2 vs numpy).** Does the same image score
   differently on a machine with cv2 installed versus one without?
   If yes, §2.2 is the cause — fix the fallback first.
4. **Preview vs matcher.** Does the threshold preview show a binary
   image, or gray below the threshold? Gray below the threshold is
   §2.3 — fix the preview before touching the matcher.
5. **Sample vs reference.** Does the same image scored as both sample
   and reference return a perfect score? If not, §4 (asymmetry) is in
   play.
6. **Routing.** Does the rule open the pattern tool or the simulation
   tool? Check the rule's `toolType` (or, pre-fix, which name field
   the dispatcher matched). If a pattern rule opens the simulation
   tool, §7 is the cause — fix dispatch before touching the matcher.

---

## 11. Acceptance criteria

1. One luma function, BT.601, shared by frontend, backend, mask path,
   and pin-one. A test feeds the same image through the cv2 path and
   the numpy path and asserts identical output.
2. Threshold preview is truly binary: below-threshold pixels are 0,
   not their original gray value.
3. Exactly one threshold key per measurement: `detection.greyscaleThreshold`
   (default 170) and `detection.lumaTolerance` (default 22) for pattern
   matching; `pin1.thresholdLuma` (default 35) for pin-one; no other
   threshold source is read in production code. Migration of old keys
   is tested, including the conflicting-values rule (§3.3).
4. Same image as sample and reference scores perfectly through the
   backend endpoint, including above 12 MP.
5. A domain mask survives a round trip through the white-box tool
   unchanged. A flat `searchRegion` write no longer clobbers
   `.shape` / `.geometry`.
6. The matcher recovers a translation offset within ±`searchMarginPx`
   and reports it; a chip shifted by a few pixels passes where it
   previously failed all 24 boxes. `minMatchPercent` comes from
   settings.
7. No rule routes by name substring. A rule with an unknown or missing
   `toolType` shows an explicit unknown-tool state, never a guessed
   tool. The "greyscle" typo has zero hits in production code.
8. The 31-box question is resolved one way or the other: real,
   tested 31-box data, or no "31 box" keyword or label anywhere.
9. Tape slicing and phaseCorrelate shifting occur only when the tape
   flag is set; the generic evaluator performs neither.
10. Pin-one holes persist as relative percentages plus absolute
    centres, survive a region move, and re-evaluate on edit.
11. No §0 rule is broken: Modern UI unchanged, DRY single source of
    truth, exactly 4 Standard mask slots on the same `masks` array with
    the non-destructive notice for extra Modern layers, image-pixel
    geometry, semantic tokens only.
12. The §12 unknowns below remain un-invented: every one is rendered
    (where it has UI) and surfaced as an open question, with no formula
    or unit guessed for it.

---

## 12. Open questions — ASK, DO NOT INVENT

Carried forward verbatim from
`.ai-memory/plans/completed/01-pattern-search-spec.md` §12. These are
explicitly unresolved. Render the UI faithfully, wire the state, and
ask before assigning behaviour or units.

1. **`Unit Time` (`8.8ms`)** — is this the tool's own execution time,
   the whole program's cycle time, or the camera exposure/trigger
   interval? More information is coming; treat it as a read-only
   measured duration for now.
2. **Zoom `40%`** — what is 100% relative to: sensor pixels 1:1, the
   fitted view, or a calibrated physical scale? Presets are a
   placeholder until confirmed.
3. **`Reference Image  1 - 000`** — what do the two numbers mean
   (bank - slot? set - frame index?), what is the valid range, and how
   does `Register Image` allocate the next value?
4. **`Image Enhance` tab contents** — to be specified later; likely a
   separate screen. Ship a placeholder body that states this.
5. **`Image Region` / `Use Image Region` block** — purpose of the
   block, what `Reference Tool` selects, and what `Detection Color`
   White/Black controls.
6. **`Extract Colors` tab** — why it is disabled here, and what it
   does when enabled.
7. **`>>` expanders** (Detection Conditions header, Search Region row)
   — the full contents of the advanced panels they open.
8. **`Counts`** — confirm this is the number of detected instances
   ("pockets") and how it relates to `Detection Count`.
9. **The three view-mode icons** in the image toolbar — confirm the
   exact toggle each one controls.

Additional open questions raised by this file (same rule: ask, do not
invent):

- **O-1.** Which grayscale path is reported broken — G1 (theme), G2
  (mask), or G3 (pattern-match)? Run the §10 diagnostic and record the
  answer before fixing.
- **O-2.** Is there a real 31-box chip definition, or was "31 box"
  always a label error for the 24-box table? (See §6.2 item 4.)
- **O-3.** Does the rotation search implied by `angleRangeDeg` exist
  anywhere, or is the setting currently display-only? (See §6.3.)
- **O-10.** What is the "Yasi and George release"? No person, release
  name, branch name, or document matching "George" was found in the
  repo. Do not cite it as a source until the user identifies it.
