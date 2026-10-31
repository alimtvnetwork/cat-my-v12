# 04 — One Hundred Improvements

**Status:** Draft, companion to files 01–03 of `03-pattern-search-and-ui-improvement`.
**Parent spec:** `.ai-memory/plans/completed/01-pattern-search-spec.md`.
**How to read this file:** these are 100 improvement possibilities, grouped by
area. They are proposals, not verified defects — each item must be checked
against the code before implementation. Count is exact: 10 groups × 10 items.

## 1. Coordinate unification (RC1, file 01)

1. Adopt one canonical image space (native source pixels) across editor, pattern, simulation, and backend.
2. Record sourceWidth/sourceHeight and scale factors once at image load; never re-derive them per tool.
3. Replace aspect-destroying stretch on load with aspect-preserving fit plus a recorded transform.
4. Remove the hardcoded 350/220/350/180 default search region; derive defaults from image size.
5. Delete the dead DPR factor (`dpr > 0 ? 1 : 1`) or implement real DPR handling.
6. Clamp every region to image bounds at intake, not at evaluation time.
7. Convert backend ROI intake to the geometryJson envelope; keep the flat payload only as a migration shim.
8. Expand search windows after coordinate conversion, never before.
9. Make fit-to-viewport never trigger a bounds validation error.
10. Add a coordinate-space label to every region debug readout (which space, which transform version).

## 2. Grayscale and luminance (RC2, file 02)

11. Pin one BT.601 luma function shared by frontend and backend.
12. Fix the numpy BGR fallback red/blue weight swap.
13. Make the threshold preview a true binary image, not half-binarized.
14. Collapse threshold resolution to a single named setting with a migration rule.
15. Remove the hardcoded toleranceLuma 22; expose it as a setting.
16. Apply identical downsample and optical treatment to sample and reference.
17. Guard above-12MP downsample so ROI coordinates stay valid after scaling.
18. Separate the three grayscales in UI copy (theme, mask, match) so operators stop conflating them.
19. Add a grayscale diagnostic view: raw vs converted vs thresholded side by side.
20. Record threshold plus luma version on every saved result for reproducibility.

## 3. Matcher, dispatch, and data model (RC3, file 02)

21. Give the matcher a real translation search (sliding window / offset recovery).
22. Add rotation search honoring angleRangeDeg, or mark the setting display-only.
23. Replace substring dispatch with an explicit tool type field.
24. Fix the "greyscle simulation" typo and remove name fallthrough.
25. Resolve the 31-box alias: real data or remove the keyword.
26. Collapse five region representations into the domain {shape, geometry} canonical form.
27. Stop the pattern hook from clobbering .shape/.geometry when writing back flat regions.
28. Stop dropping domain masks when maskRegions is the only read path.
29. Confine backend tape-slicing logic to tape paths only.
30. Add a dispatch audit log: rule name, matched predicate, tool rendered.

## 4. Pattern-region and search-region UX

31. Enforce square ROI as a scoped rule once its scope is answered (search / pattern / masks / all).
32. Add the image toolbar to the greyscale and simulation tools, not only StandardPatternSearch.
33. Put shape buttons (RECT / SQUA / CIRC / POLY) inside the ROI editing surface.
34. Settle the rotation-handle rule for pattern regions (present or explicitly absent, one answer).
35. Adopt one ROI colour mapping for the pattern screen and update the conflicting docs.
36. Show live X/Y/W/H numeric fields bidirectionally synced with drag and resize.
37. Add Shift-drag aspect lock and arrow-key nudges (1px, Shift+arrow 10px) on all region canvases.
38. Add minimum-size enforcement from the shared shape definition.
39. Show tolerance zones and match origin markers on canvas, not only in panels.
40. Replace every blank render with hatch plus message empty states.

## 5. Layers and masks UX

41. Give mask slots a reorder control in Standard, or record an explicit no-reorder decision.
42. Show a non-destructive notice when a Modern case with more than 4 masks opens in Standard.
43. Scope the ordering rules per surface: editor index 0 = bottom, mask slots index 0 = top.
44. Fix hidden-panel dead ends: every hidden panel must have a visible restore path.
45. Unify or explicitly bridge the two panel systems (palette-store vs workspace layout).
46. Reset stale persisted layout state with one operator action (no manual localStorage edits).
47. Dim locked rules to 60% and hidden overlays to 40% consistently on both surfaces.
48. Add group / ungroup / merge for rule layers without schema-breaking changes.
49. Log layers.locked_transform_blocked on every blocked transform attempt.
50. Add drag-to-canvas re-centring for layer rows.

