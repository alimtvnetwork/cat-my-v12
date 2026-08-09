# 41 — Logging

**Status:** Locked (Plan 04 Step 38). Defines the log record shape, sinks, levels, rotation, and the correlation contract shared with 40 (Error Management) and 42 (Observability).

Anchors: 11 (runtime processes), 14 (capture), 15 (processing), 24 (results JSONL), 25 (file naming), 27 (config surface), 40 (error management).

## 1. Record Shape

Every log line — UI, server function, dispatcher, worker — is a single JSON object on one line:

```json
{
  "Ts": "2026-07-12T00:00:00.123Z",
  "Level": "DEBUG | INFO | WARN | ERROR",
  "Proc": "ui | server | dispatcher | worker",
  "ProcId": "worker-3",
  "CorrelationId": "01J...ULID",
  "InstructionId": "01J...ULID | null",
  "RunSessionId": "01J...ULID | null",
  "TaskId": "01J...ULID | null",
  "Code": "E_XXX | I_XXX | null",
  "Message": "human string, no PII",
  "Context": { ... }
}
```

Rules:

- Keys are PascalCase (project naming rule, memory 02).
- One line = one event. No pretty-printing, no multi-line stacks. Stacks go into `Context.Stack` as a single joined string.
- `Ts` is UTC, millisecond precision, ISO-8601 with `Z`. Local time is `E_LOG_BAD_TIMESTAMP`.
- At least one of `InstructionId | RunSessionId | TaskId` MUST be set for any `Proc = worker | dispatcher` line; missing is `E_BUG_UNCORRELATED_LOG` (40 §7).

## 2. Levels

| Level   | Use                                                                |
| ------- | ------------------------------------------------------------------ |
| `DEBUG` | Developer signal; off in production by default (`27.Log.Level`).   |
| `INFO`  | Lifecycle events: session start/stop, image accepted, worker up.   |
| `WARN`  | Recoverable anomaly: retry, backpressure, LAGGING (37 §7).         |
| `ERROR` | Any error constructed at a boundary (40 §7) — logged exactly once. |

No `TRACE`, no `FATAL`. `FATAL` collapses into `ERROR` + process exit, which the supervisor logs separately.

## 3. Sinks

| Sink                                        | Content                     | Rotation                         |
| ------------------------------------------- | --------------------------- | -------------------------------- |
| stdout (JSON lines)                         | all levels ≥ `27.Log.Level` | supervisor captures              |
| `logs/<yyyy>/<mm>/<dd>/<proc>-<procId>.log` | same                        | daily + size (`27.Log.MaxBytes`) |
| `logs/errors/<yyyy>/<mm>/<dd>.log`          | `ERROR` only, fan-out copy  | daily                            |

Rules:

- Writes are append-only, `O_APPEND`, line-buffered. No lock files.
- Rotation is atomic `.part → final` rename (mirrors 14 §Atomic Rename); a partial rotated file is `E_LOG_ROTATE_PARTIAL`.
- Retention per `27.Log.RetentionDays`; deletion is done by the maintenance script (scripts memory 05d), never by the writing process.

## 4. Correlation

- `CorrelationId` propagates from the UI request through every server fn, dispatcher call, and worker task derived from it. Generating a new one mid-chain is `E_LOG_CORRELATION_BROKEN`.
- Workers additionally stamp `InstructionId` on every line for the duration of an evaluation.
- `results.jsonl` rows (24) carry the same `InstructionId` — a `Result` and its logs join on that id, no other key.

## 5. PII & Secrets

- Never log raw image bytes, raw file contents, or full DB rows. Log ids, sizes, and counts.
- Never log secrets from `27.Secrets.*` or environment. A logger MUST redact any key whose name matches `/(secret|token|password|apikey|api_key)/i` to `"[REDACTED]"`. Missing redaction is `E_LOG_SECRET_LEAK`.
- Operator names may appear in audit-triggered lines (39 §4) but not in high-volume worker lines.

## 6. Volume & Backpressure

- Worker lines are rate-limited per code at `27.Log.PerCodePerSecond`; overflow increments a coalesced counter line `I_LOG_COALESCED` with the dropped count. Silent drops are `E_LOG_DROPPED_SILENT`.
- The logger never blocks the hot path — the write queue is bounded (`27.Log.QueueDepth`); overflow drops the oldest DEBUG/INFO first, then WARN, never ERROR. Dropping ERROR is `E_LOG_ERROR_DROPPED`.

## 7. UI Logging

- The UI logs to `console.error` for `ERROR` and `console.warn` for `WARN`; DEBUG/INFO are gated behind `import.meta.env.VITE_LOG_LEVEL`.
- The same JSON record shape (§1) is emitted; browsers get an object, not a formatted string, so devtools can filter.
- The UI does not ship logs to the server in v1. Users copy diagnostics via the BugError modal (40 §6).

## 8. Failure Taxonomy (logger-local)

