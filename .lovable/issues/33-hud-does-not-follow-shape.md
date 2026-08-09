# Floating properties HUD does not move with the selected shape

Status: closed
Closed: 2026-07-19 (v3.777.0, Plan 84 Step 10)

## Symptom (historic)

While dragging a shape, the floating properties HUD stayed at its old
canvas position instead of tracking the shape.

## Root cause (one sentence)

`SelectionOverlay`'s HUD position derived from `hudPos` (absolute canvas
coords) instead of a shape-relative offset when the "follow shape"
preference was on, so it never re-anchored as `tl` (shape top-left)
changed during a body drag.

## Fix (already landed under Plan 83 backlog item 9)

`src/components/editor/canvas/SelectionOverlay.tsx`:

- `hudPos.anchor` field encodes `"shape" | "canvas"` (see `useHudPosition`,
  persisted per project scope).
- Line 1382-1385: when anchor is `"shape"`, position = `tl + hudPos`; when
  `"canvas"`, position = `hudPos` verbatim.
- Line 1442-1446: HUD-drag handler writes shape-relative offsets when
  `hudFollowsShape` is on.
- Line 481-490: `useEffect` re-anchors the persisted position when the
  preference flips (canvas <-> shape) without visual jump.
- Line 1466-1489: header toggle `[rule-hud-follow-toggle]` exposes the
  pref inline, with `aria-pressed` and a plain-English tooltip.

Default `hudFollowsShape = true` in `src/lib/ui-prefs-store.ts:220`.

## Verification (Playwright, 2026-07-19)

Route: `/setup/roi` with the seeded ROI "U12 package outline" selected.
Dragged shape body by (+160, +80) screen px over 20 pointer-move ticks.
HUD bounding box:

- Before: `{x: 159.42, y: 316.56}`
- Mid-drag: `{x: 319.42, y: 396.56}` (exact +160, +80)
- After release: `{x: 319.42, y: 396.56}`

Screenshots: `/tmp/browser/step10/{1_initial,2_mid_drag,3_after}.png`.
HUD tracks the shape in real time during the drag, not just after release.

Reference: `spec/21-app/53-ui-improvements-v4-assets/plan82/upload-71.png`,
`upload-73.png`.
