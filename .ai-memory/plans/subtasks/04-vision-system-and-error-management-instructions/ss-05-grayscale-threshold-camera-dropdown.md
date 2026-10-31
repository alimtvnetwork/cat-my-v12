# Subtask 05: Grayscale Binary Thresholding & Camera Dropdown Remediation
# File: .ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/ss-05-grayscale-threshold-camera-dropdown.md
# Status: COMPLETED

## Objectives
1. Enhance Grayscale preprocessing pipeline in vision analysis:
   - Provide contrast stretch (darker darks, whiter whites).
   - Implement binary bit reduction mode to convert continuous 0–255 pixel levels into a 1-bit high-contrast black/white mask.
   - Surface visual verification of text markings, pins, and fiducial features.
2. Fix Live Camera and Source selection dropdown clipping (`bg2jMNWxHjkn`):
   - Refactor dropdown in `src/components/vision/workpiece/AnalyzeImageToolbar.tsx` to use Radix UI `DropdownMenu` with a Portal (`DropdownMenuPortal`).
   - Eliminate parent container `overflow-hidden` clipping so the dropdown floats cleanly above the canvas container with `z-[9999]`.

## Deliverables
- `src/components/vision/workpiece/AnalyzeImageToolbar.tsx`
- `src/utils/image/grayscale-filter.ts`
- `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
