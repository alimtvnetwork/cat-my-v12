# Canvas draw pass for visible rule shapes (plan 30 step 63)

**Locked at project v3.49.0.** Guards **G-DRAW-01..03**.

## Scope

Formalize the paint pipeline behind `CanvasViewport` so selection halos, hover styles, marquee, and the 200-rule/16 ms perf budget all share one code path. Single entry point `renderFrame(ctx, state)` in `src/lib/editor/render/frame.ts`.

## Pipeline (fixed order, top-down)

1. **Clear** — `ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(...)` sized to canvas backing store.
2. **World transform** — apply `Viewport` via `ctx.translate(panX,panY); ctx.scale(zoom,zoom)`. All following draws use image coords.
3. **Reference image** — draw once if present, else skip. No filters.
4. **Cull** — compute visible image-rect via `screenToImage` corners; iterate rules and skip those whose AABB does not intersect. Culling is required, not optional, once rule count > 50.
5. **Rules** — for each visible rule call `drawRule(ctx, rule, style)`; `style` derived from `state.hoverId`, `state.selection`, and rule kind. Strokes use `--ca-*` tokens read once at frame start (no `getComputedStyle` per shape).
6. **Selection halos** — 2 px `--ca-select` outer stroke, drawn after all fills so it always sits on top; multi-select draws each halo separately (no union path in v1).
7. **Marquee** — if `state.marquee`, draw dashed 1 px `--ca-select` rect in screen space (reset transform first, restore after).
8. **Overlay chrome** — nothing in v1; slot exists for future rulers.

## Public API

- `renderFrame(ctx: CanvasRenderingContext2D, state: RenderState): void` — the ONLY function `CanvasViewport` calls in its `requestAnimationFrame` loop.
- `type RenderState` — `{ dpr, canvasSize, viewport, rules, selection, hoverId, marquee?, referenceImage? }`. Assembled by a memoized selector; `renderFrame` reads only from it.
- `drawRule(ctx, rule, style)` and per-kind `drawRoi/drawText/drawMath/...` are internal; not exported.

## Invariants

- No allocations inside the visible-rule loop except one `Path2D` per rule if kind requires it. No `Array.map` or spread in hot path.
- Style lookups keyed by an enum, resolved to token strings once per frame.
- Frame budget: 200 rules paint in ≤ 16 ms p95 on the perf runner (spec 24 §08 T-3).
- `renderFrame` is pure w.r.t. store: no `set(...)`, no dispatch. Reads only.

## Delta guards

- **G-DRAW-01** — `rg -n "\.beginPath\(|\.stroke\(|\.fill\(" src/components/editor` returns zero hits; all canvas draws live under `src/lib/editor/render/`.
- **G-DRAW-02** — `CanvasViewport` has exactly one `requestAnimationFrame` loop and one call to `renderFrame` per frame.
- **G-DRAW-03** — style tokens are read once per frame via `readStyleTokens(canvasEl)` and cached in the `RenderState`; no `getComputedStyle` inside `drawRule` or per-kind draws.

## Logging

- No log lines emitted from the draw pass itself (would blow the rate cap). `I_UI_CANVAS_READY` stays at first successful frame only.
