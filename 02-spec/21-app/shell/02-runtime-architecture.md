# Runtime architecture

Status: Draft (Plan 28)
Companion: `./diagrams/02-process-model.mmd`

## Processes

1. **Shell process** (Tauri host, Rust).
   - Owns application lifetime, single-instance lock, tray icon, updater,
     bearer-token minting, and log directory.
   - Spawns the worker process; restarts it on crash with exponential backoff
     (100 ms → 30 s cap).
2. **Renderer process** (Chromium WebView).
   - Loads the built UI via the `app://` scheme (never `file://`, never
     `http://` from disk).
   - Receives `{port, token, version}` via preload; cannot access Node or the
     filesystem.
3. **Worker process** (Python).
   - Hosts `app.supervisor.boot`, dispatcher, capture, rules, audit sinks.
   - Binds loopback HTTP+WS on a random port (127.0.0.1 only).
   - Emits structured logs to stdout; shell tees them to file + ring buffer.
4. **Supervisor thread** (inside shell).
   - Health-probes the worker on `/healthz` every 2 s.
   - Kills and respawns on 3 consecutive failures; emits `E_SHELL_WORKER_CRASH`.

## Threads

- Shell main thread: UI events, updater state machine.
- Shell IPC thread: token issuance, request proxy (renderer → worker).
- Worker: standard `asyncio` loop plus dispatcher pool per
  `app/dispatcher/pool.py`.

## Ownership

- Ports and pipes are owned by the shell; renderer and worker never bind
  privileged ports.
- On-disk paths (see `14-file-layout.md`) are owned by the shell process;
  worker writes only under `<data-dir>/`.
- Secrets (per-launch bearer, updater keys) are held only in shell memory and
  passed to renderer via preload argument, never on disk.

## Crash boundaries

- Renderer crash → shell reloads renderer without restarting worker.
- Worker crash → supervisor respawns; renderer shows degraded banner until
  `/healthz` returns ready.
- Shell crash → OS treats as app exit; no recovery attempted.

## Failure modes

Every failure surfaces an `E_SHELL_*` code from `12-error-taxonomy.md` and is
mirrored to the audit sink via `app/core/audit/sink_sqlite.py`.