| Code                       | When                                                  |
| -------------------------- | ----------------------------------------------------- |
| `E_LOG_BAD_TIMESTAMP`      | Non-UTC or non-ISO timestamp emitted.                 |
| `E_LOG_ROTATE_PARTIAL`     | Rotation left a `.part` file.                         |
| `E_LOG_CORRELATION_BROKEN` | New `CorrelationId` minted mid-request.               |
| `E_LOG_SECRET_LEAK`        | Redactor bypassed for a matching key.                 |
| `E_LOG_DROPPED_SILENT`     | Rate-limit dropped lines without a coalesced counter. |
| `E_LOG_ERROR_DROPPED`      | An `ERROR` line was dropped by the queue.             |

## 9. Cross-References

- Error taxonomy consumed by loggers: 40.
- Correlation ids' origins: 36 (`InstructionId`), 11 (`RunSessionId`), UI (`CorrelationId`).
- File naming for log paths: 25.
- Config keys (`27.Log.*`): 27.
- Metrics derived from logs: 42 (next).

## 10. Operator Identity (LOCKED — resolves Q-07)

- Every log record with `Proc ∈ {ui, server, dispatcher}` that is triggered by an audited action (39 §4) MUST include `OperatorId` at the top level, sourced from `27.Operator.Id` (see 39 §10). Missing when required is `E_LOG_OPERATOR_ID_MISSING`.
- High-volume worker lines (`Proc = worker`) MUST NOT include `OperatorId` — correlation is via `RunSessionId` → `AuditEntry` join at query time. Including it is `E_LOG_OPERATOR_ID_LEAK` (avoids polluting hot-path lines with a shift-scoped label).
- On operator change (edit-and-save on 39), the dispatcher emits an `I_OPERATOR_CHANGED` INFO line with `{OldOperatorId, NewOperatorId}` in `Context`. This is the only sanctioned join point between pre- and post-change audit ranges.

Failure modes added by this section:

| Code                        | Meaning                                       |
| --------------------------- | --------------------------------------------- |
| `E_LOG_OPERATOR_ID_MISSING` | Audited-action log line missing `OperatorId`. |
| `E_LOG_OPERATOR_ID_LEAK`    | Worker line carried `OperatorId`.             |

## 11. Time Source (LOCKED — resolves Q-09)

v1 uses a **dual-clock** model. Wall-clock for event timestamps, monotonic clock for durations. Mixing them for the same purpose is `E_LOG_CLOCK_MISUSE`.

- **Event `Ts`** (§1) — wall clock (`CLOCK_REALTIME` equivalent), UTC, millisecond precision. This is what humans, audit, and cross-process correlation read. NTP steps are allowed.
- **Durations** — MUST be computed from monotonic clock (`CLOCK_MONOTONIC` / `performance.now()` in UI). Any `*Ms` field in `Context` (e.g. `ProcessingMs`, `QueueMs`) derived by subtracting two wall `Ts` values is `E_LOG_CLOCK_MISUSE`. A negative duration is `E_LOG_CLOCK_REGRESSION`.
- **Drift tolerance** — a wall-clock jump larger than `27.Log.MaxClockStepMs` (default `2_000`) between two consecutive lines from the same `Proc` emits one `W_LOG_CLOCK_STEP` warn line with `{OldTs, NewTs, DeltaMs}`; silent absorption of the step is `E_LOG_CLOCK_STEP_SWALLOWED`.
- **Origin** — every proc reads wall clock from the OS at emit time; there is no distributed time-sync in v1. Cross-process ordering relies on `CorrelationId`/`InstructionId`, not on `Ts` comparison across procs.
- **Observability impact** — `ca.pipeline.processing_ms` histograms (42 §2) MUST be fed from monotonic durations; `ca.*_total` counter increments are stamped by wall clock only for retention window bucketing.

Failure modes added by this section:

| Code                         | Meaning                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `E_LOG_CLOCK_MISUSE`         | Duration computed from wall-clock subtraction, or event `Ts` sourced from monotonic clock. |
| `E_LOG_CLOCK_REGRESSION`     | A computed duration is negative.                                                           |
| `E_LOG_CLOCK_STEP_SWALLOWED` | Wall-clock step > `MaxClockStepMs` not surfaced as `W_LOG_CLOCK_STEP`.                     |

## Acceptance Checklist

- [ ] Every log call uses structured fields (`event`, `code`, `tier`) — no bare strings.
- [ ] Every `E_/W_/I_` code emitted here is registered in spec 40 Appendix A.
- [ ] Log sinks (stdout, file, audit) match `27.Logging.*` config keys.

## Cross-reference: TS constants sync

Frontend string registries (`HttpMethod`, `StorageKey`, `AppEvent`) live under `src/lib/constants/`. See `spec/21-app/40-error-manage.md` Appendix Z for the reality-aligned inventory and the rationale for not mirroring `ErrorCode`/`IpcChannel`/vendor/pixel-format on the TS side.
