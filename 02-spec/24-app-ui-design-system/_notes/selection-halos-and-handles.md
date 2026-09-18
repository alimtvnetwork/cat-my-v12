# Selection halos and handles (plan 30 step 68)

**Status:** locked as spec boundary at project v3.52.0.
**Owner module:** `src/lib/editor/render/frame.ts` (draw pass) + `src/lib/editor/selection/style.ts` (state -> style resolver).

## Root cause for locking now

Hit-test resolves pointerdown to a rule id, but every consumer of "selection" (marquee, keyboard nudge, right-rail sync, controller mount) needs one visible contract for the four states: `default`, `hover`, `selected`, `locked/hidden`. Without a locked style resolver, steps 69-77 each grow ad-hoc styling and drift.

## Contract

- `resolveRuleStyle(rule, ctx)` returns a `RuleStyle = { stroke, strokeWidth, fill, halo, handles }`.
  - `ctx = { hoverId, selection: Set<string>, tokens: StyleTokens }`.
  - Pure. No canvas ops. No `getComputedStyle` (tokens pre-read once per frame per canvas-draw-pass.md).
- Halo is a second stroke drawn AFTER all fills for every selected rule, width `2px` (CSS px, divided by `zoom * dpr` at draw time), color `--ca-select`.
- Handles: exactly 8 for rectangle-family (`roi`, `rect`, `presence`, `blob`) — 4 corner + 4 midpoint, 6x6 CSS px squares, `--ca-select` fill, `--ca-canvas-bg` 1px stroke, only when `selection.size === 1` AND rule is rectangle-family AND not `locked`.
- Anchor-family (`ocr`, `text`, `math`) renders a single 8x8 CSS px diamond handle at anchor point when selected.
- `locked` rules render at 60% opacity, no halo, no handles regardless of selection.
- `hidden` rules skip the draw pass entirely (culling in `renderFrame`).
- Hover style: stroke width bumped by 1px, no halo.

## Delta guards

- **G-HALO-01:** `rg 'strokeStyle|fillStyle' src/components/editor` returns zero. Halo/handle canvas ops live only in `src/lib/editor/render/`.
- **G-HALO-02:** `resolveRuleStyle` is called exactly once per visible rule per frame (memoize by `(ruleId, hover, selected, locked, kind)` inside `RenderState` assembly).
- **G-HALO-03:** Handle geometry is derived from image-space rule bounds converted via `imageToScreen`; no separate handle store.

## Log surface

None from the draw pass. Selection changes emit `I_UI_SELECTION_CHANGED { ruleIds, source, correlationId }` from the reducer (already in place at step 67).

## Performance

Halo + handle path stays within the 200-rule / 16ms p95 budget from spec 24 §08 T-3 because halo strokes reuse the same `Path2D` cached per rule in `RenderState`.

## Unblocks

- Step 69 marquee selection (visible selected state during drag).
- Step 70 keyboard nudge (users can see the moved geometry).
- Step 74 controller mount (right-rail selection sync target is visually unambiguous).
