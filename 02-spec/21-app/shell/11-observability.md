# Observability

Status: Draft (Plan 28)

## Log sinks

| Source               | Sink                                       | Path                         |
| -------------------- | ------------------------------------------ | ---------------------------- |
| Renderer console     | File + ring buffer (in-memory, 5 MB)       | `<log-dir>/renderer.log`     |
| Shell (Rust)         | File                                       | `<log-dir>/shell.log`        |
| Worker stdout/stderr | File + `app/core/telemetry/log_record.py`  | `<log-dir>/worker.log`       |
| Audit events         | SQLite via `app/core/audit/sink_sqlite.py` | `<data-dir>/audit.db`        |
| Crash dumps          | File                                       | `<log-dir>/crashes/<ts>.dmp` |

Log rotation: 10 MB per file, 5 files retained.

## Structured record shape

Per `app/core/telemetry/log_record.py`:

```
{
  "ts":       "2026-07-14T00:00:00Z",
  "level":    "info|warn|error",
  "cid":      "01J...ULID",
  "actor":    "user:<uuid>|system",
  "stage":    "boot|ipc|dispatch|shutdown|update",
  "code":     "I_*|W_*|E_*",
  "message":  "human-readable",
  "context":  { ... }
}
```

## Metrics (surfaced to ops panel)

- `ipc_request_duration_ms` (histogram, per method).
- `ipc_error_total` (counter, per code).
- `worker_respawn_total` (counter).
- `update_check_total` / `update_apply_total`.
- `capture_fps` (existing, from `app/core/telemetry/metrics.py`).

## Crash dumps

- Shell: Tauri built-in crash reporter → local file only (no upload without consent).
- Worker: `faulthandler` to `<log-dir>/crashes/worker-<ts>.trace`.
- Renderer: `chrome://crashes` equivalent captured by Tauri.

## Missing-log-is-a-bug rule

Every stage in `03-boot-lifecycle.md` MUST emit its enter+exit records. A
missing record is not "quiet success" — it's an observability regression and
must fail the test suite in `19-testing-strategy.md`.
