# 07 - 100 Grounded Concrete Improvements Catalog

- **Specification ID**: `SPEC-85-07`
- **Module**: `AppRuntime / Quality / 100-Improvements`
- **Status**: Active Catalog
- **Date**: 2026-10-31

---

## 1. Executive Summary

This catalog documents exactly 100 concrete, grounded improvements across the industrial vision inspection system, categorized across 10 functional pillars:
1. Run Screen Visual Stability (1–10)
2. Bug Recorder & Diagnostic Export (11–20)
3. ROI Geometry & Shape Immutability (21–30)
4. In-ROI Pattern Search Hierarchy (31–40)
5. Canvas Pan, Zoom & Viewport Usability (41–50)
6. Controller Panel & Layout Optimization (51–60)
7. Window Controls & Win32 Integration (61–70)
8. Split-DB Error Management & Telemetry (71–80)
9. Performance & Memory Leak Prevention (81–90)
10. Accessibility & Industrial Keyboard Navigation (91–100)

---

## 2. Catalog of 100 Grounded Improvements

### Cluster 1: Run Screen Visual Stability (1–10)
1. **IMP-001**: Decouple 500ms wall-clock interval from full `RunPage` component tree re-renders.
2. **IMP-002**: Gate `setReferenceImage(sample.url)` to execute strictly when `sample.url !== getReferenceImage()`.
3. **IMP-003**: Add `decoding="async"` to background `<img>` in `MachineFrame.tsx` to prevent main-thread decoding jank.
4. **IMP-004**: Apply smooth CSS opacity transition to `MachineFrame.tsx` image transitions to prevent black-screen flash.
5. **IMP-005**: Throttle live inspection frame evaluation loop to user-configured `targetFps` (1–10 FPS).
6. **IMP-006**: Deduplicate repetitive telemetry messages in the Realtime Event Stream ticker.
7. **IMP-007**: Ensure `fetchBackend<ScoreResponse>("/score")` handles offline/fallback simulation without UI freezes.
8. **IMP-008**: Display persistent industrial machine status badge (`RUNNING`, `PAUSED`, `IDLE`) in top header.
9. **IMP-009**: Cache pre-loaded carrier tape sample thumbnails in local memory on initial load.
10. **IMP-010**: Prevent layout shift on carrier tape metric chips (Yield Rate, Throughput FPS, Total, Pass, Fail).

### Cluster 2: Bug Recorder & Diagnostic Export (11–20)
11. **IMP-011**: Replace single "Export ZIP" button with an industrial 4-action split dropdown in `RecorderFloatingHud.tsx`.
12. **IMP-012**: Implement `Copy Prompt for AI / IDE` with Google Antigravity attachment format: `@[file;.logs/recorded-bugs/<id>/screenshots/<file>.png]`.
13. **IMP-013**: Add `@router.post("/save-local")` loopback endpoint in `BE/routes/bug_reports.py` for direct disk writes.
14. **IMP-014**: Fix missing `import json` and `from pathlib import Path` in `BE/routes/bug_reports.py`.
15. **IMP-015**: Support `dataUrl`, `dataUri`, and `data` payload fields interchangeably in screenshot decoders.
16. **IMP-016**: Add `Copy CLI Command` button to copy `python -m BE.cli.processing.main errors list --session-id <id> --trace`.
17. **IMP-017**: Fix undefined `baseUrl` reference in `RecorderExportModal.tsx` via `resolveBackendBaseUrl()`.
18. **IMP-018**: Auto-persist `metadata.json` and `prompt.md` into `.logs/recorded-bugs/<id>/` on session stop.
19. **IMP-019**: Reposition floating recorder HUD so it never collides with or obscures the top navigation bar.
20. **IMP-020**: Display visual capture count badges and ping animations on the floating HUD during recording.

