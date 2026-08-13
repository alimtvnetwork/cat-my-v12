# Standard UI Vision Task & Observations - Part 1 (Steps 1-100)

Slug: 99-vision-standard-ui-part1
Steps: 100
Status: pending
Created: 2026-08-14

## Context
First 100 steps of the 400-step vision standard UI overhaul. This part covers addressing the architecture observations (monolithic components, console.log scattering, instanceof hazards), establishing the static/reference image as the primary mode, and overhauling the "clicking camera" flexible layout.

## Steps

### Phase 1: Architecture Observations Remediation (Steps 1-25)
1. **Analyze `ProjectEditorSections.tsx`**
   - **What**: Identify logical splits in the ~1,112 line file.
   - **How**: Map out hooks, pure UI sections, and business logic.
   - **Agents**: 1 (Research).
   - **Guidelines**: Adhere to `spec/02-coding-guidelines/00-overview.md` (components < 100 lines).
2. **Extract `ProjectEditorState` hook**
   - **What**: Move state management out of `ProjectEditorSections.tsx`.
   - **How**: Create `useProjectEditorState.ts` containing local state.
   - **Agents**: 1 (Frontend).
   - **Guidelines**: Strict TS types, no generic unions.
3. **Extract `ProjectEditorToolbar` component**
   - **What**: Move the toolbar to a separate file.
   - **How**: Create `ProjectEditorToolbar.tsx`.
   - **Agents**: 1 (Frontend).
   - **Guidelines**: Max 100 lines per component rule.
4. **Extract `ProjectEditorMainCanvas` component**
   - **What**: Move the central canvas area.
   - **How**: Create `ProjectEditorMainCanvas.tsx`.
   - **Agents**: 1 (Frontend).
   - **Guidelines**: Max 100 lines, prop drilling minimized.
5. **Extract `ProjectEditorSidePanel` component**
   - **What**: Move the side panel configuration.
   - **How**: Create `ProjectEditorSidePanel.tsx`.
   - **Agents**: 1 (Frontend).
   - **Guidelines**: Max 100 lines.
6. **Refactor `ProjectEditorSections.tsx` root**
   - **What**: Convert to a clean orchestrator component.
   - **How**: Import the 3 new components and hook.
   - **Agents**: 1 (Frontend).
   - **Guidelines**: Target < 100 lines for the orchestrator.
7. **Analyze `src/routes/__root.tsx`**
   - **What**: Identify logic causing ~762 lines.
   - **How**: Map boot orchestration vs shell UI.
   - **Agents**: 1 (Research).
   - **Guidelines**: Adhere to `spec/02-coding-guidelines`.
8. **Extract `RootBootOrchestrator` hook**
   - **What**: Isolate boot logic.
   - **How**: Create `useRootBootOrchestrator.ts`.
   - **Agents**: 1 (Frontend).
   - **Guidelines**: Strict typing for boot states.
9. **Extract `RootErrorBoundary` component**
   - **What**: Isolate error catching.
   - **How**: Create `RootErrorBoundary.tsx`.
   - **Agents**: 1 (Frontend).
   - **Guidelines**: `error-manage` compliant (3-tier UI).
10. **Refactor `src/routes/__root.tsx`**
    - **What**: Shrink root route.
    - **How**: Import orchestrated hooks and error boundary.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: < 300 lines per file.
11. **Design Unified Client Log Pipeline**
    - **What**: Replace scattered `console.info/warn`.
    - **How**: Create `src/lib/observability/client-logger.ts`.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Align with BE structured JSON logging.
12. **Implement `ClientLogger.info`**
    - **What**: Info level logging.
    - **How**: Add method with correlation ID context.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Strict interface types.
13. **Implement `ClientLogger.warn`**
    - **What**: Warn level logging.
    - **How**: Add method mapping to telemetry.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Strict interface types.
14. **Implement `ClientLogger.error`**
    - **What**: Error level logging.
    - **How**: Tie to `error-manage` AppError structures.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Follow 3-tier error architecture.
15. **Audit codebase for `console.info`**
    - **What**: Find legacy logging.
    - **How**: `grep` search across `src/`.
    - **Agents**: 1 (Research).
    - **Guidelines**: None.
