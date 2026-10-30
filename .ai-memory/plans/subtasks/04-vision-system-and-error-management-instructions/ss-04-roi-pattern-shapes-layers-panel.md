# Subtask 04: ROI Locking, Multi-Shape Pattern Tooling & Photoshop Layers Panel
# File: .ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/ss-04-roi-pattern-shapes-layers-panel.md
# Status: COMPLETED

## Objectives
1. Implement Region of Interest (ROI) lock mechanics on the vision inspection canvas:
   - ROI box defaults to locked state (`isLocked: true`).
   - Single clicks do not move or resize the ROI box.
   - Double-click unlocks the ROI box, revealing corner resize handles.
   - Pressing `Escape` or clicking outside re-locks the ROI.
2. Implement Multi-Shape Pattern search primitives:
   - Provide Rectangle, Square, and Circle shape buttons with modern icons.
   - Support nested pattern searches inside ROI with sequential numeric tags `[1..N]` (modeled after ICOS inspection image `JA4FdRFDSKi2`).
   - Enable drag, drop, and resize scaling on pattern items.
3. Implement Photoshop-style Layers Panel:
   - Display visual layer hierarchy (Base Image -> Locked ROI -> Pattern Searches).
   - Provide visibility toggle (eye icon) and lock toggle (padlock icon) per layer.
   - Provide right-click context menu: `Bring to Front`, `Send to Back`, `Move Up`, `Move Down`, `Delete`.

## Deliverables
- `src/components/vision/layers/PhotoshopLayersPanel.tsx`
- `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
- `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`
- `src/lib/vision/layers-store.ts`
