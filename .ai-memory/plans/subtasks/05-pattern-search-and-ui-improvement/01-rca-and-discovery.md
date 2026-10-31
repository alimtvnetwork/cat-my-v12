# Subtask: 01-rca-and-discovery

Plan: .ai-memory/plans/pending/05-pattern-search-and-ui-improvement.md
Slug: pattern-search-and-ui-improvement - Task 01
Status: COMPLETE

## 1. Objectives & Scope

Execute a forensic root-cause analysis across the CAT Vision application suite to isolate the exact structural, geometric, and rendering flaws causing pattern search drift, simulation anomalies, and UI glitches.

---

## 2. Key Findings & Diagnostic Evidence

1. **Missing Saved Pattern Boxes**:
   - `src/components/vision/workpiece/RuleToolConfigPanel.tsx` writes `referenceBoxes`, `referenceBoxesJson`, `constellation`, `constellationJson`, but omits `patternBoxes` and `patternBoxesJson`.
   - `src/lib/vision/workpiece-rule-analyzer.ts` inspects `toolParams.patternBoxes`. When absent, it falls back to uncalibrated defaults.

2. **Wide Rectangular ROI (930x174)**:
   - `src/components/guided-simulation/ProjectCreationAnalysisTour.tsx` lines 384, 547, 552 hardcode `width: 930, height: 174`.
   - Distorts 1:1 square aspect ratio requirement, causing 5.34x horizontal stretching of pattern templates.

3. **Pattern Overlays on Empty Pockets**:
   - `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx` lines 2250–2295 renders pattern boxes unconditionally over all carrier tape cavities.
   - Lacks check for `pocket.isEmpty || pocket.status === "EMPTY"`.

4. **Luminance and Grayscale Distortion**:
   - `src/lib/vision/luminance-quantizer.ts` Stage 2 applies dynamic contrast stretching unconditionally between 2nd and 98th percentiles even when linear grayscale is desired.
   - Missing dedicated 8-bit linear ITU-R BT.601 conversion mode; forces aggressive 1-bit binary or 2-bit quantization.

5. **Rotation Search Hopping**:
   - `src/lib/vision/pattern-matcher.ts` lines 258–290 evaluates angles without a distance regularization penalty, causing symmetrical ICs to flip 90 or 180 degrees on tie scores.

6. **Menu Dropdown Snapping Glitch**:
   - `src/components/ui/dropdown-menu.tsx` includes Tailwind animate-in and transform classes (`data-[side=bottom]:slide-in-from-top-2`) that conflict with Radix Popper inline `translate3d` coordinates during mounting.

7. **Window Control Sandbox Rejection**:
   - `src/components/layout/WindowControlButtons.tsx` calls `window.close()` and lacks native minimize support in Chromium `--app` mode, throwing `DOMException`.

8. **Duplicate Browser Launch on Run**:
   - `run.ps1` line 155 executes `Start-Process` without testing whether an existing browser instance is already attached to the CAT Vision port.

9. **Version Badge Missing from /run**:
   - `src/routes/run.tsx` omits `APP_VERSION_INFO` rendering in its status bar.

10. **Layer Reordering Inversion**:
    - `src/components/vision/workpiece/VisionLayersPanel.tsx` visual index decrement ("Move Up") conflicts with canvas painter z-index ascending logic.

---

## 3. Deliverables

- Detailed 4-part RCA document authored in `02-spec/21-app/05-pattern-search-and-ui-improvement/02-root-cause-analysis-spec.md`.
- Remediation requirements passed to implementation subtasks Tasks 04–07.
