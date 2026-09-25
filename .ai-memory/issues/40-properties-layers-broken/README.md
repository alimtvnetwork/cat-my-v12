# Issue 40: Properties + Layers panels clip, overlap, and drop content

Status: in-progress (Turn 1 of 7 landed)
Reported: 2026-07-23 (voice + 7 screenshots in `./images/`)

## Symptoms (from user + screenshots)

1. Properties panel horizontally clips content on the right edge as soon as
   the right rail is narrowed. Bounds inputs (X/Y/W/H) get cut mid-field,
   Acceptance controls disappear, Mask upload button pushes off-screen.
2. Mask panel header ("Shape mask (off)") title, upload button, and helper
   copy overlap; state badge and body draw on top of each other.
3. Focus / Acceptance / Bounds cards overlap vertically when compact.
4. Bottom status footer covers the last row of the scroll body.
5. Layers panel: order numbers (1..N) are too small to see at a glance; drag
   drop feedback is not visible; row tooltips overlap child rows.
6. Missing home/settings option to set backend PREFIX URL, and to pick
   camera source (seed / webcam / SDK backend).

## Plan of work (each item = one turn)

1. Properties panel clipping (this turn): responsive Bounds grid, wrapping
   identity row, mask header, panel container queries.
2. Properties/Focus/Acceptance stacking + status-bar clearance.
3. Layers row: bigger order badge, always-visible drag handle, drop
   indicator, tooltip portal fix.
4. Backend base URL setting + Settings screen field.
5. Camera facade source picker (seed / webcam / backend SDK).
6. Vitest width-regression guard + Playwright screenshots at 240/320/420px.
7. Closeout memo + spec cross-links.

## Turn 1 changes

- `src/styles.css`: added a `container-type: inline-size` on
  `.editor-properties-panel`, container-query rules on
  `.editor-properties-bounds` (2x2 grid below 240px, hide `px` suffix
  below 200px), enabled `flex-wrap` + row-gap on
  `.editor-properties-identity-row`, allowed `.editor-mask-panel-head`
  to wrap when the actions row cannot fit next to the title.
- `src/components/editor/PropertiesPanel.tsx`: added `min-w-0` on the
  scroll body wrapper so grid children can actually shrink.

No component API or behavior changes.