16. **Migrate `src/components/` to `ClientLogger`**
    - **What**: Replace UI logs.
    - **How**: Import and use new logger.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Maintain context strings.
17. **Migrate `src/lib/` to `ClientLogger`**
    - **What**: Replace logic logs.
    - **How**: Import and use new logger.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Maintain context strings.
18. **Address Vite `instanceof` Hazard**
    - **What**: Fix `err instanceof EnvelopeError`.
    - **How**: Audit `src/` for `instanceof EnvelopeError`.
    - **Agents**: 1 (Research).
    - **Guidelines**: Refer to memory observation 60.
19. **Fix `instanceof` in API clients**
    - **What**: Use `.name === "EnvelopeError"`.
    - **How**: Replace instanceof checks.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Error safety standard.
20. **Fix `instanceof` in Error Boundaries**
    - **What**: Ensure UI catches correctly.
    - **How**: Update boundary fallback logic.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: `error-manage` compliant.
21. **Audit Dual Backend Confusion**
    - **What**: Identify overlapping rules logic.
    - **How**: Cross-reference `BE/app/` and `app/`.
    - **Agents**: 1 (Research).
    - **Guidelines**: Architecture consolidation.
22. **Document Canonical Rule Engine**
    - **What**: Define the single source of truth.
    - **How**: Write `spec/21-app/canonical-engine.md`.
    - **Agents**: 1 (Backend).
    - **Guidelines**: Clear boundaries.
23. **Verify API boundaries (Zod)**
    - **What**: Ensure all BE interactions use Zod.
    - **How**: Scan `src/lib/backend/`.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Strict typings.
24. **Validate `isFail` explicit booleans**
    - **What**: Enforce memory rule 12.
    - **How**: Audit store actions for `isFail`.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Explicit boolean checks.
25. **Finalize Architecture Phase 1**
    - **What**: Confirm lines < 300, components < 100.
    - **How**: Run linter stats.
    - **Agents**: 1 (DevOps).
    - **Guidelines**: Code red limits.

### Phase 2: Core Infrastructure for Image/Camera State (Steps 26-50)
26. **Define `ImageSourceMode` Enum**
    - **What**: State for static vs camera.
    - **How**: Create `ImageSourceModeType.ts` (`STATIC`, `LIVE`).
    - **Agents**: 1 (Frontend).
    - **Guidelines**: PascalCase enum, Type suffix.
27. **Update Store for Image Source**
    - **What**: Hold the selected mode.
    - **How**: Add `imageSourceMode` to main store.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: V4 state management rule.
28. **Set Static as Default Mode**
    - **What**: Default to static image per user request.
    - **How**: Initialize store with `STATIC`.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Explicit defaults.
29. **Create `ImageSourceToggle` UI component**
    - **What**: Switch between static and live.
    - **How**: Toggle button component.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: < 100 lines, 40px hit area.
30. **Wire Toggle to Store**
    - **What**: Connect UI to state.
    - **How**: `useStore(s => s.setImageSourceMode)`.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Facade/store conventions.
31. **Define Static Reference Interface**
    - **What**: Data structure for the reference image.
    - **How**: `ReferenceImage` type with URL/ID.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Strict typings.
32. **Mock Static Image Seed Data**
    - **What**: Provide fixture for static mode.
    - **How**: Add image asset to `bundle.v2.json`.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Seed contract (Plan 86).
33. **Implement `StaticImageViewer` component**
    - **What**: Render the static image.
    - **How**: Clean wrapper around `<img />` or canvas.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: < 100 lines, Tailwind v4.
34. **Implement `LiveCameraViewer` component (Stub)**
    - **What**: Render the live feed.
    - **How**: Video/canvas element bound to stream.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: < 100 lines, Tailwind v4.
35. **Create `MainVisionCanvas` Orchestrator**
    - **What**: Switch between views based on mode.
    - **How**: Render `StaticImageViewer` or `LiveCameraViewer`.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: < 100 lines.
36. **Wire `MainVisionCanvas` to Store**
    - **What**: React to `ImageSourceMode`.
    - **How**: Use store selector.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: React performance guidelines.