### Cluster 3: ROI Geometry & Shape Immutability (21–30)
21. **IMP-021**: Remove hardcoded `isSquareROI: true` from `StandardWorkbenchCanvas.tsx:50`.
22. **IMP-022**: Allow Caliper (`StandardEdgeWidthTool`) to author and persist asymmetric rectangular aspect ratios (`width !== height`).
23. **IMP-023**: Restrict `squareSearchRegion` execution strictly to rules where `shapeType === "square"`.
24. **IMP-024**: Eliminate `needsSquare` re-pinning effect loop in `VisualToolWorkpieceCanvas.tsx:1574–1577`.
25. **IMP-025**: Lock 1:1 aspect ratio on Circle ROIs during corner drag to prevent elliptical distortion.
26. **IMP-026**: Replace `ctx.ellipse` with `ctx.arc(cx, cy, r)` with uniform radius `r = Math.min(rx, ry)`.
27. **IMP-027**: Calculate regular polygon vertices from uniform circumscribed radius to maintain equilateral symmetry.
28. **IMP-028**: Clamp ROI bounding boxes within natural image boundaries `[0, naturalW - 16]` and `[0, naturalH - 16]`.
29. **IMP-029**: Add two-way shape toggle (`Rectangle` vs. `Square` vs. `Circle` vs. `Polygon`) in floating toolbar.
30. **IMP-030**: Preserve exact sub-pixel geometry when switching between standard workbench and visual workpiece canvas.

### Cluster 4: In-ROI Pattern Search Hierarchy (31–40)
31. **IMP-031**: Extend `VisionLayerItem` in `src/components/vision/layers/types.ts` with `parentId`, `depth`, and `isExpanded`.
32. **IMP-032**: Model T102 Pattern Search template constellations as child layers under the parent ROI.
33. **IMP-033**: Store template boxes using relative percentage coordinates (`relX, relY, relWidth, relHeight`).
34. **IMP-034**: Automatically translate and scale child template boxes when the parent ROI moves or resizes.
35. **IMP-035**: Pass full rectangular ROI dimensions to `getPatternBoxesForRegion` instead of forcing square bounds.
36. **IMP-036**: Add visual parent-child tree indentation in `InspectionHierarchyTree.tsx` and `PhotoshopLayersPanel.tsx`.
37. **IMP-037**: Cascade visibility toggle: hiding parent ROI automatically hides all child pattern boxes.
38. **IMP-038**: Cascade lock toggle: locking parent ROI automatically locks all child pattern boxes.
39. **IMP-039**: Display pattern match confidence percentages on each child template box badge.
40. **IMP-040**: Allow clicking a child pattern box in the layers tree to highlight its vector outline on canvas.

### Cluster 5: Canvas Pan, Zoom & Viewport Usability (41–50)
41. **IMP-041**: Enable interior body dragging in `RegionOverlay.tsx` (`pointer-events-auto` on active unlocked ROI).
42. **IMP-042**: Eliminate the top-of-screen drag click trap where operators had to click the -top-5 header bar.
43. **IMP-043**: Add 2D pan state (`panX, panY`) to `VisualToolWorkpieceCanvas.tsx` for smooth viewport navigation.
44. **IMP-044**: Support `Middle Click + Drag` for instant CAD-grade viewport panning.
45. **IMP-045**: Support `Spacebar + Left Click + Drag` for standard viewport panning across all canvases.
46. **IMP-046**: Support trackpad two-finger pan gestures for fluid navigation.
47. **IMP-047**: Map client pointer coordinates inversely through both pan translation and zoom scaling.
48. **IMP-048**: Add `Fit to Screen` (Reset Pan & Zoom) button in canvas floating controls.
49. **IMP-049**: Add keyboard shortcut `0` to instantly reset viewport pan and zoom to default.
50. **IMP-050**: Restrict canvas panning so the workpiece image cannot be dragged completely off-screen.

### Cluster 6: Controller Panel & Layout Optimization (51–60)
51. **IMP-051**: Collapse bloated 56px bottom bar in `WorkpieceAnalyzeWorkspace.tsx` into a 20px status ticker.
52. **IMP-052**: Gain 56px of vertical canvas height for the workpiece CAD viewport.
53. **IMP-053**: Integrate primary `Run Full Inspection` action directly into the sticky footer of `RuleRightToolbarPanel.tsx`.
54. **IMP-054**: Position `Test This Rule` alongside `Run Full Inspection` for unified one-click evaluation.
55. **IMP-055**: Display compact engine state (`ANALYZING` / `ENGINE READY`) with pulsing indicator in bottom ticker.
56. **IMP-056**: Display active reference image / camera stream source label in bottom ticker.
57. **IMP-057**: Display active rule count and system version in bottom ticker.
58. **IMP-058**: Provide hidden file upload input with compact trigger button in bottom ticker.
59. **IMP-059**: Style sticky action bar in right controller panel with cyber-industrial gradient and blur.
60. **IMP-060**: Disable action buttons with animated spin indicator during active evaluation ticks.

