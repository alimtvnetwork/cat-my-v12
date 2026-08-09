# Performance budget

Status: Draft (Plan 28)

## Cold start

| Milestone                             | Budget (P95) |
| ------------------------------------- | ------------ |
| Shell process launch → splash visible | 500 ms       |
| Splash → worker `READY` line          | 3 s          |
| Worker READY → `/healthz` 200         | 2 s          |
| `/healthz` 200 → renderer first paint | 1 s          |
| Total (launch → interactive)          | **7 s**      |

## Warm start

- Repeat launch within 5 min: ≤ 3 s to interactive.

## IPC round-trip

- Local method (no I/O): P50 ≤ 3 ms, P95 ≤ 10 ms.
- SQLite-backed method: P50 ≤ 15 ms, P95 ≤ 60 ms.
- Streaming first frame: P95 ≤ 40 ms.

## Capture FPS

- Reuses existing budget in `app/core/telemetry/metrics.py`; not restated.

## Memory ceiling

- Shell RSS ≤ 120 MB idle, ≤ 300 MB with capture live.
- Worker RSS ≤ 400 MB with capture + dispatcher active.
- Renderer RSS ≤ 250 MB.

## Crash-rate SLO

- ≤ 1 worker crash per 10 000 user-sessions.
- Zero unhandled panics in shell.

## Enforcement

Perf tests fail CI if any budget regresses by > 20% vs the last release
baseline stored under `tests/reports/perf-baseline.json`.
