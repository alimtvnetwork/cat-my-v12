# Subtask 04: Run Screen Glitch Elimination & Bottom Bar Reduction

- **Task**: `run-screen-stability-bug-export-and-roi-pattern-search - Task 04`
- **Owner**: Worker 2 (`d4571796-be3d-4cb2-b415-1b58ccd67b1a`)
- **Status**: COMPLETED
- **Target Files**: `src/routes/run.tsx`, `src/components/hmi/MachineFrame.tsx`, `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`, `src/components/vision/workpiece/RuleRightToolbarPanel.tsx`

---

## 1. Accomplishments & Verification

1. **Run Screen Interval Optimization (`src/routes/run.tsx`)**:
   - Eliminated top-level 500ms `setNow` interval that was forcing entire `RunPage` re-renders.
   - Encapsulated elapsed time and FPS throughput into isolated subcomponents (`RunElapsedTimer` and `RunThroughputCounter`), updating only their local leaf DOM nodes.
   - Guarded `setReferenceImage(sample.url)` to execute strictly when `sample.url !== getReferenceImage()`, preventing redundant store dispatches.

2. **DOM Image Stability (`src/components/hmi/MachineFrame.tsx`)**:
   - Added `decoding="async"` and smooth CSS opacity transition (`transition-opacity duration-150 ease-out`).
   - Eliminated DOM recreation and black-screen flashes during rapid frame transitions.

3. **Bottom Bar Condensation (`WorkpieceAnalyzeWorkspace.tsx`)**:
   - Collapsed the bloated 56px bottom bar into a minimal 18–20px status ticker (`py-1 px-3 text-[10px] text-white/40`).
   - Gained ~50px of vertical canvas height for the workpiece CAD viewport.
   - Preserved image import functionality and wired `onRunAllAnalysis` and `isAnalysisBusy` to `RuleRightToolbarPanel`.

4. **Right Controller Action Bar (`RuleRightToolbarPanel.tsx`)**:
   - Integrated prominent `Run Full Inspection` button in the bottom sticky action bar alongside `Test This Rule`.
   - Verified with unit tests in `RuleRightToolbarPanel.test.tsx` (9/9 passing).
   - Typecheck verified clean (0 errors).
