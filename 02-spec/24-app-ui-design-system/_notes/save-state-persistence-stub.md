---
title: Save state right slot + persistence adapter stub (plan 30 step 58)
slug: save-state-persistence-stub
plan: 30
step: 58
status: locked
---

# Save state right slot + persistence adapter stub

## Purpose

Replace the static right-slot placeholder from step 55 with real
undo/redo counts and save state, and land the persistence adapter stub
that gives every downstream write a stable boundary. This is the last
placeholder in the shell perimeter; layout gate (step 60) requires the
strip to be 100% real.

## Target files (new + edits)

```
src/lib/editor/undo/
  ring.ts                  # UNDO_CAPACITY = 50 FIFO, {undo, redo}Length
  index.ts                 # barrel: pushEntry, undo, redo, counts

src/lib/editor/selectors/
  history.ts               # selectHistoryCounts: () => {undo, redo}
  save-state.ts            # selectSaveState: () => 'saved' | 'dirty' | 'saving'

src/lib/editor/persistence/
  serialize.ts             # serializeProgram(state): Program (frozen shape)
  adapter.ts               # write(program): Result<void, EditorError>
  memory-adapter.ts        # in-memory stub used by step 58
  index.ts                 # barrel

src/components/editor/status/SaveState.tsx    # replace static text
```

## Undo ring contract (aligns with `_notes/undo-budget-gate.md`)

- `UNDO_CAPACITY = 50` exported once from `ring.ts`; components read
  the counts via selectors, never the constant.
- `pushEntry(entry)` clears redo stack unless the caller is `undo` or
  `redo` itself.
- `undoLength()` and `redoLength()` return integers 0..50.
- `undo()` and `redo()` are no-ops on empty stacks with no log lines.

## Save state contract

Three states only: `'saved' | 'dirty' | 'saving'`.

- `saved`: last committed program equals last written program.
- `dirty`: at least one uncommitted mutation since the last successful
  write (any successful action).
- `saving`: an in-flight `adapter.write()` promise; resolves to
  `saved` on success or reverts to `dirty` on failure while emitting
  `E_UI_PERSIST_WRITE`.

The selector reads: `writeInFlight ? 'saving' : (dirtyCount > 0 ?
'dirty' : 'saved')`. Component consumes the selector; no local state.

## Persistence adapter (stub)

```ts
// src/lib/editor/persistence/adapter.ts
export interface PersistenceAdapter {
  write(program: Program): Promise<Result<void, EditorError>>;
}
```

- `memory-adapter.ts` is the default: writes to an in-memory `Map`
  keyed by program id, resolves after 1 macrotask, always succeeds.
- Real adapter lands at step 85 by swapping the injected implementation
  behind a factory in `persistence/index.ts` (single call site).
- `write()` MUST emit exactly one `I_UI_PERSIST_WRITE` with
  `{ bytes, duration_ms, correlationId }` on success and exactly one
  `E_UI_PERSIST_WRITE` on failure (matches boundaries gate).
- `serialize.ts` is the ONLY caller allowed to construct a `Program`
  value; components and other libs pass state, not program objects.

## Right slot layout

```
Un{undo}/{cap} · R{redo}/{cap} · {saveLabel}
```

- `Un0/50` -> undo count and capacity, `--text-hmi-badge`,
  `tabular-nums`.
- Same for redo.
- Save label: `Saved` (default ink), `Dirty` (`--ca-warn`), `Saving...`
  (default ink + `--motion-instant`-only animated ellipsis via 3 spans,
  no CSS keyframe).
- Dot separators are `·` in `--ca-ink-muted`; padding `--space-2`
  between segments.
- Slot is a single `<div role="status">` region; no `title=` fallback.

## Commit path

- Every action reducer in `src/lib/editor/store/actions/**` calls
  `undo.pushEntry(entry)` when it produces a real history entry
  (matching the eight kinds in the undo gate).
- After the reducer returns, the store post-commit hook calls
  `adapter.write(serialize(state))` unless `entry === null` (no-op
  same-kind commits).
- Coalescing (400 ms params window, F-UNDO-02 exception) lives in
  `undo/coalesce.ts`, added at step 82 (params commit). Step 58 ships
  the naive path.

## Acceptance for step 58

- After a `rules.kindSwitch` real switch, right slot reads
  `Un1/50 · R0/50 · Saving...` for one macrotask, then
  `Un1/50 · R0/50 · Saved`; log stream shows the switch info +
  `I_UI_PERSIST_WRITE`.
- Manual `undo()` decrements Un to 0 and increments R to 1; no
  `I_UI_PERSIST_WRITE` on empty-stack calls.
- Killing the memory adapter (test hook) surfaces `Dirty` and emits
  `E_UI_PERSIST_WRITE`; canvas boundary does not trip.
- Guards G-STATUS-01..07, G-BOUND-01..08 pass on new files.

## Regression guards (delta)

```bash
# G-SAVE-01: SaveState reads selectors, not local state or literals
rg -nE "useState|Un[0-9]" src/components/editor/status/SaveState.tsx

# G-SAVE-02: persistence writes come from serialize.ts only
rg -nE "adapter\.write\(" src/components/editor src/lib/editor \
  | rg -v "persistence/"

# G-SAVE-03: UNDO_CAPACITY is centralized
rg -n "UNDO_CAPACITY" src/ | rg -v "undo/ring.ts"
```

Expected: G-SAVE-01 empty; G-SAVE-02 empty (only persistence layer
invokes `write`); G-SAVE-03 empty (only `ring.ts` declares it).

## Decision

Save state right slot is wired to `selectHistoryCounts` and
`selectSaveState`, persistence adapter stub emits mandatory
`I_UI_PERSIST_WRITE` / `E_UI_PERSIST_WRITE` logs per commit, and the
naive commit path calls `adapter.write(serialize(state))` after every
non-null action entry. Step 59 (top bar polish) may verify Save/Publish
action props against this pipe.
