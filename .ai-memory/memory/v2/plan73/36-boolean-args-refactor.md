# Plan 73 Steps 36-37: boolean-arg + PascalCase sweep

## Step 36 (boolean-flag positional args)

Codebase scan (`rg -nP '^\s*(export\s+)?(async\s+)?function\s+\w+\([^)]*:\s*boolean[,)]' src`)
returned 13 functions. Only 2 are true positional-flag offenders per
command 21 semantics (trailing `boolean` that reads as a mode switch
at call sites):

1. `pointsToAbsolutePath(points, close)` in `src/components/editor/design-mode/svg-path.ts`.
   Callers: `svg-import.ts` (3), `compile-shape.ts` (1), `DesignModeOverlay.tsx` (1).
2. `squareCurrent(start, current, enabled)` in `src/lib/editor/tools/anchor-tool.ts`.
   Callers: `anchor-tool.ts` `dragRect` (1).

Both refactored to a named options object (`{ close }`, `{ enabled }`),
with a co-located `PointsToPathOptions` / `SquareCurrentOptions`
interface. No behavioural change.

Excluded (reason inline):

- `useDialogSync(ref, isOpen)`, `broadcastInspectorSections(open)`,
  `writeCollapsed(collapsed)`, `setPeekAll(peek)`, `setDebugOverlay(enabled)`:
  single boolean parameter carries the data itself, not a mode flag.
- `toggleSelected(id, checked)`: `checked` is the new value, not a flag.
- `hasLockedState(entry, pathname, running)`: `running` is app state.
- `bool(v, fallback)` in `migrations.ts`: default-value helper.
- `computeDelay(attempt, baseMs, capMs, jitter)`, `prepare(image, threshold, invert)`:
  internal helpers, all-typed numeric-plus-boolean signature is
  self-documenting; refactor deferred until a second caller lands.

## Step 37 (PascalCase rename sweep)

Scans run (all returned zero matches under `src/`):

- lowercase-leading `type`/`interface`:
  `rg -nP '^\s*(export\s+)?(interface|type)\s+[a-z]'`
- Hungarian `I`-prefix interfaces:
  `rg -nP '^\s*(export\s+)?(interface|type)\s+I[A-Z]\w+'`
- `_t`-suffix types: `rg -nP '^\s*(export\s+)?(interface|type)\s+\w+_t\b'`

Enums under `src/` (all PascalCase, verified):
`HomeJobStatus`, `HomeTaskStatus`, `RunLockState`, `RpcErrorCode`,
`MenuShortcut`, `MenuGroupId`.

Result: no rename required. Command 20 compliance is already at
baseline; step recorded as verified-clean rather than mutated.

## Verification

- `bunx tsgo --noEmit`: exit 0.
- `bunx vitest run`: 95 files / 718 tests passing.
- Baseline before change: `pointsToAbsolutePath(pts, true)` and
  `squareCurrent(start, current, modifiers.shiftKey)` at 4 sites.
  After: all sites use named options.
