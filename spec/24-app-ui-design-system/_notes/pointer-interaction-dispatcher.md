# Pointer interaction dispatcher (plan 30 step 64)

**Locked at project v3.50.0.** Guards **G-PTR-01..03**.

## Scope

One module `src/lib/editor/pointer/dispatcher.ts` owns every raw pointer, wheel, and keyboard-modifier event that lands on the canvas. Tools and viewport gestures read from the dispatcher's typed intent stream; no component attaches its own `onPointerDown` / `onWheel` to the canvas.

## Public API (only these)

- `type PointerIntent = ` union of `{ kind: 'pan-start' | 'pan-move' | 'pan-end', screen: Vec2 }` | `{ kind: 'zoom', deltaY: number, anchor: Vec2 }` | `{ kind: 'tool-start' | 'tool-move' | 'tool-end', image: Vec2, tool: RibbonKind, modifiers: Modifiers }` | `{ kind: 'hover', image: Vec2 }` | `{ kind: 'cancel' }`.
- `attachPointerDispatcher(canvas: HTMLCanvasElement, ctx: DispatcherCtx): () => void` — attaches listeners, returns detach. `DispatcherCtx = { getViewport(): Viewport, getActiveTool(): RibbonKind, getDpr(): number, onIntent(intent: PointerIntent): void }`.
- No other exports.

## Rules

- Uses `setPointerCapture` on `pointerdown` and releases on `pointerup` / `pointercancel` / blur. Multi-touch is single-primary in v1; secondary pointers are ignored.
- Space-drag pan: `Space` held toggles pan mode regardless of active tool; releasing `Space` mid-drag emits `pan-end` then continues as `tool-*` only if the pointer button is still down AND the tool allows drag-continue (v1: no tools continue).
- Wheel: `preventDefault` on the canvas element only; emits `zoom` intents with the raw `deltaY` and pointer anchor. Trackpad pinch surfaces as `ctrlKey + wheel` per WHATWG; treated identically.
- Screen -> image conversion happens exactly once per event via `screenToImage(pt, viewport, dpr)`. The dispatcher never writes to the store; it emits intents. Reducers own the write.
- Right-click and middle-click are ignored in v1 (no context menu, no middle-pan).

## Delta guards

- **G-PTR-01** — `rg -n "onPointerDown|onPointerMove|onPointerUp|onWheel" src/components/editor` returns zero hits; the only listener attachments live in `src/lib/editor/pointer/`.
- **G-PTR-02** — `attachPointerDispatcher` is called exactly once in `CanvasViewport` (in a `useEffect` with `[]` deps that returns the detach), and never re-attached on prop changes.
- **G-PTR-03** — the dispatcher module has zero imports from `@/lib/editor/store` or `zustand`; it emits intents only.

## Logging

- No per-event logs (would blow rate cap). One `I_UI_TOOL_GESTURE_END { tool, durationMs, moved: boolean, correlationId }` on `tool-end`; one `I_UI_VIEWPORT_CHANGED` on pan-end / zoom-settle (settle = 120 ms after last wheel), owned by the reducer, not the dispatcher.
