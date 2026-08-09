# Properties panel: 4 improvement directions

## Context

> Suggest me four ways to improve this UI, stupid

## Evidence

- `../ui/63-properties-panel-current.png` — current state (huge title, dot-text status row, big "Bounds" band, nested "More options → MASK/FOCUS/RECT OPTIONS")

## Proposals

- `../ui-suggestions/05-properties-panel-v1.png` — **V1 Identity strip merged**: title + #id + order + kind + eye/lock collapse into one 32px row; status pills become one line with inline "+ Add condition"; Bounds keeps a lightweight uppercase label instead of a full band.
- `../ui-suggestions/05-properties-panel-v2.png` — **V2 Sticky header + section tabs**: replaces nested accordions ("More options → MASK/FOCUS/RECT OPTIONS") with a top tab strip (Bounds · Acceptance · Mask · Focus · Options), each tab shows its own count/badge. Kills 3 levels of nesting.
- `../ui-suggestions/05-properties-panel-v3.png` — **V3 Status-colored cards**: each section is a card with a colored left stripe reflecting health (green Bounds, amber Acceptance). Verdict is implicit from the stripe colors, no dedicated verdict bar needed.
- `../ui-suggestions/05-properties-panel-v4.png` — **V4 Two-column dense inspector**: 80px label column + values column, Figma-style. Every section is one row, no chevrons, no collapse chrome. Highest density.

## Recommendation

V2 for discoverability (tabs surface Mask/Focus/Options counts without expanding), or V3 for at-a-glance health. V4 wins on density if you don't need collapse.
