# Offline behavior

Status: Draft (Plan 28)

## Fully offline features

- Capture, dispatch, rules evaluation, results, audit — all local SQLite.
- Settings read/write (except license verification against remote).
- Ops panel — all rows served from local audit sink.

## Degraded when offline

| Feature                | Degradation                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Update check           | Skip; log `I_SHELL_UPDATE_SKIPPED_OFFLINE`; retry on interval.                                       |
| License verify         | Grace period 14 days from last successful verify; then `E_LICENSE_OFFLINE_EXPIRED`.                  |
| Telemetry (if enabled) | Queue to `<data-dir>/telemetry-queue/`; flush on reconnect.                                          |
| Audit hooks (external) | Queue in local audit sink; `E_SEC_RETENTION_HOOK_UNREACHABLE` on failure; resync when hook responds. |

## Reconnect

Shell detects network state via OS APIs (Tauri `os` module). On transition
offline → online:

1. Retry any queued update check.
2. Flush telemetry queue in FIFO order, drop entries older than 7 days.
3. Retry pending audit hook dispatches.

## User signal

Renderer receives `network.state.stream`; `<GlobalNav>` shows an offline badge
with tooltip listing degraded features.
