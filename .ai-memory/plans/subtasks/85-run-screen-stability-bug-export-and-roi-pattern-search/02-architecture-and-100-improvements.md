# Subtask 02: Architecture Specification & 100 Concrete Improvements Catalog

- **Task**: `run-screen-stability-bug-export-and-roi-pattern-search - Task 02`
- **Owner**: Lead Orchestrator
- **Status**: COMPLETED
- **Target Files**: `02-spec/21-app/85-run-screen-stability-bug-export-and-roi-pattern-search/` specs 01–08

---

## Deliverables Completed

1. **`01-architecture-spec.md`**: Architectural boundary model, Mermaid flowcharts, state decoupling, and in-ROI pattern coordinate mechanics.
2. **`02-root-cause-analysis-spec.md`**: 4-part RCA covering the 4 core problems: run screen interval flickering, ROI destructive auto-squaring, canvas move/drag trap, and single-export limitations.
3. **`03-bug-recorder-export-and-cli-spec.md`**: 4-action dropdown specification, loopback endpoints (`/bug-reports/save-local`), Antigravity markdown format, and CLI command generation.
4. **`04-roi-preservation-and-pattern-search-spec.md`**: Mathematical specification for shape immutability (rectangles, circles, regular polygons) and relative coordinate coupling for T102 template boxes.
5. **`05-run-layout-and-controller-blending-spec.md`**: Visual layout specs collapsing 56px bottom bar to 20px and blending `Run Full Inspection` into `RuleRightToolbarPanel.tsx`.
6. **`06-canvas-movement-and-pan-tool-spec.md`**: 2D pan/zoom engine (`panX, panY`) and interior draggable body in `RegionOverlay.tsx`.
7. **`07-100-concrete-improvements-spec.md`**: Exactly 100 grounded improvements cataloged across 10 functional pillars.
8. **`08-e2e-verification-and-test-matrix-spec.md`**: Test matrix (TEST-01 to TEST-11) defining concrete verification expectations.
