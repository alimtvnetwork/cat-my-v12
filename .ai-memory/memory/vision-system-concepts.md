# Vision System Concepts

Status: Active
Created: 2026-08-13

## Core Concepts & Terminology

- **Device vs Circuit**: We are inspecting "devices", not "circuits".
- **Dynamic Camera Settings**: There is no universal "camera setting". Every rule or recipe segment has its own camera settings (lighting, exposure, brightness, focus). These can change per run and per segment.
- **Grayscaling**: Images (e.g., 10-bit shades) are often reduced to 2-bit (pure black and white) for matching. Users must be able to select the color region (e.g., "white") to be used for the pattern.
- **Trigger Mode**:
  - **Internal**: The vision system operates standalone, logging results to internal folders.
  - **External**: Driven by a handler/PLC. The handler tells the vision system when to trigger image acquisition. The vision system returns the result over the PLC link with millisecond timing control (to accommodate handler speed).
- **Region of Interest (ROI) / Search Region**: The area of the image where the search occurs. It must be larger than the exact pattern to accommodate mechanical tolerance/shifting during high-speed runs. If the ROI is too tight, it will cause false rejections.
- **Masking**: Inside an ROI, users can draw a mask over specific noisy areas to tell the system to ignore them during the search.

## Validation Tools

1. **Pattern Search**: Looks for a specific defined pattern inside the ROI. E.g., "Pin 1 configuration" is a pattern search used to locate the starting pin of a device. If the pattern is **NOT** found, the validation **FAILS**.
2. **Defect / Scratch Management (Absent Feature)**: The inverse of pattern search. Uses similar grayscaling/matching techniques to find known defects (like scratches or marks). If the defect pattern **IS** found, the validation **FAILS**.
3. **Edge Width / Edge Pitch**: An algorithm used to check the consistency of pin widths on a device.

## Inspection Types Priority

1. Seal inspection
2. Crack inspection
3. Surface defect
4. Leak inspection
5. Mark inspection

## Future AI Enhancements

- **False Rejection Recovery**: If a device fails due to incorrect placement (e.g., rotated), an AI layer can try rotating the rejected image and re-evaluating the rules to prevent false rejections.
