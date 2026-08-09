# 13 - Layers panel left gutter gap

## Context

FIX this padding gap

## Evidence

- [13-layers-panel-left-gutter-gap.png](./13-layers-panel-left-gutter-gap.png) - Layers panel with a red rectangle marking a wide empty column on the left of rule rows; rows sit ~30px right of the `RULES` / `CATEGORIES` section headers.

## Resolution (v3.970.0)

- `.editor-rule-row` padding-left: 12px -> 6px so rows align with section headers.
- Drag handle idles as a 6px hairline (35% opacity), expands to 16px on hover / focus / selection.
- Selection accent stripe repositioned from `left:4px` to `left:1px`.
