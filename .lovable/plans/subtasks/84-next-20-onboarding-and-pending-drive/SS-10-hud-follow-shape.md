# SS-10 — Issue 33: HUD follows shape during drag

Version: v3.777.0
Date: 2026-07-19
Parent: `.lovable/plans/pending/84-next-20-onboarding-and-pending-drive.md`
Step: 10 of 20

## Root cause (one sentence)

`SelectionOverlay`'s HUD position derived from absolute canvas coordinates
instead of a shape-relative offset, so it never re-anchored as the
shape's top-left changed during a body drag.

## Status

Already fixed under Plan 83 backlog item 9 (see the "Plan 83 backlog
item 9 (issue #33)" comment at `SelectionOverlay.tsx:1378`). This step
verified the fix rather than re-implementing it.

## Verification

Playwright at `/setup/roi` dragged the selected ROI by (+160, +80) over
20 ticks. HUD bounding box tracked exactly:

- Before: `{x: 159.42, y: 316.56}`
- Mid-drag: `{x: 319.42, y: 396.56}` (delta +160, +80)
- After: `{x: 319.42, y: 396.56}`

No mid-drag lag; HUD updates every pointermove because `tl` recomputes
from live `rule.x/y` on each render and shape-anchor mode adds `hudPos`
to that `tl`. Zero code changes needed to src.

## Deltas

- Issue 33: OPEN → CLOSED. Open issue count 7 → 6 (16, 27, 28, 31, 32, 34).
- Plan 83 backlog item 9: confirmed DONE.
