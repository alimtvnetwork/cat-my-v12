# 88 - Snap 24 Event 20 UI and Functionality Issues Specification

- **Specification ID**: `SPEC-88-ROOT`
- **Module**: `VisionUI / WorkpieceCanvas / BugRecorder / ExportSuite / Diagnostics`
- **Date**: 31-Oct-26
- **Status**: ACTIVE

---

## 1. Executive Summary

This specification governs the remediation of critical UI interaction failures and bug diagnostic reporting:
1. **ROI Rectangle Invariant**: Region of Interest (ROI) is strictly an axis-aligned bounding rectangle `(x, y, width, height)`. Shape selection (`rectangle`, `square`, `circle`, `polygon`) is relocated exclusively under Pattern Search (T102). Auto-squaring ROI width/height is completely eliminated.
2. **Canvas Selection Unblock**: Resolves hit-test priority inversion in `VisualToolWorkpieceCanvas.tsx` so that other rules can be clicked and selected even when large rules ($800 \times 520$) cover the canvas. Fixes clamping math collapse and decouples interior double-clicking from lock state toggling.
3. **Analysis Steps Telemetry**: Captures all 5 canonical inspection phases (Preprocessing, Pattern Search, Edge Detection, Defect Check, Validation) with full-resolution screenshots and explicit step names in the recorder stream.
4. **Event Explorer Modal**: Adds a filterable Event Explorer modal modeled after Antigravity Tools with 6 category filter chips (`all`, `error`, `analysis`, `recording`, `simulation`, `interaction`).
5. **Authentic GitMap Letterly Prompts (V6 & V7)**: Rewrites prompt generation to strictly adhere to the canonical GitMap Letterly structure with non-asset invariants, directional navigation arrows, action items, and skill execution links.
6. **Export Modal Scrolling & Dropdown Anchoring**: Fixes `RecorderExportModal.tsx` with vertical scrolling (`max-h-[90vh] overflow-y-auto`) and upward dropdown placement (`placement="top"` / `bottom-full mb-2`) to eliminate clipping and missed clicks.
7. **Clipboard Path Architecture**: Automatically writes the exact downloaded ZIP path (`C:\Users\Administrator\Downloads\<filename>.zip`) or local session folder path (`.logs/recorded-bugs/<session_id>/`) to the clipboard with AI extraction instructions.
8. **Diagnostics Sanitization & Function Stack Traces**: Strips noisy Mozilla user agent headers; formats diagnostics into clean GitMap key-attributes; injects authentic JavaScript and Python function names into error stack traces.
9. **Anti-Asset Invariant**: Strictly forbids saving bug report screenshots into repository asset folders (`src/assets/`, `assets/`).

---

## 2. Specification Index

- [`01-roi-rectangle-and-pattern-shapes-spec.md`](01-roi-rectangle-and-pattern-shapes-spec.md): Axis-aligned rectangular ROI enforcement, removal of shape selectors from ROI card, and allocation of multi-shape tools to Pattern Search (T102).
- [`02-canvas-selection-unblock-spec.md`](02-canvas-selection-unblock-spec.md): Deterministic hit-test priority (handles -> header grip -> other rules -> body drag), clamping fix, and workspace lock synchronization.
- [`03-authentic-letterly-prompt-engine-spec.md`](03-authentic-letterly-prompt-engine-spec.md): Canonical Letterly prompt generator matching `01-prompts/22-letterly/` with 5 pillars, non-asset warning, and skill execution links.
- [`04-export-dropdown-and-modal-scroll-spec.md`](04-export-dropdown-and-modal-scroll-spec.md): Modal vertical scroll container (`overflow-y-auto`), upward dropdown placement, and ZIP/folder clipboard path copy.
- [`05-analysis-steps-recording-spec.md`](05-analysis-steps-recording-spec.md): 5-phase inspection analysis capture (`recordAnalysisStep`), full screenshot storage in runtime logs, and phase metrics.
- [`06-event-explorer-and-diagnostics-spec.md`](06-event-explorer-and-diagnostics-spec.md): Antigravity cyber-styled Event Explorer modal with category filters, sanitized GitMap JSON diagnostics, and authentic function stack traces.

---

## 3. Subtask Plans Index

- [Subtask 01: ROI Rectangle Enforcement & Pattern Search Shapes](../../../.ai-memory/plans/subtasks/88-snap-24-event-20-ui-and-functionality-issues/01-roi-rectangle-and-pattern-shapes.md)
- [Subtask 02: Canvas Selection Unblock & State Sync](../../../.ai-memory/plans/subtasks/88-snap-24-event-20-ui-and-functionality-issues/02-canvas-selection-unblock.md)
- [Subtask 03: Authentic GitMap Letterly Prompt Engine](../../../.ai-memory/plans/subtasks/88-snap-24-event-20-ui-and-functionality-issues/03-authentic-letterly-prompt-engine.md)
- [Subtask 04: Export Modal Scrolling, Upward Dropdown & Path Clipboard](../../../.ai-memory/plans/subtasks/88-snap-24-event-20-ui-and-functionality-issues/04-export-dropdown-and-modal-scroll.md)
- [Subtask 05: Analysis Steps Telemetry & Recording Pipeline](../../../.ai-memory/plans/subtasks/88-snap-24-event-20-ui-and-functionality-issues/05-analysis-steps-recording.md)
- [Subtask 06: Event Explorer Modal, Diagnostics & Stack Traces](../../../.ai-memory/plans/subtasks/88-snap-24-event-20-ui-and-functionality-issues/06-event-explorer-and-diagnostics.md)
