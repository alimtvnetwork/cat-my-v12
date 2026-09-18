---
title: Canvas viewport mount (plan 30 step 61)
slug: canvas-viewport-mount
plan: 30
step: 61
status: shipped
---

# Canvas viewport mount

## Scope

Step 61 mounts the first real editor canvas surface into the shell `children` slot.

## Contract

- `src/components/editor/canvas/CanvasViewport.tsx` owns the only `<canvas>` element in the editor shell body.
- Canvas is DPR-aware, clears each render, draws a stable dark viewport, and paints the rule fixture from `EditorSetupExperience`.
- Mount and repaint emit `I_UI_CANVAS_READY` through the editor log stream with rule count and logical size.
- The right rail drives selected ids into the canvas so the selected rule gets a visible halo color.

## Verification

- Preview DOM contains exactly one `canvas[data-testid="inspection-canvas"]` under `data-testid="editor-canvas-slot"`.
- Status strip left slot updates to `I_UI_CANVAS_READY` after mount.
