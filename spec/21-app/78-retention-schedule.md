# 78. Retention Scheduling

Status: locked
Owner: Plan 90 Step 102
Depends on: `spec/21-app/72-audit-persistence.md`, `spec/21-app/76-cli-log-and-ipc.md`, `spec/21-app/77-cli-powershell-and-release.md`
Companion module: `BE/app/retention.py` (Step 101, single-shot pass)
Companion CLI: `bin/retention-run.py`

## 1. Why this exists

Step 101 shipped `run_retention(...)`, the ONLY delete path for
`RunSession` + child rows + `FrameArtifact` files. It is a one-shot
call. Nothing in the product invokes it periodically, so in the absence
of an external timer the DB and the `results/<RunId>/artifacts/` tree
grow forever and every guarantee Step 101 made is void.

This spec pins the scheduling contract so operators, the installer
(spec 77), and the observability surface (Step 110) share one story.

## 2. Contract

### 2.1 Two modes, one code path

`bin/retention-run.py` MUST support two mutually-exclusive modes:

1. **Single-shot** (existing, default): run one pass and exit with the
   Step-101 exit-code table.
2. **Loop** (new): run a pass, sleep `interval-hours * 3600` seconds,
   repeat, until the process receives `SIGINT` or `SIGTERM`.

Both modes call the same `run_retention(...)` function. The scheduler
is a thin ticker; it MUST NOT contain any retention logic.

### 2.2 CLI flags (additive to Step 101)

| Flag                 | Default                                    | Meaning                                                             |
| -------------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| `--loop`             | off                                        | Enable loop mode. Requires `--interval-hours`.                      |
| `--interval-hours N` | env `APP_RETENTION_INTERVAL_HOURS` or `24` | Sleep between passes. Integer, `1 <= N <= 168`.                     |
| `--max-passes N`     | unbounded                                  | Optional stop-after-N cap. Test hook and operator escape. `N >= 1`. |

Invalid flag combinations raise `E_CLI_USAGE` (exit `Usage=2`):

- `--interval-hours` without `--loop`.
- `--max-passes` without `--loop`.
- `interval-hours < 1` or `> 168` (one week ceiling; longer intervals
  should use the OS scheduler).
- `max-passes < 1`.

### 2.3 Envelope shape

- Single-shot: unchanged. ONE Universal Envelope, `Results=[outcome]`.
- Loop: ONE Universal Envelope emitted at process exit summarising the
  whole loop; `Results` is the array of per-pass outcomes in call
  order. On `SIGINT`/`SIGTERM` the current pass is allowed to finish;
  the envelope is then emitted and the process exits `Ok=0`. On an
  `AppError` inside a pass, that pass is captured into `Results` with
  the `AppError` re-raised into `Status.Errors`, and the loop STOPS
  (exit `DomainError=3`). On unexpected exception, exit `IoError=4`.

### 2.4 In-process ticker (`BE/app/retention_scheduler.py`)

```python
def run_scheduled(
    *,
    interval_hours: int,
    single_pass: Callable[[], RetentionOutcome],
    max_passes: int | None = None,
    sleeper: Callable[[float], None] = time.sleep,
    stop_event: threading.Event | None = None,
) -> tuple[list[RetentionOutcome], AppError | None]: ...
```

- Pure: no filesystem, no DB, no signal handlers (those belong to the
  CLI wrapper). Tests inject a fake `sleeper` and drive `stop_event`
  directly.
- Guarantees:
  - Never sleeps before the first pass.
  - Sleep is interruptible: `sleeper` is called in short slices (`<= 1s`)
    that check `stop_event.is_set()` between slices, so `SIGINT`
    aborts within one second.
  - `single_pass` raising `AppError` returns cleanly: `(outcomes, err)`.
  - `single_pass` raising any other exception propagates (the CLI
    wrapper maps it to `IoError=4`).
  - Every completed pass logs `retention.scheduler.pass_completed` INFO
    with `PassIndex`, `Deleted`, `Failures`; every skipped-because-stop
    logs `retention.scheduler.stop_requested`.

### 2.5 Signals

The CLI wrapper (not the scheduler) MUST install handlers for
`SIGINT` and `SIGTERM` that set the shared `stop_event`. On Windows
`SIGTERM` is not available; `SIGINT` (Ctrl+C) MUST still work.

## 3. Non-goals

- systemd unit files, Windows scheduled tasks, PowerShell wrappers:
  Step 103 (installer registration).
- `GET /observability/retention/status`: Step 110.
- JSONL log rotation: Step 109.
- Any change to `run_retention` semantics.

## 4. Acceptance criteria

1. `bin/retention-run.py --loop --interval-hours 1 --max-passes 3` runs
   exactly 3 passes and exits `Ok=0` with `len(Results) == 3`.
2. `bin/retention-run.py --interval-hours 2` (no `--loop`) exits
   `Usage=2` with `E_CLI_USAGE`.
3. `run_scheduled(interval_hours=1, single_pass=..., stop_event=set)`
   returns after the first pass; `sleeper` is never called.
4. `run_scheduled` with a `single_pass` that raises `AppError` on the
   second call returns `(len==1, err)` and the CLI exits `DomainError=3`.
5. Sleep between passes is interruptible within `<= 1s` when
   `stop_event` is set mid-sleep.
6. INFO log `retention.scheduler.pass_completed` fires once per pass,
   with `PassIndex` monotonically increasing from `1`.

## 5. Failure surfaces

| Situation                           | Code            | Exit |
| ----------------------------------- | --------------- | ---- |
| `--interval-hours` without `--loop` | `E_CLI_USAGE`   | `2`  |
| `interval-hours` outside `[1, 168]` | `E_CLI_USAGE`   | `2`  |
| `max-passes < 1`                    | `E_CLI_USAGE`   | `2`  |
| Pass raises `AppError`              | pass-through    | `3`  |
| Pass raises other exception         | `E_BE_INTERNAL` | `4`  |
| SIGINT / SIGTERM                    | (none)          | `0`  |
