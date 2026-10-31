# Subtask: 04-fix-carrier-simulation-and-square-roi

Plan: .ai-memory/plans/pending/05-pattern-search-and-ui-improvement.md
Slug: pattern-search-and-ui-improvement - Task 04
Status: READY_FOR_IMPLEMENTATION

## 1. Objectives & Implementation Blueprint

Remediate the geometric distortion and empty pocket overlay bugs in the carrier tape simulation pipeline and pattern search rule authoring.

---

## 2. Implementation Action Items

1. **Square ROI in Guided Simulation**:
   - File: `src/components/guided-simulation/ProjectCreationAnalysisTour.tsx`
   - Actions: Replace wide rectangle `width: 930, height: 174` with isotropic square `width: 174, height: 174` centered over target IC (e.g. `x: 393, y: 183`).

2. **Suppress Pattern Boxes on Empty Pockets**:
   - File: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
   - Actions: In the carrier tape pocket rendering loop (around line 2250), check:
     ```typescript
     if (pocket.isEmpty || pocket.status === "EMPTY") {
       // Render pocket boundary outline only; do not invoke parseBoxesFromParams or draw pattern boxes
       return;
     }
     ```

3. **Synchronous Pattern Box Persistence**:
   - File: `src/components/vision/workpiece/RuleToolConfigPanel.tsx`
   - Actions: In `handleApplyPattern`, ensure `patternBoxes: pattern.referenceBoxes` and `patternBoxesJson: JSON.stringify(pattern.referenceBoxes)` are written to `updatedParams` alongside `referenceBoxes`.

4. **Square Search Region Enforcement**:
   - File: `src/lib/vision/pinned-pattern-geometry.ts`
   - Actions: Verify `squareSearchRegion()` clamps side lengths and prevents rectangular ROI leakage.

---

## 3. Verification Criteria

- [ ] Guided simulation tour opens with a centered 1:1 square ROI.
- [ ] Empty pockets in carrier tape strips display clean cavities with zero pattern markings.
- [ ] Authored pattern boxes in rule editor survive page reload and persist into project store.
