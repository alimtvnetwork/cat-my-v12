# Remaining draw tools: text, math, OCR anchor

Root cause: the previous pinned work described tool modules that were not present in the source tree, leaving the current ribbon kinds without a canvas creation path.

## Locked implementation

- Added `src/lib/editor/tools/anchor-tool.ts` for the remaining anchor-family kinds.
- `K` creates an OCR anchor with OCR defaults.
- `S` creates a Text rule with regex defaults.
- `E` creates a Math rule with expression defaults.
- `src/lib/editor/tools/index.ts` is the single registry used by the canvas for `C/R/K/S/E` gesture creation.
- Click is valid for anchor-family tools; drag resizes the anchor crop.
- Rectangle-family `C/R` still use `MIN_RECT_PX = 4` through `rect-tool.ts`.

## Observability

- Successful creation emits `I_UI_RULE_CREATED`.
- Accidental rectangle clicks emit `W_UI_RULE_CREATE_REJECTED` with `reason=below_min_size`, capped at 5 per second.
- Every completed creation gesture emits `I_UI_TOOL_GESTURE_END`.