37. **Design 'Clicking Camera' Interaction**
    - **What**: UX for triggering a manual capture.
    - **How**: Define the button and feedback state.
    - **Agents**: 1 (UX/Frontend).
    - **Guidelines**: Professional aesthetic, no glitchy layout.
38. **Implement `CaptureTriggerButton` component**
    - **What**: The actual capture button.
    - **How**: Accessible button with active/disabled states.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: 40px hit area.
39. **Wire Capture Event to Store/Facade**
    - **What**: Trigger the camera action.
    - **How**: Call SDK facade / trigger endpoint.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: SDK Facade pattern.
40. **Handle Capture Loading State**
    - **What**: Visual feedback during capture.
    - **How**: Spinner or skeleton over canvas.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Tailwind v4 styling.
41. **Handle Capture Error State**
    - **What**: Surface camera failures.
    - **How**: Use `error-manage` toast/modal.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: 3-tier error architecture.
42. **Update Layout for Flexibility**
    - **What**: Ensure the canvas scales gracefully.
    - **How**: Flexbox/Grid CSS overhaul.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Tailwind v4, design tokens.
43. **Implement Safe Zone Overlays on Static**
    - **What**: Show inspection boundaries.
    - **How**: Absolute positioned SVG over image.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Memory rule 53 (safeZone metrics).
44. **Implement Safe Zone Overlays on Live**
    - **What**: Show inspection boundaries.
    - **How**: Absolute positioned SVG over feed.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Reusable overlay component.
45. **Create `CameraConnectionIndicator`**
    - **What**: Show hardware status in Live mode.
    - **How**: Status dot (green/red/yellow).
    - **Agents**: 1 (Frontend).
    - **Guidelines**: 13px tabular-nums typography.
46. **Wire Connection Indicator to Facade**
    - **What**: Real-time status.
    - **How**: Poll or WS from backend status.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: SDK Facade pattern.
47. **Design Empty State for Live Mode**
    - **What**: What to show when camera is disconnected.
    - **How**: Clean placeholder graphic.
    - **Agents**: 1 (UX).
    - **Guidelines**: Professional, not standard glitchy text.
48. **Implement Empty State UI**
    - **What**: Code the placeholder.
    - **How**: React component using design system tokens.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: < 100 lines.
49. **Write E2E test for Mode Switch**
    - **What**: Verify static to live toggle.
    - **How**: Playwright test clicking toggle.
    - **Agents**: 1 (QA).
    - **Guidelines**: Use standard test locators.
50. **Review Phase 2 against Spec**
    - **What**: Ensure UI improvements align with V4 spec.
    - **How**: Manual cross-check with `spec/21-app/53-ui-improvements-v4.md`.
    - **Agents**: 1 (Reviewer).
    - **Guidelines**: Complete coverage.

### Phase 3: "Clicking Camera" Overhaul & Flexibility (Steps 51-75)
51. **Audit existing camera connection UX**
    - **What**: Review the "bad" UI.
    - **How**: Local run and trace component tree.
    - **Agents**: 1 (Research).
    - **Guidelines**: Note deviations from tokens.
52. **Refactor `DeviceDiscoveryPanel.tsx`**
    - **What**: Improve device selection UI.
    - **How**: Standardize list items and hit areas.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: 40px hit area sweep.
53. **Implement Hardware Mock Toggle**
    - **What**: Fake camera for seed mode.
    - **How**: Add dev-frame toggle option.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: `LOVABLE_HW_DAHENG=1` handling.
54. **Revamp Camera Setting Sliders**
    - **What**: Exposure, gain, etc.
    - **How**: Use unified `Slider` component from tokens.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: V4 palette rules.
55. **Group Camera Settings**
    - **What**: Logical organization of controls.
    - **How**: Accordions or tabs.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Max 100 lines per section component.
56. **Wire Exposure Slider to Facade**
    - **What**: Connect to backend.
    - **How**: `updateCameraSetting` action.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Envelope response handling.
57. **Wire Gain Slider to Facade**
    - **What**: Connect to backend.
    - **How**: `updateCameraSetting` action.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Envelope response handling.
