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
