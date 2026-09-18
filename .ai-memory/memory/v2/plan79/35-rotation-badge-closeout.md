# Plan 79 Step 35 closeout: rotation θ badge anchored above handle

Date: 2026-07-23
Status: completed (sub-step within pending plan 79)

## What shipped

`SelectionOverlay.tsx`: the persistent θ pill that used to sit in the
top-left numeric readout stack now renders above the primary rotate
handle (same anchor as the live drag chip). The badge is hidden at 0°,
shown when `theta !== 0` at rest, and replaced by the live `data-testid`
`rule-rotate-live-badge` while `isRotating`. Same visual token (13px
tabular-nums, popover chrome) so hover/drag reads as one control.

## Why

Spec Step 35 asks for a single θ badge above the rotate handle covering
both "while rotating" and "angle != 0" states. Keeping the pill in the
X/Y row duplicated the readout and hid the relationship between the
handle and the current angle.

## Test evidence

`tests/unit/selection-overlay-badges.test.tsx` (5/5)
`tests/unit/selection-overlay-rotate.test.tsx` (11/11) both green.
Existing testids preserved: `rule-rotation-badge`,
`rule-rotate-live-badge`.

## Plan status

Plan 79 still has 47 sub-steps outstanding. Pending file untouched.
No release.
