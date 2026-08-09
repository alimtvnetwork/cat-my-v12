# Plan 79 Step 34 closeout: SelectionOverlay parity

Changes in `src/components/editor/canvas/SelectionOverlay.tsx`:

- Resize handle visual pip 12px -> 8px (`h-2 w-2`); hit target unchanged
  at 24px so WCAG 2.5.5 keeps clearing.
- Explicit z-order: resize handles `z-50`, rotate handle `z-40`, θ badge
  (live + persistent) `z-30`. Handles now render above rotation UI which
  renders above the marquee, per v4 spec.
- Replaced hardcoded `bg-[var(--ca-select,#8b5cf6)]` on the resize pip
  and the rotate pip with the token class `bg-ca-select`.

Verification: tsgo clean.
