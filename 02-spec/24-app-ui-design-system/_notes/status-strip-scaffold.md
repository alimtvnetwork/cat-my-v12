---
title: Status strip scaffold with log-code left slot (plan 30 step 55)
slug: status-strip-scaffold
plan: 30
step: 55
status: locked
---

# Status strip scaffold with log-code left slot

## Purpose

Mount the 28 px status strip into the shell `status` slot from step 52.
Wires the left slot to the live log stream so ribbon (53) and rail (54)
outputs are visibly confirmed. Closes the shell perimeter so error
boundary fallbacks (steps 56-58) have a real footprint.

## Target files (new)

```
src/components/editor/status/
  StatusStrip.tsx          # 3-slot layout host
  LastLogChip.tsx          # left slot: level chip + code text
  FpsBadge.tsx             # center slot: dev-only, ?debug=fps gated
  SaveState.tsx            # right slot: undo/redo/save state
  index.ts                 # barrel

src/lib/editor/log-stream.ts
                           # in-memory ring of last 200 log entries
```

Step 55 lands only the left slot fully wired; center and right slots
mount as static skeletons that read from placeholder selectors,
completed at steps 58 (save state) and 95 (fps runner).

## Strip contract (matches `_notes/status-strip-budget-gate.md`)

- Height 28 px, padding `--space-1` top/bottom + `--space-3` left/right.
- Background `--ca-chrome`, ink `--ca-chrome-ink`, 1 px `--ca-border`
  top edge, `--elevation-0`.
- Text `--text-hmi-caption` for labels, `--text-hmi-badge` for codes.
- Every numeric slot uses `tabular-nums`.
- `role="status"` landmark; motion `--motion-instant` only (respects
  reduced-motion collapse).
- No `title` fallback tooltips anywhere.

## Left slot: last log chip

- 12 px level chip left, colored by level:
  - info / success -> `--ca-ok`
  - warn -> `--ca-warn`
  - error -> `--ca-ng`
- Monospace code text right of chip, format `I_UI_SELECTION_CHANGED`
  style, ellipsize with tooltip via console-open click (no `title=`).
- Click opens the log console at `--elevation-3`, scoped to the last
  200 entries from `log-stream.ts`. No inline expansion.
- Empty state: chip at `--ca-ok`, text `"Ready"`.

## Log stream contract

`src/lib/editor/log-stream.ts` exposes:

```ts
export type LogEntry = {
  code: string; // I_UI_* | W_UI_* | E_UI_*
  level: "info" | "warn" | "error";
  timestamp: number; // ms since epoch
  correlationId: string;
  fields: Record<string, unknown>;
};

export function push(entry: LogEntry): void;
export function last(): LogEntry | null;
export function tail(n: number): LogEntry[]; // capped at 200
export function subscribe(fn: (entry: LogEntry) => void): () => void;
```

`errors.ts` `logger.info/warn/error` calls MUST forward to `push()`
after their existing side effect (currently the boundary-allowlisted
`console.error`). Ring capacity 200 (FIFO); no persistence. Subscriber
list bounded at 8; oversubscription throws
`E_UI_LOG_STREAM_OVERFLOW` (dev only).

## Save state placeholder (right slot)

Renders `Un0/50 · Rn0/50 · Saved` as static text at step 55. Real
undo/redo counts and save state wire in at step 58 once persistence
adapter lands. No local state.

## FPS badge placeholder (center slot)

Reads `URLSearchParams` once at mount; when `?debug=fps` absent, renders
`null`. When present, shows static `-- fps` until the perf runner
provides the frame observer at step 95.

## Acceptance for step 55

- Strip mounts at 28 px in the shell `status` slot, three visible slots
  at their declared widths, `role="status"` on the strip root.
- Firing any log via ribbon or rail updates the left slot within one
  frame; error-level logs turn the chip `--ca-ng`.
- Clicking the left chip opens the log console at `--elevation-3` and
  shows the last N (<=200) entries.
- Guards G-STATUS-01..04 pass on new files.

## Regression guards (delta)

```bash
# G-STATUS-05: log stream ring capacity is centralized, not literal in components
rg -nE "\.slice\(-200|\.slice\(0,\s*200" src/components/editor/status

# G-STATUS-06: no title= tooltip fallback in status
rg -n "title=" src/components/editor/status

# G-STATUS-07: FPS badge gated on ?debug=fps at mount only
rg -n "debug=fps" src/components/editor/status/FpsBadge.tsx
```

Expected: G-STATUS-05 empty (capacity read from `log-stream.ts`);
G-STATUS-06 empty; G-STATUS-07 matches once.

## Decision

Status strip is locked at 3 slots with the left slot fully wired to a
200-entry in-memory log ring, `errors.ts` logger forwards to
`log-stream.push`, click-to-open console at `--elevation-3`, and static
placeholders for center (FPS) and right (save state) until steps 95 and 58. Step 56 (route error boundary tier) may proceed.