## 6. Simulation

51. Document 512x288 as sim-local; never write sim state to real rules.
52. Give the simulation treeRules reorder, or record an explicit no-reorder decision.
53. Unify the two sim conventions (center-relative vs percentage box offsets).
54. Guard extractSubRegion against out-of-bounds reads (no silent zero-fill).
55. Draw overlays outside the jitter-translated context so they stop drifting per frame.
56. Align sim tolerances (margin 8, angle 1.0, minMatch 80, level 170) with shared settings or document the split.
57. Add a sim-vs-real settings diff view so operators see which values diverge.
58. Add per-frame jitter controls (on/off, magnitude) for reproducible sim runs.
59. Cache liveAnalyzedMap per settings snapshot, not cleared on every slider tick.
60. Add sim export: frames plus verdicts plus settings snapshot as one artifact.

## 7. Window controls, menus, version display

61. Decide the shell (AI-01) in writing: browser-chrome reliance vs real shell IPC.
62. Add real OS window controls only if a real shell exists; never ship dead buttons.
63. Add a version chip to StatusBar or HeaderActions fed by build-time injection.
64. Define VITE_APP_VERSION in vite.config.ts and wire it to version.json.
65. Stop installers from recording "unknown" when APP_VERSION is unset (fail or read from release).
66. Reconcile version.json 4.112.17 with the release line before the next release.
67. Instrument menu-open timing (open request to first paint) before claiming any latency cause.
68. Reduce titlebar re-render scope: subscribe menu components only to the state they render.
69. Remove backdrop-blur over repainting canvases or gate it behind a performance flag.
70. Add the menubar chunk to vite optimizeDeps so it never optimizes on first use.

## 8. Run pipeline and installation

71. Make run.ps1 and run.sh read run.config.json (or delete the config as dead).
72. Honor -NoShell / --no-shell and add a config flag for default browser behavior.
73. Add a skip-if-unchanged check to the DB bootstrap step.
74. Replace the /setup readiness gate with a cheap health endpoint.
75. Unify ports (5173 vs 8080) and health paths (/healthz vs /health) across scripts and config.
76. Add dependency preflight that fails fast with a named missing piece.
77. Track and kill child processes (uv run, bun) on launcher exit in both scripts.
78. Make the chromium-shell zip step fail loud when nix is absent, never silently skip.
79. Create the missing local-install.ps1 / local-install.sh or remove references to them.
80. Add a clean-machine end-to-end install test to the repo.

## 9. Pin-one

81. Finish pin-one focus-area configuration end to end (detect, persist, re-evaluate).
82. Persist holes as relative % plus absolute centers plus angle, in one record.
83. Fold thresholdLuma into the single threshold setting.
84. Stop the carrier-tape evaluator from short-circuiting Rule 2 silently; log the skip.
85. Show pin-one delta/theta telemetry on canvas next to the detected ring.
86. Add pin-one angle datum selection (which point is the angle origin).
87. Validate circularity and threshold inputs at entry, not at evaluation.
88. Share one luma helper between pin-one canvas, detector, and evaluator.
89. Add a pin-one calibration capture: known-good hole set saved as reference.
90. Surface Rule 1 FAIL vs Rule 2 not-run distinctly in results (never conflate).

## 10. Verification, E2E, docs, and spec hygiene

91. Add E2E tests for install, run (PS1 plus run.sh), pattern search, grayscale, pin-one.
92. Add a dispatcher routing test matrix (every tool name × expected tool).
93. Add coordinate conversion round-trip tests across all four spaces.
94. Add a grayscale golden-image test (same image, cv2 path vs numpy path, identical output).
95. Add a matcher translation test (chip shifted N px still matches).
96. Add visual regression baselines for header/menu after any menu change.
97. Fix the stale plan index (01-pattern-search-spec lives in completed/, not pending/).
98. Fix the 06-vision-system-v2.md status header (says pending, sits in completed/).
99. Fix the ui-prefs-store path drift in the 91-ui-flavors plan.
100. Record the "George" question and the three-grayscale ruling in the spec before closing this task.
