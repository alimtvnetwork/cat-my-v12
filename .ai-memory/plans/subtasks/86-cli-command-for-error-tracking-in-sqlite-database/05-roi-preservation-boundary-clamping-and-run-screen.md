# Subtask 05: ROI Preservation, Boundary Clamping & Run Screen

## Status: Completed

## Implemented
1. In `VisualToolWorkpieceCanvas.tsx`:
   - Clamped `roi.x`, `roi.y`, `roi.width`, and `roi.height` strictly to `naturalW` and `naturalH`.
   - Removed `needsSquare` forced effect (line 1559).
   - Allowed dragging ROI from anywhere inside body when not clicking pattern boxes (`isInsideHeader || isInsideRoi`).
2. In `src/lib/vision/pinned-pattern-geometry.ts`:
   - Removed aggressive auto-squaring so rectangular ROIs are preserved.
