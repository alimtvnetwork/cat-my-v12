---
Slug: tests
Status: pending
Created: 2026-07-16
Parent: 41-keyboard-dnd-and-code-quality-pass
---

# SS-02, keyboard DnD controller tests

Vitest unit suite for src/lib/editor/dnd/keyboard-controller.ts.

## Cases

1. grab() enters KeyboardGrabbed and snapshots origin (x,y).
2. move(ArrowRight) increments x by DndStep.FINE, clamped to
   IMAGE_BOUNDS.
3. move with Shift uses DndStep.COARSE.
4. Home/End jump to axis edges within IMAGE_BOUNDS.
5. cancel() restores origin (x,y) and returns to Idle.
6. drop() commits and returns to Idle.
7. Announcer emits "Grabbed", "Moved x y", "Dropped", "Cancelled" in
   order.

## Non-goals

- Rendering integration (covered by a separate RTL smoke).
- Pointer DnD (already covered by existing tests).
