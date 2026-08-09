# Boot and shutdown lifecycle

Status: Draft (Plan 28)
Companion: `./diagrams/03-boot-sequence.mmd`

## Cold start sequence

1. Shell process launches; acquires single-instance lock.
2. Shell opens splash window (native, no WebView) with build/version info.
3. Shell mints per-launch bearer token (32-byte random, hex-encoded).
4. Shell resolves data directory (see `14-file-layout.md`); creates if missing.
5. Shell runs SQLite migrations via `app/core/io/migrate.py` in order under
   `app/core/io/migrations/`. Failure → `E_SHELL_BOOT_FAILED`, splash shows
   remediation, no worker spawn.
6. Shell spawns worker process with env: `SHELL_IPC_PORT=0`, `SHELL_IPC_TOKEN`,
   `SHELL_DATA_DIR`.
7. Worker binds loopback socket, prints `READY {"port":<int>}` on stdout.
8. Shell reads the port line; times out at 15 s → `E_SHELL_BOOT_FAILED`.
9. Shell polls `GET /healthz` until 200 (max 30 s) → emits `I_SHELL_READY`.
10. Shell creates the WebView; preload injects `{port, token, version}`.
11. Renderer loads `app://index.html`; first paint recorded; splash closed.

## First-run vs upgrade

- First run: seed default config from `app/core/config/schema.py`; write
  `I_SHELL_FIRST_RUN`.
- Upgrade (installed version < current): run migrations in order; write
  `I_SHELL_UPGRADED` with prior/next version; align with `spec/14-update/*`.

## Shutdown sequence

1. Renderer close event → shell sends `POST /shutdown` (idempotent).
2. Worker flushes audit sink, closes SQLite, exits 0 within 5 s budget.
3. Shell reaps worker; on timeout sends SIGTERM, then SIGKILL after 2 s more.
4. Shell releases single-instance lock; exits 0.
5. Any non-zero exit code is recorded to the crash log and surfaced on the
   next launch as `E_SHELL_PREVIOUS_UNCLEAN_EXIT` (informational banner).

## Health gate

`GET /healthz` returns 200 only when: SQLite reachable, migrations at head,
capture facade probed, audit sink writable. Any false → 503 with structured
body listing the failed check.

## Observability

Every step above emits a structured log record via `app/core/telemetry/log_record.py`
with `stage`, `duration_ms`, and `outcome`. Missing a line in the log is
itself a bug (see `11-observability.md`).
