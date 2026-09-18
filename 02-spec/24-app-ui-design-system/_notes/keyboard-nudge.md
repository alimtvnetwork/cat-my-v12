# Keyboard nudge for selected rules (plan 30 step 70)

**Status:** locked as spec boundary at project v3.53.0.
**Owner module:** `src/lib/editor/keyboard/nudge.ts` + `src/lib/editor/store` reducer.

## Root cause for locking now

Halos and marquee land visible + bulk selection. Keyboard nudge is the last input primitive before structural rule-layer operations (71-73). Without one nudge module the accessibility acceptance suite (spec 24 §08, keyboard-only) has no target and mouse-only micro-adjustments become the only option.

## Contract

- Bindings (only when canvas has focus AND selection is non-empty):
  - `ArrowLeft/Right/Up/Down` -> translate selected rules by 1 image px.
  - `Shift + Arrow` -> 10 image px.
  - `Alt + Arrow` -> 0.1 image px (sub-pixel, for anchor-family precision).
- Rectangle-family: translates the AABB, clamped to image bounds (rule cannot leave image; if clamp would resize it, translation is refused with `W_UI_NUDGE_CLAMPED`).
- Anchor-family: translates the anchor point, clamped to image bounds.
- Locked or hidden rules in the selection set are skipped silently.
- `Escape` clears selection (already owned by selection reducer, referenced for completeness).
- One undo entry per gesture, where a gesture = consecutive nudges with < 400 ms between keydowns (coalesced through the existing undo boundary from step 12).

## Delta guards

- **G-NUDGE-01:** `rg 'onKeyDown' src/components/editor` returns exactly one match in `CanvasViewport` that delegates to `handleNudgeKey(e, ctx)`.
- **G-NUDGE-02:** `handleNudgeKey` is the sole caller of the nudge reducer action; no component computes deltas.
- **G-NUDGE-03:** Coalescing timer lives in the store commit boundary, not in the component.

## Log surface

- One `I_UI_RULES_NUDGED { ruleIds, dx, dy, source: 'keyboard', correlationId }` per committed gesture.
- One `W_UI_NUDGE_CLAMPED { ruleId, axis, correlationId }` per rule that hit an image boundary (rate-capped 5/sec).

## Unblocks

- Accessibility acceptance suite for canvas.
- Steps 71-73 rule-layer structural operations (nudge is the last non-structural mutation surface).
