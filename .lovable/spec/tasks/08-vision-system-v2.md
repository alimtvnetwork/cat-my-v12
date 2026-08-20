# Vision System V2 Implementation Spec

## Intent

To implement the updated vision system requirements based on the architectural pivot discussed on August 11, 2026. The new system supports dynamic camera settings per rule segment, pattern searching (including Color specific and Black & White), Trigger modes (External vs Internal), grayscaling/masking, and scratch/defect management.

## Scope

- Implement camera settings (lighting, exposure, brightness control, focus) dynamically changing per rule segment.
- Implement Pattern Search algorithm components (Color specific, B&W, 10-bit to 2-bit reduction).
- Implement External vs Internal Trigger modes (PLC handler signaling vs Vision self-signaling) for log management.
- Implement Masking functionality (removing areas from the region of interest).
- Implement Defect/Scratch management (inverted pattern search where finding the defect marks it as failed).
- Implement Pin 1 Configuration (finding the starting point via pattern match with loose tolerance).

## Inputs

- `03-vision-system-change-of-direction.md`
- Images in `assets/vision-system-pictures-11Aug/`

## Acceptance Criteria

- Dynamic camera settings apply properly when rules evaluate.
- Trigger mode correctly logs to external or internal sources.
- Pattern matching allows 10-bit to 2-bit grayscale reduction.
- Masking correctly excludes pixels from ROI.
- Defect management correctly flags a failure when a defect pattern is found.
- Pin 1 search works as an initial anchor point for orientation.

## Affected Files

- `src/vision/CameraSettings.ts`
- `src/vision/RuleEvaluator.ts`
- `src/vision/TriggerManager.ts`
- `src/vision/algorithms/PatternSearch.ts`
- `src/vision/algorithms/DefectManagement.ts`
- `src/vision/algorithms/Masking.ts`
- `src/vision/Logger.ts`

## Attachments

- `fingers-holding-ic-chip.jpg`: Reference for IC chip inspection.
- `ui-feature-extraction-conditions.jpg`: UI reference for feature extraction settings.
- `ui-inspection-region-rectangle-2.jpg`: UI reference for region of interest setup.
- `ui-setup-general-preferences.jpg`: UI reference for camera and general preferences.
- `ui-shapetrax3-detection.jpg`: UI reference for ShapeTrax3 pattern matching algorithm.
- `ui-tool-catalog-function-list.jpg`: UI reference for tool catalog options.
- `vision-inspection-grid-roi.jpg`: Reference for grid-based region of interest.
- `vision-inspection-illumination-settings.jpg`: Reference for dynamic illumination settings per rule.
- `vision-inspection-scratch-settings.jpg`: Reference for defect/scratch finding settings.
- `vision-inspection-tesla-chip.jpg`: Reference image for device inspection (Tesla chip).