58. **Implement Trigger Mode Selector**
    - **What**: Hardware vs Software trigger.
    - **How**: Radio group.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: 40px hit areas.
59. **Add Focus Peaking Visualizer (Stub)**
    - **What**: UI for focus assist.
    - **How**: Overlay toggle.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Clean professional aesthetic.
60. **Fix "Clicking" Glitches**
    - **What**: Remove UI jumping when clicking capture.
    - **How**: Fixed height containers, prevent layout shift.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: CSS-first Tailwind.
61. **Implement Keyboard Shortcut for Capture**
    - **What**: Spacebar to capture.
    - **How**: Global keydown listener in Live mode.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Accessible event handling.
62. **Add Shortcut Tooltip to Button**
    - **What**: Show "(Space)" on hover.
    - **How**: `Tooltip` component.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Tooltip + long-press semantics.
63. **Refactor Image History Rail**
    - **What**: Show previous captures cleanly.
    - **How**: Horizontal scroll list.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Fixed numbers for tool rail.
64. **Wire History Rail to DB**
    - **What**: Fetch from `images/processed`.
    - **How**: Query wrapper for `GET /images`.
    - **Agents**: 1 (Frontend/Backend).
    - **Guidelines**: Query wrapper strict TS rules.
65. **Implement Select from History**
    - **What**: Click thumbnail to set as Reference.
    - **How**: Update store `ReferenceImage`.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: V4 state management.
66. **Add "Set as Reference" overlay action**
    - **What**: Hover action on history items.
    - **How**: Absolute position button.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: 40px hit area.
67. **Implement Reference Image Locking**
    - **What**: Prevent accidental overrides.
    - **How**: Lock toggle in UI.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Explicit boolean checks (`isLocked`).
68. **Revamp Rule ROI Badges on Canvas**
    - **What**: Improve visibility over images.
    - **How**: High contrast borders, 13px tabular-nums.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: V4 palette + badge rules.
69. **Implement Pan/Zoom on Canvas**
    - **What**: Inspect image details.
    - **How**: Transform scale via wheel/drag.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Performance optimization.
70. **Add Reset View Button**
    - **What**: Return to 100% scale.
    - **How**: Button resetting transform state.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Professional icon placement.
71. **Handle Window Resize gracefully**
    - **What**: Canvas should respond to window size.
    - **How**: ResizeObserver hook.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Debounced callbacks.
72. **Refactor Canvas to support Layers**
    - **What**: Base image + ROI layer + Result layer.
    - **How**: Absolute positioned divs.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: < 100 lines per layer component.
73. **Implement Result Overlay visibility toggle**
    - **What**: Show/hide PASS/FAIL graphics.
    - **How**: Eye icon toggle.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Standardized UI toggle.
74. **Write E2E test for Capture flow**
    - **What**: Verify live mode -> capture -> history.
    - **How**: Playwright mock API.
    - **Agents**: 1 (QA).
    - **Guidelines**: Core flow coverage.
75. **Review Phase 3 Code Quality**
    - **What**: Ensure no monolithic canvas files.
    - **How**: Linter and manual check.
    - **Agents**: 1 (Reviewer).
    - **Guidelines**: Code red constraints.

### Phase 4: Backend & Seed Synchronization (Steps 76-100)
76. **Audit `bundle.v2.json` Seed Data**
    - **What**: Check for missing static references.
    - **How**: Read seed file.
    - **Agents**: 1 (Research).
    - **Guidelines**: V4 Seed contract.
77. **Update Seed Data with new fields**
    - **What**: Add default reference image ID.
    - **How**: Edit `bundle.v2.json`.
    - **Agents**: 1 (Backend).
    - **Guidelines**: Valid JSON schema.
78. **Update `schemas-v2.ts`**
    - **What**: Add typing for new seed fields.
    - **How**: Edit Zod schemas.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Zod strict typing.
79. **Audit BE `/camera` endpoints**
    - **What**: Ensure capture endpoints exist and match facade.
    - **How**: Review `BE/routes/`.
    - **Agents**: 1 (Research).
    - **Guidelines**: SDK Facade rule.
80. **Implement `POST /camera/capture` (if missing)**
    - **What**: Trigger hardware capture.
    - **How**: Call capture service.
    - **Agents**: 1 (Backend).
    - **Guidelines**: Envelope format, AppError.
