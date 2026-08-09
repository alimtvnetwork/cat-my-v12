# 76. CLI Log Capture and IPC Communication Schema

Status: draft (v0.1)
Owner: BE / CLI
Depends on: `40-error-manage.md`, `41-logging.md`, `42-observability.md`, `spec/03-error-manage/**`, `spec/05-split-db-architecture/**`, `spec/06-seedable-config-architecture/**`, `spec/04-database-conventions/**`
Related: `74-worker-cli.md`, `75-processing-cli.md`

## Intent

Define the on-disk log layout AND the file-based IPC protocol that connects Worker CLI, Processing CLI, and the main app (FastAPI backend + UI). Everything is JSONL-on-disk so the main app can `tail -F` any file without a broker, and diagnosis remains possible after a crash.

## Log storage

### Root layout

```
<APP_LOG_ROOT>/
  worker/YYYY-MM-DD/HHMMSS-<pid>-<subcmd>.jsonl
  processing/YYYY-MM-DD/HHMMSS-<pid>-<subcmd>.jsonl
  main/YYYY-MM-DD/HHMMSS-<pid>.jsonl          # BE FastAPI
  index/current.json                            # rolling registry, see below
```

Default `APP_LOG_ROOT`: Windows `%LOCALAPPDATA%\vision-app\logs`, Linux `~/.local/state/vision-app/logs`. Overridable via env or config.

### JSONL record schema (every line)

```json
{
  "Ts": "2026-07-21T09:12:34.567Z",
  "Level": "INFO|DEBUG|WARN|ERROR|FATAL",
  "Source": "worker-cli|processing-cli|be",
  "Pid": 12345,
  "RunId": "01HXYZ...",           // ULID, one per CLI invocation
  "Subcmd": "capture",
  "Event": "device.opened",         // dot-namespaced, PascalCase segments allowed
  "Code": "E_CAM_NOT_CONNECTED",   // only when Level in (WARN, ERROR, FATAL); MUST be in registry
  "Msg": "human readable",
  "Ctx": { "Serial": "SN-...", "DurationMs": 42 },
  "Trace": ["file.py:line: fn", ...] // only when Level in (ERROR, FATAL) and env != production
}
```

Rules:

1. One JSON object per line, UTF-8, LF.
2. Field names PascalCase (matches Universal Envelope convention from `spec/03-error-manage/`).
3. `Code` when present MUST be in the error registry; unknown codes fail lint.
4. No secrets, no PII in `Ctx`.
5. Rotation: new file per invocation; nightly cleanup keeps 14 days by default (config).

### Index file

`<APP_LOG_ROOT>/index/current.json` is a rolling registry updated at start/end of every CLI invocation:

```json
{
  "Sessions": [
    {
      "RunId": "01HXYZ...",
      "Source": "worker-cli",
      "Subcmd": "capture",
      "Pid": 12345,
      "StartedAt": "...",
      "EndedAt": "..." | null,
      "ExitCode": 0 | null,
      "LogPath": "worker/2026-07-21/091234-12345-capture.jsonl"
    }
  ]
}
```

Main app reads `index/current.json` to enumerate live and recent sessions, then tails `LogPath` for detail. Writes go through a file lock (`index/current.json.lock`) per `spec/13-generic-cli/16-verbose-logging.md`.

## IPC protocol

File-based drop-directory pattern (no sockets, no brokers). Located at `<APP_IPC_ROOT>` (default sibling of log root).

```
<APP_IPC_ROOT>/
  worker-out/    # Worker CLI writes here
  processing-in/ # Processing CLI reads from here (usually symlink to worker-out)
  processing-out/# Processing CLI writes here
  main-in/       # Main app reads here (usually symlink to processing-out)
```

### Message envelope

Every IPC message is `<APP_IPC_ROOT>/<dir>/<ulid>.msg.json` (atomic write via `<ulid>.tmp` then rename):

```json
{
  "MsgId": "01HXYZ...",
  "Kind": "FrameReady|ResultReady|Heartbeat|Error",
  "From": "worker-cli|processing-cli",
  "To": "processing-cli|main",
  "RunId": "01HXYZ...",
  "Seq": 1,
  "Ts": "...",
  "Payload": { ... },              // Kind-specific, see below
  "Envelope": {                    // Full Universal Envelope for error propagation
    "Status": { ... },
    "Errors": [ ... ]
  } | null
}
```

Consumers rename to `<ulid>.msg.ack.json` after processing; retention job deletes `.ack.json` older than 24h.

### Payload shapes

- `FrameReady`: `{ FramePath, Serial, ExposureUs, Gain, Roi, CapturedAt }`
- `ResultReady`: `{ ResultsPath, RunId, FrameSeq, Decision, RuleCount, PassCount, FailCount }`
- `Heartbeat`: `{ Uptime, MemoryMb, LastEvent }` (every 5s while running)
- `Error`: envelope-only; `Payload = null`

### Directory bootstrap

Before any `send`/`receive` runs, the four drop-dirs above MUST exist under `<APP_IPC_ROOT>`. `BE/cli/common/ipc_bootstrap.py::bootstrap_ipc_dirs` is the single writer for this: it materialises `worker-out/` and `processing-out/` as real directories, then installs `processing-in/` -> `worker-out/` and `main-in/` -> `processing-out/` as POSIX symlinks (or NTFS junctions via `mklink /J` on Windows when `os.symlink` lacks `SeCreateSymbolicLinkPrivilege`). If both link strategies fail, the consumer view degrades to an independent directory and the failure is recorded in `IpcBootstrapReport.link_failures` so `doctor` (worker + processing) can distinguish "IPC not initialised" from "IPC initialised, link degraded". Pre-existing user data at a consumer path is never clobbered.

