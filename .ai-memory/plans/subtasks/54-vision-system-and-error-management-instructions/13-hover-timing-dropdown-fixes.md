# Subtask: 13-hover-timing-dropdown-fixes

See plan: .ai-memory/plans/pending/54-vision-system-and-error-management-instructions.md

Status: COMPLETE - all three glitches fixed and pushed; findings in spec section 21.

- Menu hover: UiModeSwitch fixed-width labels + opacity-only reveal;
  nav menu items permanent transparent border (active changes color only);
  Simulation button label grid-stack reserves longest-label width.
- Simulation timing: wall-clock dwell (target wait folds into dwell);
  700ms exit timer removed (transition hide lifts on next target resolve);
  Joyride floatingOptions flip:false + shift padding globally;
  tooltip minHeight 160 locks the Next button.
- Camera: facade storage-event sync for cross-document writes;
  SaveCameraSetupModal reset deps [open] only. Research correction:
  facade was already a singleton since initial commit; useCameraLibrary
  and workspace wiring verified correct, unchanged.
- NOT fixed (follow-up wave): stuck "CONNECTING CAMERA" lives in
  src/components/vision/white-box/useCameraStream.ts (no timeout /
  permission-pending state / retry; readiness gated on videoRef
  presence). Exact fix specified in spec section 21.
- NOT changed on purpose: tour-placement.ts + test (retained,
  subsumed by global flip:false); SimulationPlayerBar.tsx (verified
  not a jump source: hover changes colors only, scale is transform-only).

Commits (all origin-verified via ls-remote):
- 429058da fix - stop header hover jumps in UiModeSwitch and nav menu (spec 54)
- efee9cd2 fix - wall-clock simulation dwell and pinned tooltip placement (spec 54)
- cfc1be8a fix - sync camera library across documents and stop save-modal draft resets (spec 54)
- docs commit (this wave's section 21 record) follows in the same push sequence.

## Integration wave — five leftover items (31-Oct-25 ~02:30, all on origin/main)

Status: COMPLETE. No builds/tests run per program order — end-of-tunnel
wave must typecheck and exercise each item below.

### 1. Stuck camera — FIXED (commit 993382b3)
- `src/components/vision/white-box/useCameraStream.ts`: 15s watchdog —
  if getUserMedia still pends, sets errorText "Camera permission still
  pending — allow camera access in the browser and retry" (the existing
  error box in WorkpieceAnalyzeWorkspace renders it, replacing the
  eternal "CONNECTING CAMERA" spin). Readiness decoupled: setIsReady
  fires on stream acquisition, and a separate effect attaches srcObject
  + play() — the old `if (videoRef.current)` gate is gone. New
  additive returns `isPermissionPending` + `retry()` (attempt counter
  re-runs acquisition); a late permission grant clears the watchdog
  message. NOT wired in the consumer: WorkpieceAnalyzeWorkspace was
  outside this wave's files, so no Retry button renders yet — the
  operator retries today by re-selecting Live Camera (re-runs the
  effect); the end-of-tunnel wave can wire retry() to a button in one
  line. No auto-retry: browsers ignore repeated getUserMedia calls
  while a prompt pends.

### 2. Pin1/grayscale parent wiring — FIXED (commits 905d9a2f, b6a06c36)
- `StandardPin1ConfigTool.tsx`: passes `patternShape` + `onPatternShapeChange`
  to Pin1SettingsCard and `patternShape` to Pin1Canvas (the exact
  2-line diffs from subtask 12). Picker clicks now change saved shape;
  the canvas overlay now appears.
- `BoxReviewPanel.tsx` + `white-box/types.ts` + `WhiteBoxMarkingTool.tsx`:
  BoxReviewPanelProps gained optional greyscaleMode/onGreyscaleModeChange,
  passed to GreyscaleSliderCard; the tool passes model.greyscaleMode /
  changeGreyscaleMode. Mode buttons now live in the white-box panel.
- `Pin1ReviewPanel.tsx` + `Pin1MarkingTool.tsx`: same pass-through for
  the Pin1 panel. Prerequisite the brief did not name: usePin1Rule had
  NO greyscaleMode, so the hook gained `greyscaleMode` state +
  `changeGreyscaleMode` (threshold default; mode changes preview only,
  never re-run detection). `Pin1Canvas.tsx` gained a matching
  `greyscaleMode` prop and its createThresholdPreview now honors it
  (stretch = full-range luma stretch before the polarity test; one-bit
  = pure 0/255; threshold = legacy behavior byte-identical), passed
  from both Pin1 parents. Mode state is NOT persisted to saved rules
  (white-box persists via initialSettings; Pin1 has no equivalent) —
  follow-up if morning wants it saved.

### 3. White-box canvas mode — FIXED (commit 5a70a500)
- `PatternCanvas.tsx`: new optional `greyscaleMode` prop; the base
  image now uses `toGrayscalePreviewRgba(source, mode, level)` instead
  of `toThresholdPreviewRgba` (threshold mode reproduces the legacy
  output exactly); mode added to the draw-effect deps.
  `WhiteBoxMarkingTool.tsx` passes `model.greyscaleMode`.
  Note: the subtask text named `renderSelectedWhiteBoxMarks`, but no
  caller in src uses it — PatternCanvas's actual call site was
  `toThresholdPreviewRgba`, which is what changed.

### 4. Pin1 canvas lock/reorder — FIXED (commit 4a355a24)
- `Pin1Canvas.tsx`: search region (ROI) locked by default — the drag
  hook gets `isLocked` in search edit mode (selection-only, no
  move/resize, no replacement on outside click; the lock only engages
  once a region exists, so first creation is never blocked).
  Double-click inside a locked ROI unlocks it. Locked ROI draws no
  handles and is labeled "SEARCH REGION • LOCKED". Right-click context
  menu (topmost hit first, fixed-position like the white-box menu):
  Bring Forward / Send Backward swap the search/package draw order,
  Lock/Unlock toggles the ROI lock. Package region stays unlocked
  (it is edited right after "Add Package Region"). Panel lock/reorder
  buttons still omitted (Pin1MarkingTool's LayersPanel) — the canvas
  enforcement lands first, panel buttons are the follow-up.
  Rotation NOT added (Pin1 has no rotation model; white-box rotation
  is opt-in per layer and Pin1 never opts in).

### 5. RECORD BUG button — FIXED (commit a5d34adf)
- Recorder files were free (no in-flight parallel edits; tree clean),
  so the wiring landed in code, not as a patch note.
- `RecorderExportModal.tsx`: new "Send Bug Report" button beside
  Telegram/Download ZIP. It POSTs to the loopback backend
  (`resolveBackendBaseUrl`, newly exported from history-facade.ts):
  title + description/expected/actual message, trigger_component
  RecorderExportModal, session_id, reporter_context (category, routes,
  event/screenshot counts). Channels are chosen from GET
  /bug-reports/config first — email + Supabase when configured, email
  only otherwise — because the route errors on unconfigured Supabase
  even after email succeeds; the status box names the channels used.
  Seed mode (no backend) reports honestly instead of posting. The
  modal stays open on success so the operator can still Download ZIP.
  Route errors surface the envelope message, never a bare status code.
