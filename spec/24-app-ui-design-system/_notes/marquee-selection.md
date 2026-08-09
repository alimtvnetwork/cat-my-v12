# Marquee selection (plan 30 step 69)

**Status:** locked as spec boundary at project v3.52.0.
**Owner modules:** `src/lib/editor/tools/marquee-tool.ts` (gesture), `src/lib/editor/hit-test.ts` (`marqueeHit`).

## Root cause for locking now

Single-hit selection is in place; bulk edit currently requires the right-rail only. Marquee is the last selection primitive before keyboard nudge (70) and rule-layer operations (71-73). Locking the boundary now prevents duplicating pointer wiring in a component.

## Contract

- Marquee gesture activates when: no tool active OR active tool is `select` AND pointerdown misses every visible unlocked rule (`hitTest` returns `null`).
- Gesture state lives in `state.pendingMarquee = { originImage, currentImage } | null`. Rendered in screen space by `renderFrame` (transform reset/restore) with 1px dashed `--ca-select` stroke, 6% fill.
- Modifiers on `commitMarqueeGesture`:
  - No modifier: selection = hit set.
  - `Shift`: selection = prev ∪ hit set.
  - `Alt`: selection = prev \ hit set.
  - `Ctrl/Cmd`: selection = symmetric difference.
- Hit rule: a rule is in the hit set iff its **image-space AABB is fully inside** the marquee AABB (contains, not intersects) AND rule is visible AND not locked. Fully-inside matches Figma/Illustrator and avoids accidental large-rule capture.
- `marqueeHit(image, rules, marqueeAABB)` in `hit-test.ts` returns `string[]` (ordered by z, top first). Anchor-family rules use their anchor point + 8px CSS radius as the AABB.
- Empty commit (no rules matched) still clears prior selection unless `Shift/Alt/Ctrl` was held.
- Escape or pointercancel: `cancelMarqueeGesture(state)` — pure discard, no selection change.

## Delta guards

- **G-MARQ-01:** Only `marquee-tool.ts` writes `state.pendingMarquee`.
- **G-MARQ-02:** `marqueeHit` is the sole multi-hit helper (`rg 'AABB|inside' src/components/editor` returns zero).
- **G-MARQ-03:** Marquee is drawn in screen space (`ctx.setTransform(dpr,0,0,dpr,0,0)` before stroke, restore after) so line width does not scale with zoom.

## Log surface

- One `I_UI_SELECTION_CHANGED { ruleIds, source: 'marquee', matched, correlationId }` per committed gesture.
- One `I_UI_TOOL_GESTURE_END { tool: 'marquee', durationMs, moved, correlationId }` on release.
- No per-frame logs.

## Performance

`marqueeHit` is O(visible rules). Culling from `renderFrame` already computed the visible set; reuse it. 200 rules stays well under 1ms per Playwright perf run.

## Unblocks

- Step 70 keyboard nudge (multi-rule move).
- Steps 71-73 rule-layer operations (bulk lock/hide/delete/duplicate).
- Right-rail multi-select sync.