81. **Implement `GET /camera/status`**
    - **What**: Retrieve connection status.
    - **How**: Probe hardware or return cached state.
    - **Agents**: 1 (Backend).
    - **Guidelines**: Envelope format.
82. **Implement `GET /images/reference`**
    - **What**: Retrieve current active reference.
    - **How**: Query RootDb/TaskDb.
    - **Agents**: 1 (Backend).
    - **Guidelines**: Split DB rules.
83. **Implement `PUT /images/reference`**
    - **What**: Set active reference.
    - **How**: Update DB.
    - **Agents**: 1 (Backend).
    - **Guidelines**: Split DB rules.
84. **Wire Frontend Facade `captureImage`**
    - **What**: Method matching backend endpoint.
    - **How**: Update `domain-facade.ts`.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Frozen contract rules.
85. **Wire Frontend Facade `getCameraStatus`**
    - **What**: Method matching backend endpoint.
    - **How**: Update `domain-facade.ts`.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Frozen contract rules.
86. **Wire Frontend Facade `getReference`**
    - **What**: Method matching backend endpoint.
    - **How**: Update `domain-facade.ts`.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Frozen contract rules.
87. **Wire Frontend Facade `setReference`**
    - **What**: Method matching backend endpoint.
    - **How**: Update `domain-facade.ts`.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Frozen contract rules.
88. **Implement Mock Facade for Capture**
    - **What**: Seed mode support.
    - **How**: Return mock image from fixture.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Seed mode parity.
89. **Implement Mock Facade for Status**
    - **What**: Seed mode support.
    - **How**: Return 'Connected'.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Seed mode parity.
90. **Implement Mock Facade for Reference**
    - **What**: Seed mode support.
    - **How**: Return mock ID.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Seed mode parity.
91. **Test Backend mode vs Seed mode (Capture)**
    - **What**: Ensure `getActiveProfile()` correctly routes.
    - **How**: Manual/Unit test.
    - **Agents**: 1 (QA).
    - **Guidelines**: Data-path complexity rule.
92. **Implement Backend Error Handling for Capture**
    - **What**: Map Daheng SDK errors.
    - **How**: Throw `AppError(E_CAMERA_FAULT)`.
    - **Agents**: 1 (Backend).
    - **Guidelines**: 3-tier error architecture.
93. **Surface Backend Error in UI**
    - **What**: Ensure toast appears on capture fail.
    - **How**: Global error hook interception.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: `error-manage` compliance.
94. **Refactor Query Wrappers for new endpoints**
    - **What**: Enforce strict query wrapper rules.
    - **How**: Use `useQuery` / `useMutation` correctly.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Memory rule 12.
95. **Ensure single identity header**
    - **What**: Workspace header per memory rule 25.
    - **How**: Check fetch clients.
    - **Agents**: 1 (Frontend).
    - **Guidelines**: Memory rule 25.
96. **Validate Integer IDs for Images**
    - **What**: Avoid UUIDs for images.
    - **How**: Check DB schema and endpoints.
    - **Agents**: 1 (Backend).
    - **Guidelines**: Memory rule 25 (integer-only URL ids).
97. **Finalize DB Migrations**
    - **What**: If schema changed, commit migration.
    - **How**: `app/core/io/migrations/`.
    - **Agents**: 1 (Backend).
    - **Guidelines**: Split DB rules.
98. **Write Backend Tests**
    - **What**: Test new endpoints.
    - **How**: Pytest in `tests/unit/`.
    - **Agents**: 1 (Backend).
    - **Guidelines**: Status codes and envelope shapes locked.
99. **Run Linter Scripts**
    - **What**: Validate all changes.
    - **How**: `bun run lint` and `bunx tsgo`.
    - **Agents**: 1 (DevOps).
    - **Guidelines**: 0 errors/warnings.
100. **Part 1 Signoff**
     - **What**: Conclude first 100 steps.
     - **How**: Update tracker and prepare for next 100.
     - **Agents**: 1 (Manager).
     - **Guidelines**: Execution lifecycle tracking.

## End of Part 1
