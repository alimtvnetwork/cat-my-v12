# Subtask: 12-pin1-tools-grayscale-bits

See plan: .ai-memory/plans/pending/54-vision-system-and-error-management-instructions.md

Status: COMPLETE (wave 2, 31-Oct-25 ~02:20). All 5 batches on origin/main.
No builds/tests run per program order — end-of-tunnel wave must typecheck
and exercise: shape picker click → saved payload shape, canvas overlay +
selection, grayscale mode buttons, `processing-cli ui click/set` on the
new registry entries.

## What was built

### Pin1 pattern shape (ROI stays plain, pattern takes the shape)
- `src/lib/vision/white-box-marking.ts` — SearchRegion extended with
  optional shape/rotationDeg/points; clampRegion preserves them;
  getPatternShapePoints / isPointInPatternShape / tracePatternShapePath
  (rectangle = bounds, circle = inscribed circle, ellipse = inscribed
  ellipse, polygon = stored points or corners; rotation around center).
- `src/components/vision/standard/tools/pin1-config/usePin1Rule.ts` —
  patternShape state (restored from pin1Config.patternShape, then saved
  wrapper shape; legacy lowercase "rectangle" accepted); the hardcoded
  `shape: "rectangle"` at save time is GONE (now `shape: patternShape`);
  patternShape saved in pin1Config + pin1ConfigJson; drag handler
  re-attaches the shape so dragging cannot reset it.
- `src/components/vision/standard/tools/pin1-config/Pin1SettingsCard.tsx` —
  Pattern Shape picker (Rectangle / Circle / Ellipse / Polygon) with
  per-button data-ui-id. Existing REGION SHAPE buttons untouched.
- `src/components/vision/standard/tools/pin1-config/Pin1Canvas.tsx` —
  fuchsia pattern-shape overlay inscribed in the ROI (label
  "PATTERN SHAPE: <SHAPE>", vertex markers for polygon); click
  hit-testing selects the shape (thicker stroke) WITHOUT consuming the
  event, so region move/resize behavior is unchanged. Canvas carries
  data-ui-id ui-pin1-canvas.
- Detection still runs on the bounding rect (backend + local detector
  are rect-based); the shape is a search/display contract, not a
  detection-region change. Polygon point editing is NOT built (points
  default to corners) — follow-up for the layers workstream.

### Grayscale bits (dark darker, white whiter, down to black/white)
- `src/lib/vision/white-box-marking.ts` — GrayscaleMode
  ("threshold" | "stretch" | "one-bit"); toContrastStretchedGray
  (full-range linear stretch); toOneBitGray (pure 0/255);
  toGrayscalePreviewRgba (mode-aware); renderSelectedWhiteBoxMarks
  gained an optional mode param (default "threshold", so existing
  callers are unaffected). toThresholdPreviewRgba behavior UNCHANGED
  (DefectCanvas / PatternMatchCanvas / PatternCanvas depend on it).
- `src/components/vision/white-box/GreyscaleSliderCard.tsx` — mode
  button row (Threshold / Stretch / 1-Bit) with per-button data-ui-id,
  placed AFTER the slider so the ui-greyscale-level XPath still matches.
  Backend detection still uses the slider value as whiteThreshold in
  every mode.
- `src/components/vision/white-box/useWhiteBoxMarking.ts` —
  greyscaleMode state + changeGreyscaleMode (resets result/boxes like
  changeGreyscaleLevel), both returned.

### CLI-UI registry
- `BE/ui_remote/registry.py` — 8 new entries appended (14 → 22):
  ui-pin1-pattern-shape-rectangle/circle/ellipse/polygon,
  ui-pin1-canvas, ui-greyscale-mode-threshold/stretch/one-bit.
- `src/lib/ui-remote/registry.ts` — regenerated via
  03-ai-scripts/generate-ui-remote-registry.py (22 elements).
- ui-greyscale-level entry verified still matching the edited card.

## Commits (all on origin/main)
- d0c57039 — pattern shape geometry + grayscale modes in white-box-marking
- 41c59b1e — pin1 pattern shape state replaces hardcoded rectangle
- 53474ab9 — pin1 pattern shape picker + canvas overlay with hit-test
- 0e81a5c1 — grayscale mode control wired through white-box hook
- 8b12c389 — registry entries + regenerated TS mirror

## Integration still owed (parent-tool wiring, NOT in this workstream's files)
- `StandardPin1ConfigTool.tsx` must pass `patternShape={model.patternShape}`
  + `onPatternShapeChange={model.setPatternShape}` to Pin1SettingsCard,
  and `patternShape={model.patternShape}` to Pin1Canvas. Until then the
  picker renders but clicks are no-ops (safe: optional props) and the
  canvas overlay does not appear.
- `BoxReviewPanel.tsx` / `Pin1ReviewPanel.tsx` must pass
  `greyscaleMode` + `onGreyscaleModeChange` to GreyscaleSliderCard
  (from useWhiteBoxMarking's greyscaleMode / changeGreyscaleMode).
  Until then the mode defaults to "threshold" and buttons are no-ops.
- `PatternCanvas.tsx` (layers workstream's file) must pass the mode to
  renderSelectedWhiteBoxMarks / toGrayscalePreviewRgba for the
  stretch/1-bit preview to reach the white-box canvas. The lib functions
  are ready; the preview wiring is the remaining mile.

## MBUD addition for the morning
- ROI-vs-pattern shape question: the current UI's REGION SHAPE buttons
  (RECTANGLE / SQUARE / CIRCLE, seen in screenshot mr6_-1EdpFtG) set the
  ROI shape, while the new picker sets the PATTERN shape. Both now exist
  side by side. Morning call: keep both, or retire the ROI shape buttons
  per the user's model (ROI stays a plain region)?
- Saved shape values change from lowercase "rectangle" to ShapeType enum
  values ("Rectangle", "Circle", ...); the reader accepts both, so old
  saves load fine.