### Cluster 7: Window Controls & Win32 Integration (61–70)
61. **IMP-061**: Provide instant non-blocking window close via background daemon thread in `BE/routes/shutdown.py`.
62. **IMP-062**: Eliminate window close hang by posting `WM_CLOSE` and `SC_CLOSE` messages without waiting for `taskkill`.
63. **IMP-063**: Ensure window close triggers graceful backend and frontend teardown in `run.ps1`.
64. **IMP-064**: Implement native Win32 minimize (`ShowWindow(SW_MINIMIZE)`) via loopback window controller.
65. **IMP-065**: Implement native Win32 maximize/restore toggle (`SW_MAXIMIZE` / `SW_RESTORE`).
66. **IMP-066**: Display Chromium app window in borderless kiosk mode with industrial titlebar controls.
67. **IMP-067**: Log all window control events to SQLite Split-DB (`task.db`) with full stack traces.
68. **IMP-068**: Add pre-hydration HTML/CSS splash screen to prevent white flash before Vite loads.
69. **IMP-069**: Display app version number (`v4.113.15`) on the splash screen loader.
70. **IMP-070**: Handle graceful recovery if the browser window process is terminated externally by Task Manager.

### Cluster 8: Split-DB Error Management & Telemetry (71–80)
71. **IMP-071**: Implement `python -m BE.cli.processing.main errors list --session-id <id> --trace` command.
72. **IMP-072**: Enforce zero error swallowing across all frontend API wrappers and event handlers.
73. **IMP-073**: Write unhandled exceptions directly into SQLite `task.db` with structured `error_record`.
74. **IMP-074**: Include complete tracebacks and trigger component names in all recorded database errors.
75. **IMP-075**: Eliminate `rule set version is behind server` conflict toast via automatic version sync.
76. **IMP-076**: Expose error history facade (`useErrorStore`) with automatic reactive polling.
77. **IMP-077**: Sanitize sensitive tokens from error metadata before recording to database.
78. **IMP-078**: Provide CSV and JSON output formatters for CLI error querying.
79. **IMP-079**: Link recorded bug reports with associated SQLite database errors by `session_id`.
80. **IMP-080**: Add visual error counter badge to industrial header bar.

### Cluster 9: Performance & Memory Leak Prevention (81–90)
81. **IMP-081**: Unsubscribe all interval timers and event listeners on component unmount.
82. **IMP-083**: Avoid recreating canvas contexts on every frame tick; reuse persistent 2D rendering contexts.
83. **IMP-083**: Dispose blob URLs created by screenshot captures after export completes.
84. **IMP-084**: Throttle pointer move handlers during ROI drag to `requestAnimationFrame` cycles.
85. **IMP-085**: Prevent full workspace state re-renders during drag by keeping drag coordinates in local component state.
86. **IMP-086**: Optimize SVG grid rendering in `MachineFrame.tsx` with static path strings.
87. **IMP-087**: Cache parsed inspection recipe JSON rulesets in memory to avoid repetitive parsing.
88. **IMP-088**: Bound memory size of the Realtime Event Stream to the most recent 100 events.
89. **IMP-089**: Bound SQLite WAL log file sizes across root, task, and rules databases.
90. **IMP-090**: Purge stale build caches in `.uv-cache` and `.logs` during preflight startup.

### Cluster 10: Accessibility & Industrial Keyboard Navigation (91–100)
91. **IMP-091**: Support `Spacebar` to toggle inspection run / pause on the Run page.
92. **IMP-092**: Support `Escape` to cancel active ROI dragging or close open modals.
93. **IMP-093**: Support `Delete` or `Backspace` to delete the currently selected active rule.
94. **IMP-094**: Support `Tab` key navigation through all inspector parameters and controls.
95. **IMP-095**: Use compound keyboard helpers (`isEnterOrSpace`) complying with P4a complexity limits.
96. **IMP-096**: Ensure all interactive buttons have explicit `aria-label` and `title` tooltips.
97. **IMP-097**: Meet WCAG 2.1 AA color contrast standards across all cyber-industrial lipgloss tokens.
98. **IMP-098**: Provide visible high-contrast focus rings on all keyboard-navigable elements.
99. **IMP-099**: Provide keyboard shortcut help modal (`?` or `help.shortcuts` event).
100. **IMP-100**: Guarantee all critical inspection workflows can be operated entirely without a mouse.
