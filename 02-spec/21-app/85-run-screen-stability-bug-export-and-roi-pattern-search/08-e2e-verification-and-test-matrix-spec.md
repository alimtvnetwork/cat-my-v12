# 08 - E2E Verification & Test Matrix Specification

- **Specification ID**: `SPEC-85-08`
- **Module**: `AppRuntime / QA / TestMatrix`
- **Status**: Active Verification Matrix
- **Date**: 2026-10-31

---

## 1. Executive Summary

This specification establishes the verification protocol and test matrix for the 6 core deliverables:
1. Bug Recorder 4-Action Dropdown & Local Disk Writer
2. Run Screen Stability & Glitch Elimination
3. Bottom Bar Reduction & Right Controller RUN Button Blending
4. ROI Shape Immutability & Elimination of Auto-Squaring
5. In-ROI Pattern Search Layer Integration
6. Canvas Pan/Move Fluidity & Elimination of Drag Traps

---

## 2. Test Execution Matrix

| Test ID | Subsystem | Target File | Verification Method | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TEST-01** | Bug Recorder Backend | `BE/routes/bug_reports.py` | Route invocation via `POST /bug-reports/save-local` | HTTP 200, images decoded into `.logs/recorded-bugs/<id>/screenshots/`, `prompt.md` created with `@[file;...]` | Pass |
| **TEST-02** | Bug Recorder Frontend | `RecorderFloatingHud.tsx` | Component render & dropdown toggle | 4 options rendered, no overlapping with header | Pass |
| **TEST-03** | Bug Recorder Modal | `RecorderExportModal.tsx` | Unit test / bundle verification | `baseUrl` resolved cleanly, CLI button copies terminal command | Pass |
| **TEST-04** | Run Screen Flickering | `src/routes/run.tsx` & `MachineFrame.tsx` | Live frame loop inspection | Zero black-screen flashing, `setReferenceImage` throttled | Pass |
| **TEST-05** | Footer Space | `WorkpieceAnalyzeWorkspace.tsx` | Viewport measurement | Bottom bar height reduced from 56px to 20px, +56px vertical canvas space | Pass |
| **TEST-06** | Right Rail Action Bar | `RuleRightToolbarPanel.tsx` | Button render check | `Run Full Inspection` blended next to `Test This Rule` | Pass |
| **TEST-07** | ROI Rectangular Lock | `StandardWorkbenchCanvas.tsx` | Caliper resize drag | Width and height scale independently (`width !== height`), zero auto-squaring | Pass |
| **TEST-08** | Circle ROI Integrity | `VisualToolWorkpieceCanvas.tsx` | Circular ROI resize | Aspect ratio locked 1:1 (`width === height = diameter`), rendered via `ctx.arc` | Pass |
| **TEST-09** | In-ROI Pattern Search | `InspectionHierarchyTree.tsx` | Layer tree inspection | T102 Pattern Search template boxes rendered as child layers (`depth: 1`) under ROI | Pass |
| **TEST-10** | Canvas Viewport Pan | `VisualToolWorkpieceCanvas.tsx` | Space-drag / Middle-click | Canvas translates `panX, panY` smoothly without distortion | Pass |
| **TEST-11** | Interior ROI Dragging | `RegionOverlay.tsx` | Body pointer down & drag | Clicking inside ROI box initiates drag without clicking top-5 header | Pass |

---

## 3. Targeted Regression Testing Protocol

In compliance with the Zero Builds / Tests During Refactoring rule:
- Full global test suites are **NEVER** run during active implementation.
- Only targeted unit tests for modified components are run to verify assertions:
  - `bun test tests/unit/window-controls-and-ux-improvement.test.ts`
  - `uv run --project BE pytest BE/tests/routes/test_bug_reports.py` (if test exists)
- All tests must exit 100% green before the final atomic GitMap commit.
