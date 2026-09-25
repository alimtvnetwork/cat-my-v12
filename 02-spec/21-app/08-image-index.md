---
title: Image Index — Vision Inspection App
slug: image-index
source: assets/tools-images/
---

# Image Index (01–50)

Maps every renumbered reference image in `assets/tools-images/` to the UI feature it grounds. Cross-refs to Plan 04 UI steps (30–39) noted where fixed.

## Live Run & Overview (main HMI)

- `01-hmi-main-run-screen-measurement-list.jpg` — Run Monitor baseline → Step 37.
- `02-hmi-add-tools-ribbon-marking-overview.jpg` — Tool ribbon layout → Step 26.

## Tool Catalog (Rule types)

- `03-tool-catalog-presence-absence-preferred-tools.jpg` — Presence/Absence → Step 29.
- `04-tool-catalog-flaw-detection-preferred-tools.jpg` — Flaw → Step 29.
- `05-tool-catalog-alignment-preferred-tools.jpg` — Alignment → Step 29.
- `06-tool-catalog-count-features.jpg` — Count → Step 29.
- `07-tool-catalog-graphic-display-line-circle-point.jpg` — Graphic display → Step 29.
- `08-tool-catalog-mathematical-operations.jpg` — Math ops → Step 29.

## Function List (Tool detail panels)

- `09-function-list-position-adjustment-edge-tools.jpg` — Position adjust / edge → Step 29.
- `10-function-list-defect-blob-graytype.jpg` — Defect (blob/gray) → Step 29.
- `11-function-list-defect-intensity-color.jpg` — Defect (intensity/color) → Step 29.
- `12-function-list-ocr-and-code-reader.jpg` — OCR + code reader → Step 29.
- `13-function-list-ocr2-detail-panel.jpg` — OCR2 detail → Step 29.
- `14-preferred-tool-presence-black-white-specific-area.jpg` — Presence in area → Step 29.
- `15-preferred-tool-pattern-match-shading.jpg` — Pattern match → Step 29.
- `16-function-list-shapetrax3-description.jpg` — ShapeTrax3 (headline detector) → Steps 26, 29.
- `17-function-list-patterntrax-description.jpg` — PatternTrax → Step 29.
- `18-function-list-edge-width-description.jpg` — Edge width → Step 29.
- `19-function-list-defect-description.jpg` — Defect description → Step 29.
- `20-function-list-profile-width-description.jpg` — Profile width → Step 29.
- `21-function-list-ocr2-auto-teach-preferred-a.jpg` — OCR2 auto-teach A → Step 29.
- `22-function-list-ocr2-auto-teach-preferred-b.jpg` — OCR2 auto-teach B → Step 29.
- `23-function-list-auto-teach-imp-patterntrax.jpg` — Auto-teach flow → Step 29.
- `24-function-list-ocr-shapetrax-tools.jpg` — Rule catalog reference (called out in source) → Step 29.
- `25-function-list-shapetrax2-description.jpg` — Rule catalog reference (called out in source) → Step 29.

## Output & Storage

- `26-output-settings-judgment-total-status.jpg` — Judgment output → Step 34.
- `27-output-settings-image-output-sd-card.jpg` — Image output SD → Step 39.
- `28-output-settings-usb-hdd-select-data.jpg` — USB/HDD output → Step 39.

## Device Setup

- `29-camera-settings-model-shutter-sensitivity.jpg` — Camera settings → Step 39.
- `30-trigger-settings-external-internal-signal.jpg` — Trigger → Step 39.
- `31-lighting-configuration-flash-output.jpg` — Lighting → Step 39.
- `32-trigger-settings-detail-mode-panel.jpg` — Trigger detail → Step 39.
- `33-lighting-configuration-camera-panel.jpg` — Lighting per-camera → Step 39.

## Rule Setup — ShapeTrax3 (canonical Rule Setup screen)

- `34-shapetrax3-measurement-panel-t100-pin1.jpg` — Measurement panel (source calls out) → Step 26.
- `35-shapetrax3-reference-image-detection-conditions.jpg` — Reference image + conditions (source calls out) → Steps 26, 30.
- `36-shapetrax3-search-region-yellow-roi.jpg` — Search ROI (source calls out) → Steps 26, 27.
- `37-shapetrax3-search-region-green-roi-mask-config.jpg` — Mask config → Steps 27, 32.
- `38-shapetrax3-pattern-region-red-roi.jpg` — Pattern ROI → Step 27.
- `39-shapetrax3-pattern-region-red-mask-edit.jpg` — Pattern mask edit → Step 27.
- `40-shapetrax3-reference-image-marking-list.jpg` — Marking list → Step 26.

## System / Admin

- `41-error-list-output-settings-ethernet-ip.jpg` — Error list + comms → Steps 37, 40.
- `42-reference-image-registration-cam1-crosshair.jpg` — Reference registration → Step 26.
- `43-program-menu-change-save-delete.jpg` — Program (Task) menu → Step 25.
- `44-system-information-controller-serial-details.jpg` — System info → Step 39.
- `45-system-license-general-public-license.jpg` — License → Step 39.
- `46-communications-io-system-settings-menu.jpg` — Comms/IO → Step 39.
- `47-edit-tools-copy-paste-add-cam-menu.jpg` — Tool edit menu → Step 26.
- `48-execute-condition-settings-tool-list-a.jpg` — Execute conditions A → Step 29.
- `49-execute-condition-settings-tool-list-b.jpg` — Execute conditions B → Step 29.
- `50-utility-menu-batch-test-monitor-settings.jpg` — Utility menu → Step 39.

## Notes

- Images 34–40 are the primary ground truth for the Rule Setup screen (Steps 26–32).
- Images 03–08 anchor the tool catalog taxonomy for `33-rule-catalog.md` (Step 29).
- Images 26–33 anchor Settings (Step 39) and Output (Step 34).

## Acceptance Checklist

- [ ] Every referenced image slug resolves to a file under `assets/tools-images/`.
- [ ] 4-digit `0001..9999` sequence convention matches memory 09 §Image sequence.
- [ ] No duplicate slug across the corpus (`E_NAME_COLLISION`).
