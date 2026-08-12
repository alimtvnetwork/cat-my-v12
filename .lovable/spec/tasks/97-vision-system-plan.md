# Vision System Refactoring & Planning

## Intent
Implement the structural and UI changes necessary for the Vision System based on the 11-Aug session transcript and reference pictures. This involves renaming legacy image assets to descriptive names, implementing dynamic camera settings per recipe segment, providing support for masking/ROI adjustments, and laying the groundwork for Internal vs. External trigger modes.

## Scope
- Renaming all images in `assets/vision-system-pictures-11Aug` to descriptive names.
- Extracting and storing core vision system terminology in `.lovable/memory/vision-system-concepts.md`.
- Updating the UI to allow dynamic camera settings (lighting, exposure, focus) bound to specific recipe segments (not globally).
- Scaffolding the UI for "Trigger Modes" (Internal vs External).
- Adding UI components for "Region of Interest" (ROI) expansion and "Masking".

## Inputs
- 11-Aug transcript (vision system focus)
- Reference pictures in `assets/vision-system-pictures-11Aug`

## Acceptance Criteria
- All 21 images are accurately renamed.
- The `vision-system-concepts.md` memory file exists and covers the device testing, trigger modes, grayscaling, and ROI.
- UI elements for camera settings are correctly decoupled from the global scope and attached to recipe segments.
- The 200-step implementation plan is fully defined and added to the pending backlog.

## Affected Files
- `assets/vision-system-pictures-11Aug/*`
- `.lovable/memory/vision-system-concepts.md`
- `src/components/vision/*`
- `src/lib/vision/*`
- `.lovable/plans/pending/97-vision-system-plan.md`

## Links
- Memory: [.lovable/memory/vision-system-concepts.md](file:///d:/work/cat-my/.lovable/memory/vision-system-concepts.md)

## Attachments
- `20260811_142436.jpg` -> `ic-chip-blurry.jpg`: Reference for a blurry IC chip that needs inspection.
- `20260811_142452.jpg` -> `ic-chip-clear.jpg`: Reference for a clear IC chip baseline.
- `20260811_142540.jpg` -> `smd-component-black.jpg`: Reference for an SMD component.
- `20260811_142827.jpg` -> `pcb-jp103-5.jpg`: Reference for PCB JP103-5 top view.
- `20260811_142840.jpg` -> `pcb-jp103-5-angle2.jpg`: Reference for PCB JP103-5 angled view.
- `20260811_142841.jpg` -> `pcb-jp103-5-angle3.jpg`: Reference for PCB JP103-5 side view.
- `20260811_145638.jpg` -> `ui-setup-general-preferences.jpg`: Reference for general setup preferences UI.
- `20260811_145819.jpg` -> `ui-lead-definition.jpg`: Reference for lead definition and irregular components UI.
- `20260811_150226.jpg` -> `hand-holding-small-component.jpg`: Real-world scale reference for component handling.
- `20260811_150229.jpg` -> `fingers-holding-ic-chip.jpg`: Real-world scale reference for IC chip handling.
- `20260811_151030.jpg` -> `vision-inspection-tesla-chip.jpg`: Reference for Tesla chip marking and inspection.
- `20260811_152014.jpg` -> `vision-inspection-grid-roi.jpg`: Reference for setting up an inspection grid / ROI.
- `20260811_152017.jpg` -> `vision-inspection-grid-roi-2.jpg`: Alternative view for inspection grid / ROI.
- `20260811_152134.jpg` -> `vision-inspection-illumination-settings.jpg`: Reference for the illumination/lighting configuration UI.
- `20260811_152314.jpg` -> `vision-inspection-scratch-settings.jpg`: Reference for scratch/defect detection settings UI.
- `20260811_153137.jpg` -> `ui-shapetrax3-detection.jpg`: Reference for the ShapeTrax3 pattern detection UI.
- `20260811_153237.jpg` -> `ui-feature-extraction-conditions.jpg`: Reference for feature extraction conditions UI.
- `20260811_154009.jpg` -> `ui-inspection-region-rectangle.jpg`: Reference for defining a rectangular inspection region.
- `20260811_154011.jpg` -> `ui-inspection-region-rectangle-2.jpg`: Additional reference for defining an inspection region.
- `20260811_154211.jpg` -> `ui-tool-catalog-function-list.jpg`: Reference for the available vision tool catalog / function list.
- `20260811_154217.jpg` -> `ui-tool-catalog-function-list-2.jpg`: Reference for additional vision tool catalog items.
