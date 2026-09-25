# Pan and zoom geometry boundary (plan 30 step 62)

**Locked at project v3.49.0.** Guards **G-COORD-01..03**.

## Scope

Move all image-to-canvas math out of the paint path and pointer handlers into a single boundary module `src/lib/editor/coords.ts`. No other file may compute a screen-to-image or image-to-screen transform.

## Public API (only these exports)

- `type Viewport = { panX: number; panY: number; zoom: number }` — image-space pan (px) and uniform zoom.
- `imageToScreen(pt: Vec2, v: Viewport, dpr: number): Vec2` — image coords -> canvas backing-store coords.
- `screenToImage(pt: Vec2, v: Viewport, dpr: number): Vec2` — inverse. Round-trip within `1e-6`.
- `fitToView(imageSize: Size, canvasSize: Size, padding: number): Viewport` — centered fit with `padding = 16 px` (`--space-4`).
- `clampZoom(z: number): number` — hard clamps to `[0.25, 8]` (spec 24 §03 C-2).
- `clampPan(v: Viewport, imageSize: Size, canvasSize: Size): Viewport` — keeps at least 64 px of image inside the viewport.
- `applyWheel(v: Viewport, deltaY: number, anchorScreen: Vec2, dpr: number): Viewport` — anchor-preserving zoom step of `1.1^(-deltaY/100)`, clamped.

No component reaches into these internals; they consume the returned `Viewport` only.

## Invariants

- `Viewport` is a plain value; no class, no mutation. Reducers replace it whole.
- All functions are pure. No `Date.now`, no `Math.random`, no DOM reads.
- DPR is passed in; `coords.ts` never reads `window.devicePixelRatio` itself.
- Zoom outside `[0.25, 8]` and pans that would push the image fully offscreen are impossible by construction (clamp on every write path).

## Delta guards

- **G-COORD-01** — `rg -n "devicePixelRatio|screenToImage|imageToScreen" src/components src/lib/editor` shows those helpers imported only from `@/lib/editor/coords`; no inline math in components.
- **G-COORD-02** — `CanvasViewport` reads `Viewport` from the store selector `selectViewport()` and calls `imageToScreen` once per shape per frame; no ad hoc `pan*zoom + …` expressions remain.
- **G-COORD-03** — `applyWheel` is the only zoom mutator; wheel/space-drag handlers dispatch actions that call it, they never write `zoom` directly.

## Logging

- One `I_UI_VIEWPORT_CHANGED { zoom, panX, panY, source: 'wheel'|'pan'|'fit', correlationId }` per user gesture end (not per frame). Rate cap unchanged (spec 24 §07).