### Message lifecycle

The full state machine tying `ipc_bootstrap`, `ipc.send`, `ipc.receive`, `ipc.ack`, and `ipc.prune_ipc` together:

```text
bootstrap_ipc_dirs(<APP_IPC_ROOT>)
        |
        v
+-------------------+       atomic rename        +---------------------+
| producer:         |  <ulid>.tmp -> <ulid>.msg  | drop-dir:           |
| ipc.send(kind,    | -------------------------> | worker-out/         |
| payload, env)     |    (validated + typed)     | or processing-out/  |
+-------------------+                            +----------+----------+
                                                            |
                                                (link OR standalone view)
                                                            v
                                                 +----------+----------+
                                                 | consumer view:      |
                                                 | processing-in/      |
                                                 | or main-in/         |
                                                 +----------+----------+
                                                            |
                                                            v
                                                +-----------+-----------+
                                                | consumer:             |
                                                | ipc.receive(kind?)    |
                                                | yields Message(path)  |
                                                +-----------+-----------+
                                                            |
                                                    process the payload
                                                            |
                                                            v
                                                +-----------+-----------+
                                                | ipc.ack(path):        |
                                                | <ulid>.msg.json ->    |
                                                | <ulid>.msg.ack.json   |
                                                +-----------+-----------+
                                                            |
                                                       (>= 24h later)
                                                            v
                                                +-----------+-----------+
                                                | ipc.prune_ipc(root,   |
                                                | max_age_hours=24):    |
                                                | deletes *.msg.ack.json|
                                                | and stale *.tmp only  |
                                                +-----------------------+
```

Invariants (mirrored by `BE/tests/cli/common/test_ipc_contract.py` C1-C7):

- C1 Atomic visibility: a reader never observes a partial `<ulid>.msg.json`; `<ulid>.tmp` is invisible to `receive`.
- C2 FIFO across producers: `receive` iterates by filename (ULID monotonic), so multi-producer order is stable.
- C3 Ack idempotence: acking an already-acked path is a no-op; the `.ack.json` sentinel is the source of truth.
- C4 Ack + prune compose: only `*.msg.ack.json` and stale `*.tmp` are deletable; live `*.msg.json` in the unread queue is untouchable.
- C5 Corruption is loud: malformed JSON raises `E_IPC_PAYLOAD_INVALID`; the file is left in place for post-mortem.
- C6 Unknown-Kind on disk is loud: `receive` raises `E_IPC_UNKNOWN_KIND` rather than silently skipping.
- C7 `Error` kind is envelope-only: `Payload` MUST be null; `Envelope.Errors[]` carries the full failure context.

Heartbeat cadence: while a long-running subcommand is active, `BE/cli/common/heartbeat.py::HeartbeatTicker` emits `Kind=Heartbeat` every 5s (configurable, injectable `wait_fn` for tests). Missed heartbeats past 3 intervals are the liveness signal `doctor` uses to flag a stuck worker.

## Database ownership

Per `spec/05-split-db-architecture/`:

| DB       | Owner                                    | Tables added                                                      |
| -------- | ---------------------------------------- | ----------------------------------------------------------------- |
| Root DB  | Worker CLI + main app                    | `devices`, `capture_sessions`, `cli_invocations`                  |
| Task DB  | Both CLIs + main app                     | `captures`, `frames`, `results`, `result_details`, `ipc_messages` |
| Rules DB | Processing CLI (read) + main app (write) | (existing per `23-rules-db-overrides.md`)                         |

Migration files follow `spec/04-database-conventions/` and `spec/21-app/26-migrations.md`.

## Seedable config

Per `spec/06-seedable-config-architecture/`, both CLIs load config in this layer order: defaults -> repo `config/*.toml` -> `<APP_CONFIG_ROOT>/*.toml` -> env vars -> CLI flags.

## Acceptance criteria

1. Both CLIs emit JSONL records validating against the schema above (`ruff` + `mypy` + custom lint step).
2. Log files exist for every invocation, non-empty, always closed cleanly (final `session.end` record with `ExitCode`).
3. Index file always parseable; concurrent writers do not corrupt it (file lock proven by test).
4. Every IPC message strictly validates against Kind-specific payload schema; unknown Kind rejected with `E_IPC_UNKNOWN_KIND`.
5. Main app can enumerate sessions and tail logs without holding an exclusive lock on the CLI process's log file (writers open `O_APPEND`, readers open read-only).
6. Migration scripts create new tables in the correct DB per split; cross-DB writes forbidden (enforced by dedicated connection per DB).
7. Config layering follows `spec/06`; env vars override files, flags override env.
8. Error codes: `E_IPC_*` and `E_LOG_*` families registered in the central registry.

## Affected files (new/changed)

- `BE/cli/common/logger.py`, `ipc.py`, `config_loader.py`
- `BE/db/migrations/00NN_*.sql` (three: root, task, rules)
- `BE/errors/codes.py` (add `E_IPC_*`, `E_LOG_*`, `E_CLI_*`)
- `spec/03-error-manage/` registry extension

## Attachments

None.
