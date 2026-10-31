# 85 - Run Screen Stability, Bug Export Dropdown & ROI Pattern Search Architecture

## 1. Executive Summary

This specification directly addresses the critical usability, visual stability, and functional gaps identified in the inspection runtime:
1. **Run Screen Stability & Glitch Elimination**: Eradicating endless re-render loops, rapid interval layout shifts, and console errors in the live inspection view.
2. **Bottom Footer Bar Reduction & Run Button Relocation**: Moving the floating `RUN` action into the right-hand inspection control rail to eliminate wasted vertical screen real estate.
3. **Advanced Bug Recording Export Suite**: Replacing the single "Export ZIP" button with a multi-action export dropdown:
   - Export ZIP bundle.
   - Send / Copy Prompt for IDE / AI with local file image references (`@[file;path/to/snap.png]`) conforming to Antigravity conventions.
   - Save to Local Machine / Disk directly into `.logs/recorded-bugs/<session-id>/` without browser download prompts.
   - CLI Inspection (`cat bug inspect <id>` / `uv run --project BE python -m BE.cli.processing.commands.errors`).
4. **ROI Shape Preservation & Elimination of Destructive Mutations**: Enforcing that the Region of Interest (ROI) geometry (e.g. rectangular Caliper Search Region) is never distorted or auto-squared when configuring inspection parameters.
5. **In-ROI Pattern Search Integration**: Implementing first-class Pattern Search template matching within the bounded ROI rather than mutating the parent region.
6. **Canvas Move / Pan Tooling Fluidity**: Fixing canvas viewport panning, item movement, and transform coordinates so operators can navigate freely without header click traps.

---

## 2. Directory Structure

- `01-architecture-spec.md`: Holistic architecture covering runtime state isolation, in-ROI pattern hierarchy, and local bug storage.
- `02-root-cause-analysis-spec.md`: 4-part RCA addressing screen glitching, ROI mutation, canvas pan capture, and single-export limitations.
- `03-bug-recorder-export-and-cli-spec.md`: Dropdown specification, Antigravity-compatible prompt formatter, local disk writer endpoint, and CLI inspection.
- `04-roi-preservation-and-pattern-search-spec.md`: Strict ROI dimension lock and in-ROI pattern search template placement.
- `05-run-layout-and-controller-blending-spec.md`: Bottom bar reduction, right-hand controller button blending, and viewport maximizing.
- `06-canvas-movement-and-pan-tool-spec.md`: Pointer event mechanics, pan/move tool modes, and coordinate normalization.
- `07-100-concrete-improvements-spec.md`: Exactly 100 grounded improvements catalog.
- `08-e2e-verification-and-test-matrix-spec.md`: Comprehensive test matrix and verification plan.

---

## 3. Reference Plans & Subtasks

- **Master Plan**: `.ai-memory/plans/pending/85-run-screen-stability-bug-export-and-roi-pattern-search.md`
- **Subtasks**: `.ai-memory/plans/subtasks/85-run-screen-stability-bug-export-and-roi-pattern-search/`
