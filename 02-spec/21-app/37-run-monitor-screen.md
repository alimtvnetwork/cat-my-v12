# 37 — Run Monitor Screen

**Status:** Locked (Plan 04 Step 33). Defines the operator-facing live screen shown for the duration of a `RunSession`. Read-only surface — no rule editing, no geometry edits, no config changes.

Anchors: 11 (runtime processes), 14 (capture pipeline), 15 (processing pipeline), 24 (results JSONL), 27 (config surface), 30 (UI overview), 35 (zoom & pan), 36 (Instruction Bundle).

## 1. Purpose

Give the operator a single screen that answers: _is the line running, what is the current image, what did the workers decide, and what failed?_ Every widget on this screen is derived from `Result` rows (24) and worker heartbeats (11 §Runtime Processes) — never from live pixel work in the UI process.

## 2. Layout (fixed regions)

```text
+----------------------------------------------------------+
| TitleBar (32)   RunSessionId · Task · Elapsed · STOP     |
+---------------------+------------------------------------+
| ActionHeader (40)   FPS · Queue depth · Verdict counters |
+---------------------+------------------------------------+
|                     |                                    |
|  Viewport           |  VerdictStrip (right, 320px)       |
|  (current image +   |   - Rule list, OrderIndex asc      |
|   region overlays)  |   - PASS / FAIL / ERROR badges     |
|                     |   - Reason code (33 §Reason)       |
|                     |                                    |
+---------------------+------------------------------------+
| BottomBar (44)  Last N image thumbnails · NG jump        |
+----------------------------------------------------------+
```

Region heights match the HMI grid (memory: HMI design tokens). Viewport uses the same `ViewState` contract as Rule Setup (35) but locks `Mode = FIT` — operators cannot free-pan while running. `E_UI_MODE_MISMATCH` if any code path tries to set `FREE` on this screen.

## 3. Data Sources

| Widget                        | Source                                                   | Cadence                    |
| ----------------------------- | -------------------------------------------------------- | -------------------------- |
| Elapsed / RunSessionId / Task | Router state seeded at `/run` entry                      | static per session         |
| FPS / Queue depth             | `runtime.stats` IPC channel (11)                         | 1 Hz, coalesced            |
| Verdict counters              | rolling aggregate of `Result` rows (24)                  | on each new row            |
| Current image + overlays      | latest `Result.InstructionId` → open bundle (36) + image | on each new row            |
| VerdictStrip                  | `Result.RuleResults[]` for the current row               | on each new row            |
| BottomBar thumbnails          | last N `Result` rows                                     | ring buffer, N from 27 §UI |

No widget polls the DB. The UI subscribes to a single append-only `results.jsonl` tail (24) and derives everything from it.

## 4. Verdict Semantics

- Row-level verdict = `FAIL` if any `RuleResults[].Verdict = FAIL`, else `ERROR` if any = `ERROR`, else `PASS`. Locked in this order; no configurability.
- Reason code shown next to each failed rule is the typed enum from 33 §Reason Codes — never a free-form string.
- The counters in ActionHeader are `Pass / Fail / Error / Total` for the current `RunSession` only. Cross-session totals belong to the Results screen (38), not here.

## 5. Overlays

Overlays are rendered from the Instruction Bundle referenced by `Result.InstructionId` (36 §Envelope). Rules:

- Region color = `Region.DisplayColorRole` (36 §4). No per-run recoloring.
- Failed rules pulse their bound regions once (200ms) on arrival; steady state after. No continuous animation.
- If the bundle file is missing, overlays are suppressed and the row is flagged `E_INSTRUCTION_MISSING` in the strip — the row still displays; the screen never blanks.

## 6. Controls

Only two writable controls on the screen:

1. **STOP** (TitleBar) — sends `RunSession.stop` to the Dispatcher (11). Idempotent. Disabled once the Dispatcher reports `Stopping`.
2. **NG Jump** (BottomBar) — pins the viewport to the last `FAIL`/`ERROR` row and freezes auto-advance until the operator clicks _Resume_. Freeze state is UI-only; results keep accumulating.

Everything else is read-only. Attempts to mutate rules, geometry, or tolerances from this screen are `E_UI_READONLY_VIOLATION`.

## 7. Backpressure & Slow UI

The tail reader may fall behind the workers under high FPS. Rules:

- The UI is allowed to skip intermediate rows for the viewport render, but MUST fold every skipped row into counters and thumbnails — no lost verdicts.
- If the tail lag exceeds `UI.RunMonitor.LagBudgetMs` (27), the ActionHeader shows a `LAGGING` chip (neutral color, not an error). This is a UI signal, not a run failure.
- The UI never drops rows from the counter aggregate. Dropping is `E_UI_COUNTER_DRIFT`.

## 8. Failure Taxonomy (UI-local)

| Code                      | When                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `E_UI_MODE_MISMATCH`      | Non-`FIT` view mode set on Run Monitor.                                                |
| `E_UI_READONLY_VIOLATION` | Any write path invoked from this screen.                                               |
| `E_UI_COUNTER_DRIFT`      | Counter total ≠ rows seen since session start.                                         |
| `E_UI_TAIL_STALLED`       | No new rows for `UI.RunMonitor.StallBudgetMs` (27) while Dispatcher reports `Running`. |

`E_UI_TAIL_STALLED` is surfaced as a blocking banner — a running line with a frozen UI is worse than an obvious error.

## 9. Cross-References

- `Result` shape and JSONL cadence: 24.
- Instruction Bundle (source of overlays): 36.
- Rule verdict / reason enums: 33.
- Historical / cross-session views: 38 (Results Screen).
- Config keys referenced (`UI.RunMonitor.*`): 27.

## Acceptance Checklist

- [ ] Live counters use `tabular-nums` per HMI design memory.
- [ ] Nav is locked while `RunSession.state=Running`.
- [ ] Errors surface via `ErrorBanner` mapped to spec 40 tiers.
