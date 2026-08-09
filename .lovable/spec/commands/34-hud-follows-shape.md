# HUD-Follows-Shape Policy

Scope: the floating quick-properties HUD in the ROI editor
(`src/components/editor/canvas/SelectionOverlay.tsx`). Fixes issue I-33:
while a shape is being moved, resized, or rotated, the HUD currently stays
anchored to the original position, leaving the operator to chase it.
Reference: `spec/21-app/53-ui-improvements-v4-assets/plan82/upload-71.png`
shows the desired co-located HUD; `upload-74.png` shows the current stale
anchor.

## Root cause statement (single sentence)

`SelectionOverlay` positions the HUD from the shape bounds at mount time
and again only when selection changes, so mid-drag transforms never
update the HUD offset.

## The three modes

A user setting selects one of three modes. The setting lives on
`useUiPrefsStore` as `hudFollowMode: "follow" | "anchor" | "manual"` with
`follow` as the default.

1. `follow` (default): every animation frame during a drag / resize /
   rotate, the HUD position is recomputed from the shape's current
   axis-aligned bounding box. Uses `requestAnimationFrame`, not per-event
   layout, so scroll and zoom stay smooth.
2. `anchor`: HUD is placed once at selection time and stays put until
   selection changes. Matches today's behaviour. Kept for operators who
   dislike moving overlays.
3. `manual`: HUD respects the per-project persisted position from
   v3.628.0 (`hud-position:v1:<scope>`). Drag-to-reposition is enabled;
   double-click on the header still resets.

## Placement algorithm (`follow` mode)

`computeHudPlacement(shapeAabb, hudSize, viewport)` returns `{ x, y }`:

1. Preferred anchor: top-right corner of the shape's AABB, offset
   `+8px` right and `-hudSize.height` up.
2. If that would clip the right edge of the viewport, flip to top-left:
   `x = aabb.left - hudSize.width - 8`.
3. If both horizontals clip (very narrow viewport), pin to the shape's
   top-center and float `+8px` below the shape instead.
4. Clamp `y` inside `[8, viewport.height - hudSize.height - 8]`.
5. Rotated shapes: use the AABB of the rotated polygon, not the raw
   pre-rotation bounds. `src/lib/editor/rotation.ts` already exports
   `rotatedAabb(rect, theta)`; reuse it.

## Settings surface

Under Settings > Editor > Overlays, add a radiogroup with the three
options and a preview thumbnail per mode. Label copy: "HUD follows shape
/ Fixed anchor / Manual position". The chosen mode persists to
`ui-prefs:v1` and applies immediately without reload.

## Keyboard override

`Alt+H` inside the editor cycles modes: follow -> anchor -> manual ->
follow. This overrides the setting for the current session only; the
persisted value is not changed. Rationale: quick toggle for a single
task without editing settings.

## Non-goals

- No physics or spring animation; placement is instantaneous each
  frame. Rationale: operators need precision, not fluidity.
- No multi-HUD (one HUD per selection; multi-select is out of scope,
  see command 33).
- No auto-hide while dragging; the HUD stays visible so parameters can
  be read live. Operators asked for this in the current-round message.

## Ratchet

`src/components/editor/canvas/__tests__/hud-follow.test.tsx` seeds a
shape at `{x:100,y:100,w:200,h:100}`, simulates a drag to `{x:400,y:200}`
in each mode, and asserts:

- `follow`: HUD position moved by (+300, +100) offset.
- `anchor`: HUD position unchanged.
- `manual`: HUD position equals the value in `hud-position:v1:<scope>`.

## When it applies

Phase E of Plan 100 (step 46). No new selection-driven overlay may ship
after Phase E that ignores `hudFollowMode`.
