# Draw tools for ROI and rectangle-family rules (plan 30 step 65)

**Locked at project v3.50.0.** Guards **G-DRAW-TOOL-01..03**.

## Scope

Wire ribbon kinds `roi`, `rect`, `presence`, and `blob` to a shared drag-to-create tool in `src/lib/editor/tools/rect-tool.ts`. The tool consumes `tool-start / tool-move / tool-end` intents from the pointer dispatcher (step 64) and produces exactly one store commit per gesture.

## Contract

- `startRectGesture(image: Vec2, tool: RibbonKind): GestureState` — creates ephemeral gesture state; NOT written to the rule list.
- `updateRectGesture(state: GestureState, image: Vec2, modifiers: Modifiers): GestureState` — `Shift` locks square aspect, `Alt` draws from center. Clamped to image bounds.
- `commitRectGesture(state: GestureState, store: EditorStore): RuleId | null` — returns `null` if `min(width, height) < 4 image-px` (rejected as accidental click); otherwise pushes one undo entry via the store commit boundary and returns the new `RuleId`. Selection is replaced with `[newId]`.
- `cancelRectGesture(state: GestureState): void` — pure discard; no store touch.

## Rendering during drag

- The in-flight rectangle draws through the same `renderFrame` pipeline (step 63) via `state.marquee`-adjacent slot `state.pendingShape`; NOT a separate overlay canvas. Style: 1 px `--ca-select` stroke, 8 % alpha `--ca-select` fill, no halo.

## Rule defaults on commit

- `roi`: kind `'roi'`, name `ROI {n}`, no threshold.
- `rect`: kind `'rect'`, name `Rect {n}`.
- `presence`: kind `'presence'`, threshold `0.5`, name `Presence {n}`.
- `blob`: kind `'blob'`, `minArea = 50`, `maxArea = 5000`, name `Blob {n}`.
- `{n}` = 1 + count of same-kind rules already present.

## Delta guards

- **G-DRAW-TOOL-01** — `rg -n "store\.push|dispatch\(" src/lib/editor/tools` shows commits only in `commitRectGesture`; no writes in start/update/cancel.
- **G-DRAW-TOOL-02** — the 4 kinds route to `rect-tool.ts` through a single `tools/index.ts` registry; no per-kind duplicate file.
- **G-DRAW-TOOL-03** — accidental-click threshold `MIN_RECT_PX = 4` is centralized in `rect-tool.ts` and referenced by both commit path and tests.

## Logging

- One `I_UI_RULE_CREATED { ruleId, kind, widthPx, heightPx, correlationId }` per successful commit.
- One `W_UI_RULE_CREATE_REJECTED { kind, reason: 'below_min_size', correlationId }` per rejected click-through (rate-capped at 5/sec per spec 24 §07).
