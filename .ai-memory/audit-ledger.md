# Audit Ledger: Run Screen Stability, Bug Export Dropdown & ROI Pattern Search

- **Date:** 2026-10-31
- **Status:** Phase 2 Execution Active
- **Framework:** V6 Tree Swarm Orchestration (A=3, H=2, Capacity=6)
- **Active Plan:** `.ai-memory/plans/pending/85-run-screen-stability-bug-export-and-roi-pattern-search.md`
- **Spec Directory:** `02-spec/21-app/85-run-screen-stability-bug-export-and-roi-pattern-search/`

---

## 1. Verified Research Diagnoses (Completed Phase 1)

1. **ROI Shape Distortion Root Cause**:
   - `pinned-pattern-geometry.ts:92`: `isSquare` evaluated `true` when `shapeType` was undefined, defaulting to square ROI.
   - `WorkpieceAnalyzeWorkspace.tsx:1323`: `handleEvaluateRule` ran `railHandlers.onUpdateRule(pinnedRule)`, silently overwriting user rectangular ROIs with squares in the project store and database.
   - `StandardWorkbenchCanvas.tsx:50`: `isSquareROI: true` hardcoded.
   - Fixed by enforcing positive check `shapeType === "square"`, removing store overwrite on evaluation, and updating unit tests.

2. **Missing Pattern Search Tool**:
   - `VISION_TOOL_CATALOG` lacked an entry named `"Pattern Search"` (only had `"Greyscale Pattern Matching"`).
   - `StandardInspectionToolDispatcher.tsx` lacked routing for `T116` / `"Pattern Search"` to `StandardPatternSearch`.
   - Fixed by adding `T116: Pattern Search` to the catalog and routing it cleanly in `StandardInspectionToolDispatcher`.

3. **Run Screen 5Hz Glitching & Error Storm**:
   - `src/routes/run.tsx:294`: Frame loop called `setReferenceImage` writing synchronous `localStorage` 5 times a second and reloading `MachineFrame` image tag.
   - `fetchBackend("/score")` and `fetchBackend("/telemetry/summary")` lacked `X-Suppress-Toast`, throwing error floods when backend was offline.
   - Layout overlap between `CAM-01` badge and `Selected Rule Sets` card at `top-3 left-3`.
   - Fixed by removing `localStorage` thrashing from the 200ms loop, suppressing unhandled toasts on poll, and offsetting overlay positions.

4. **Bottom Bar Reduction & Controller Blending**:
   - `WorkpieceAnalyzeWorkspace.tsx` had an isolated 56px bottom bar with the RUN button.
   - `RuleRightToolbarPanel.tsx` lacked `onRunAllAnalysis` and `isAnalysisBusy` prop forwarding.
   - Fixed by moving `Run Full Inspection` into `RuleRightToolbarPanel` sticky footer and condensing bottom bar to a 22px telemetry ticker (+56px canvas space).

5. **Top-of-Screen Drag Click Trap**:
   - `RegionOverlay.tsx:164` had `pointerEvents: "none"` on ROI body, forcing users to click the top `-top-5` header grip.
   - Fixed by enabling `pointerEvents: active && !isLocked ? "auto" : "none"` on ROI interior.

---

## 2. In-Flight Execution Subagent Wave (Wave 2)

| Wave | Subagent ID | Role | Assigned Task | Disjoint Boundaries |
|------|-------------|------|---------------|---------------------|
| W2   | Exe-ROI     | Vision ROI & Pattern Search Worker | Task-02: Fix ROI squarification & expose Pattern Search | `src/lib/vision/pinned-pattern-geometry.ts`, `tool-catalog.ts`, `StandardInspectionToolDispatcher.tsx`, `RuleToolConfigPanel.tsx`, `pinned-pattern-geometry.test.ts` |
| W2   | Exe-Run     | Run Screen Stability Worker | Task-01: Fix /run re-renders, toast floods & layout overlaps | `src/routes/run.tsx`, `src/components/hmi/Viewport.tsx`, `src/components/hmi/ViewportImageControls.tsx`, `src/components/hmi/MachineFrame.tsx` |
| W2   | Exe-Layout  | Layout & Recorder Export Worker | Task-03: Bottom bar reduction, controller run button, recorder modal & interior drag | `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`, `RuleRightToolbarPanel.tsx`, `src/components/recorder/RecorderExportModal.tsx`, `RegionOverlay.tsx` |
