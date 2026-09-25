---
name: standard-mode-grayscale-ui
description: Frontend architecture, Standard Mode grayscale styling, inspection tool dispatching, and UI components for the factory-floor HMI.
---

# Standard Mode Grayscale UI & Tool Architecture

## Overview
Guides the creation, modification, and maintenance of the factory-floor operator and engineer interface in Standard Mode, utilizing high-contrast grayscale design tokens, responsive panel layout, and dedicated tool dispatchers.

## 1. Core Shell Architecture
- **`StandardAppShell.tsx`** (`src/components/layout/StandardAppShell.tsx`): Top-level layout container managing header readouts, navigation tabs, flavor toggle, and responsive work area.
- **`StandardToolShell.tsx`** (`src/components/vision/standard/StandardToolShell.tsx`): Encapsulates individual inspection tool views, providing tool title bars, canvas overlays, and action footers.
- **`StandardInspectionToolDispatcher.tsx`** (`src/components/vision/standard/tools/StandardInspectionToolDispatcher.tsx`): Central polymorphic router rendering the appropriate tool view based on `toolType` or `ruleName`.

## 2. Standard Inspection Tools Suite
The system supports dedicated tool components located in `src/components/vision/standard/tools/`:
1. **`StandardGreyscalePatternMatchingTool.tsx`**: 2-bit grayscale constellation pattern matching (31-box constellation template).
2. **`StandardPatternSearch.tsx`**: Normalized cross-correlation template search with search/pattern region overlays.
3. **`StandardAreaTool.tsx`**: White/black area measurement within specified inspection regions.
4. **`StandardBlobTool.tsx`** & **`StandardGrayscaleBlobTool.tsx`**: Connected component analysis and grayscale blob classification.
5. **`StandardEdgePositionTool.tsx`**, **`StandardEdgeWidthTool.tsx`**, **`StandardEdgePitchTool.tsx`**, **`StandardEdgePairsTool.tsx`**: Sub-pixel edge detection and pitch caliper tools.
6. **`StandardProfilePositionTool.tsx`** & **`StandardProfileWidthTool.tsx`**: 1D projection profile scanning.
7. **`StandardDefectTool.tsx`**: Flaw and scratch detection.
8. **`StandardIntensityTool.tsx`**: Mean, min, max luminescence histogram inspection.
9. **`StandardOcr2Tool.tsx`** & **`StandardCodeReaderTool.tsx`**: Industrial optical character recognition and 1D/2D barcode decoding (DataMatrix, QR).
10. **`StandardShapeTrax3Tool.tsx`**: Geometric contour and feature tracking.

## 3. Tool Tabs Structure
Every inspection tool shell is composed of standardized tab controllers under `src/components/vision/standard/tabs/`:
- `InspectionRegionTab.tsx`: Bounding box and ROI positioning (`X`, `Y`, `Width`, `Height`, angle).
- `PatternRegionTab.tsx`: Reference template coordinate definition and training mask.
- `DetectionConditionsTab.tsx`: Thresholds, polarity (dark-to-light / light-to-dark), edge contrast, and algorithm sensitivity.
- `JudgmentConditionsTab.tsx`: Upper/lower tolerance limits, OK/NG evaluation thresholds.
- `ImageEnhanceTab.tsx`: Spatial filtering (smoothing, sharpening, median, morphological dilation/erosion).
- `DisplaySettingsTab.tsx`: Overlay visibility, bounding box colors, and result metrics.

## 4. Grayscale Tokens & Design System
- High-contrast grayscale tokens in `src/styles.css` (`--ca-neutral-*`, `--hmi-*`).
- Buttons must have high visual contrast against dark backgrounds; avoid faded action/cancel button styling.
- Panel resizers must maintain fluid drag behavior with minimum width constraints (`react-resizable-panels`).

## 5. Single Seam Write Gate & Data Flow
- **Single Seam Rule**: All mutating actions must pass through `runBackendWrite` (`src/lib/data-source/gate.ts`).
  ```typescript
  const result = await runBackendWrite(
    () => saveRuleToBackend(ruleParams),
    {
      seedResult: simulatedRule,
      label: "Save Inspection Rule",
    }
  );
  ```
- In Seed mode, writes are safely skipped with informational telemetry (`ClientLogger`).
- In Backend mode, live HTTP requests are sent to FastAPI (`:8787`).
