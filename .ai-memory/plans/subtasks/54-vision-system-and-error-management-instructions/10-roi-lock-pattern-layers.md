# Subtask: 10-roi-lock-pattern-layers

See plan: .ai-memory/plans/pending/54-vision-system-and-error-management-instructions.md

## Status: COMPLETE (wave 2, 31-Oct-25)

- ROI locked by default after creation: `useCanvasPointerDrag` takes
  `isLocked`; a locked ROI ignores move/resize/rotate drags, and
  clicking outside it does NOT silently replace it (the old bug).
  Double-click inside a locked ROI unlocks it
  (`PatternCanvas` onDoubleClick -> `onSearchRegionLockChange(false)`).
  Once unlocked, the old behavior returns: drag to move/resize, click
  outside to draw a new region.
- Rotate handle: `pattern-geometry.ts` adds `rotateHandlePoint`,
  `hitRotateHandle`, `rotationAngleDeg` (0 = pointing up, 0-360).
  `regionHandles()` is UNCHANGED (8 handles) so Pin1Canvas rendering is
  byte-identical; rotation is opt-in via `isRotationEnabled` on the
  hook, and rotation degrees flow through `onRegionRotationChange`
  (axis-aligned `SearchRegion` geometry is unchanged; rotation is a
  layer transform drawn with ctx.translate/rotate).
- Draw order, bottom to top (spec 54 section 2 model): ROI -> pattern
  region -> masks -> tolerance zones -> numbered pattern boxes on top.
  Previously boxes/zones were drawn BEFORE regions.
- Right-click context menu on the canvas (topmost hit first: boxes,
  masks reversed, pattern region, ROI): Bring Forward / Send Backward /
  Lock-Unlock (ROI only) / Hide Layer. Lock/unlock and reorder are
  owned by the tool state, not the canvas.
- Corrupt saved-region JSON capture (follow-up to wave-1 batch 2):
  `VisualToolTuningModal.readSavedRegion` threads a failures out-param
  (buildSettingsFromRule -> existing useEffect capture with code
  E_TUNING_MODAL_PARSE_SAVED_JSON; handleApplyPin1 captures directly
  as an event handler). `workpiece-rule-analyzer.parseStoredRegion`
  calls the shared `captureCorruptSavedJson` helper (now with an
  `action` param) with E_ANALYZER_PARSE_SAVED_JSON. Only field +
  payload length recorded, never raw content.
- NOT done here (documented, not skipped): pattern SHAPE tools
  (rectangle/circle on the pattern, not the ROI) belong to the sibling
  wave-2 workstream; detection bounds stay axis-aligned (rotation is
  visual until rotated matching exists); `parseStoredRegionList`
  silent catch left as-is (out of assigned function scope).

## Commits (wave 2, this workstream)

- edc6821b: types + geometry + drag hook
- 0edd98f0: PatternCanvas layer order, unlock, context menu, rotate
- 312fef68: tool wiring (with LayersPanel h-full fix)
- a0eb7bc8: JSON capture fixes
- (registry batch): BE/ui_remote/registry.py + generated mirror
