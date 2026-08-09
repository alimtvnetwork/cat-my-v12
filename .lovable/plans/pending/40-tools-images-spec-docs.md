# Document assets/tools-images/ into spec 24 tools-images/

Slug: tools-images-spec-docs
Steps: 50
Status: pending
Created: 2026-07-16

## Context

User asked for a per-image explainer MD written for an AI reader, describing every portion of each of the 50 screenshots in `assets/tools-images/` (KEYENCE-style vision inspection HMI): layout, colors, text, controls, purpose, expected user actions, and what each button does. Output lives in the spec UI folder at `spec/24-app-ui-design-system/tools-images/` (folder 24 = app UI design system). Command captured at `.lovable/spec/commands/15-tools-images-explainers.md`. No new issues.

One step = one image = one MD file. Each MD file uses the same shape (see `./subtasks/40-tools-images-spec-docs/00-md-template.md`) and must cover: filename + source path, one-line purpose, full-frame layout (regions, panels, ribbons), color palette with role of each color, every visible text string transcribed and grouped by region, every interactive control (buttons, tabs, list rows, dropdowns, sliders, checkboxes) with expected behavior, user expectation / workflow context, adjacent-screen relationships, and AI-consumption notes (what a downstream agent should infer). Also add an `INDEX.md` (covered under step 50's verification, not a separate step).

## Steps

1. Document `01-hmi-main-run-screen-measurement-list.jpg` → `spec/24-app-ui-design-system/tools-images/01-hmi-main-run-screen-measurement-list.md`. See `./subtasks/40-tools-images-spec-docs/00-md-template.md`.
2. Document `02-hmi-add-tools-ribbon-marking-overview.jpg` → `02-hmi-add-tools-ribbon-marking-overview.md`.
3. Document `03-tool-catalog-presence-absence-preferred-tools.jpg` → `03-tool-catalog-presence-absence-preferred-tools.md`.
4. Document `04-tool-catalog-flaw-detection-preferred-tools.jpg` → `04-tool-catalog-flaw-detection-preferred-tools.md`.
5. Document `05-tool-catalog-alignment-preferred-tools.jpg` → `05-tool-catalog-alignment-preferred-tools.md`.
6. Document `06-tool-catalog-count-features.jpg` → `06-tool-catalog-count-features.md`.
7. Document `07-tool-catalog-graphic-display-line-circle-point.jpg` → `07-tool-catalog-graphic-display-line-circle-point.md`.
8. Document `08-tool-catalog-mathematical-operations.jpg` → `08-tool-catalog-mathematical-operations.md`.
9. Document `09-function-list-position-adjustment-edge-tools.jpg` → `09-function-list-position-adjustment-edge-tools.md`.
10. Document `10-function-list-defect-blob-graytype.jpg` → `10-function-list-defect-blob-graytype.md`.
11. Document `11-function-list-defect-intensity-color.jpg` → `11-function-list-defect-intensity-color.md`.
12. Document `12-function-list-ocr-and-code-reader.jpg` → `12-function-list-ocr-and-code-reader.md`.
13. Document `13-function-list-ocr2-detail-panel.jpg` → `13-function-list-ocr2-detail-panel.md`.
14. Document `14-preferred-tool-presence-black-white-specific-area.jpg` → `14-preferred-tool-presence-black-white-specific-area.md`.
15. Document `15-preferred-tool-pattern-match-shading.jpg` → `15-preferred-tool-pattern-match-shading.md`.
16. Document `16-function-list-shapetrax3-description.jpg` → `16-function-list-shapetrax3-description.md`.
17. Document `17-function-list-patterntrax-description.jpg` → `17-function-list-patterntrax-description.md`.
18. Document `18-function-list-edge-width-description.jpg` → `18-function-list-edge-width-description.md`.
19. Document `19-function-list-defect-description.jpg` → `19-function-list-defect-description.md`.
20. Document `20-function-list-profile-width-description.jpg` → `20-function-list-profile-width-description.md`.
21. Document `21-function-list-ocr2-auto-teach-preferred-a.jpg` → `21-function-list-ocr2-auto-teach-preferred-a.md`.
22. Document `22-function-list-ocr2-auto-teach-preferred-b.jpg` → `22-function-list-ocr2-auto-teach-preferred-b.md`.
23. Document `23-function-list-auto-teach-imp-patterntrax.jpg` → `23-function-list-auto-teach-imp-patterntrax.md`.
24. Document `24-function-list-ocr-shapetrax-tools.jpg` → `24-function-list-ocr-shapetrax-tools.md`.
25. Document `25-function-list-shapetrax2-description.jpg` → `25-function-list-shapetrax2-description.md`.
26. Document `26-output-settings-judgment-total-status.jpg` → `26-output-settings-judgment-total-status.md`.
27. Document `27-output-settings-image-output-sd-card.jpg` → `27-output-settings-image-output-sd-card.md`.
28. Document `28-output-settings-usb-hdd-select-data.jpg` → `28-output-settings-usb-hdd-select-data.md`.
29. Document `29-camera-settings-model-shutter-sensitivity.jpg` → `29-camera-settings-model-shutter-sensitivity.md`.
30. Document `30-trigger-settings-external-internal-signal.jpg` → `30-trigger-settings-external-internal-signal.md`.
31. Document `31-lighting-configuration-flash-output.jpg` → `31-lighting-configuration-flash-output.md`.
32. Document `32-trigger-settings-detail-mode-panel.jpg` → `32-trigger-settings-detail-mode-panel.md`.
33. Document `33-lighting-configuration-camera-panel.jpg` → `33-lighting-configuration-camera-panel.md`.
34. Document `34-shapetrax3-measurement-panel-t100-pin1.jpg` → `34-shapetrax3-measurement-panel-t100-pin1.md`.
35. Document `35-shapetrax3-reference-image-detection-conditions.jpg` → `35-shapetrax3-reference-image-detection-conditions.md`.
36. Document `36-shapetrax3-search-region-yellow-roi.jpg` → `36-shapetrax3-search-region-yellow-roi.md`.
37. Document `37-shapetrax3-search-region-green-roi-mask-config.jpg` → `37-shapetrax3-search-region-green-roi-mask-config.md`.
38. Document `38-shapetrax3-pattern-region-red-roi.jpg` → `38-shapetrax3-pattern-region-red-roi.md`.
39. Document `39-shapetrax3-pattern-region-red-mask-edit.jpg` → `39-shapetrax3-pattern-region-red-mask-edit.md`.
40. Document `40-shapetrax3-reference-image-marking-list.jpg` → `40-shapetrax3-reference-image-marking-list.md`.
41. Document `41-error-list-output-settings-ethernet-ip.jpg` → `41-error-list-output-settings-ethernet-ip.md`.
42. Document `42-reference-image-registration-cam1-crosshair.jpg` → `42-reference-image-registration-cam1-crosshair.md`.
43. Document `43-program-menu-change-save-delete.jpg` → `43-program-menu-change-save-delete.md`.
44. Document `44-system-information-controller-serial-details.jpg` → `44-system-information-controller-serial-details.md`.
45. Document `45-system-license-general-public-license.jpg` → `45-system-license-general-public-license.md`.
46. Document `46-communications-io-system-settings-menu.jpg` → `46-communications-io-system-settings-menu.md`.
47. Document `47-edit-tools-copy-paste-add-cam-menu.jpg` → `47-edit-tools-copy-paste-add-cam-menu.md`.
48. Document `48-execute-condition-settings-tool-list-a.jpg` → `48-execute-condition-settings-tool-list-a.md`.
49. Document `49-execute-condition-settings-tool-list-b.jpg` → `49-execute-condition-settings-tool-list-b.md`.
50. Document `50-utility-menu-batch-test-monitor-settings.jpg` → `50-utility-menu-batch-test-monitor-settings.md`, then write `spec/24-app-ui-design-system/tools-images/INDEX.md` listing all 50 entries with one-line summaries and linking the shared template.

## Verification

- All 50 target MD files exist under `spec/24-app-ui-design-system/tools-images/` and each is at least ~120 lines covering the 10 required sections from the template.
- Every MD begins with frontmatter (`Source:`, `Screen:`, `Related-Spec:`) pointing back to `assets/tools-images/NN-…jpg`.
- `INDEX.md` lists every file in numeric order with a one-line purpose.
- No image left undocumented: `ls assets/tools-images | wc -l` equals count of `.md` files in `tools-images/` minus 1 (the INDEX).
- `spec/99-consistency-report.md` gets a short entry noting the new sub-folder (added in the same execution turn as step 50).

## Appended from prior pending tasks

None pulled in — existing pending plans (29, 32, 33, 35–39) are independent tracks and remain in `.lovable/plans/pending/`.
