# 74. Worker CLI

Status: draft (v0.1)
Owner: BE / CLI
Depends on: `12-runtime-processes.md`, `14-worker-pattern.md`, `15-capture-pipeline.md`, `50-capture-modules.md`, `52-sdk-facade-pattern.md`, `73-daheng-galaxy-sdk-integration.md`
Related: `spec/13-generic-cli/**`, `spec/03-error-manage/**`, `spec/05-split-db-architecture/**`, `spec/06-seedable-config-architecture/**`

## Intent

Ship a standalone `worker-cli` binary/module that owns camera lifecycle (enumerate, open, configure, trigger, grab, close) and hands captured frames to the processing pipeline via a documented handoff contract. It runs headless, is observable by the main app through the shared filesystem log store (see `76-cli-log-and-ipc.md`), and never fabricates data.

## Scope (in)

- Subcommands: `list-devices`, `open`, `close`, `configure`, `capture` (single), `stream start|stop`, `status`, `doctor`, `version`, `help`.
- Reads seedable config per `spec/06-seedable-config-architecture/` (device profile, exposure/gain defaults, trigger mode, output dir).
- Uses `BE/sdk_facade/camera.py` `CameraFacade` protocol; selects `InMemory` or `Vendor` provider by `--provider` flag or config.
- Writes structured JSONL logs to filesystem (see `76`).
- Persists device+capture events into the Root DB per `spec/05-split-db-architecture/`; per-run capture metadata into the Task DB.
- Emits Universal Envelope on stdout when `--json` set; human-readable table otherwise (per `spec/13-generic-cli/06-output-formatting.md`).
- Error codes limited to registered `E_CAM_*`, `E_BE_*`, `E_CLI_*` families (see `spec/03-error-manage/`).

## Scope (out)

- Rule evaluation, scoring, decisions (owned by `75-processing-cli.md`).
- UI rendering.
- Long-running HTTP server (that stays in `BE/`).

## Acceptance criteria

1. `worker-cli --help` prints subcommand tree matching `spec/13-generic-cli/09-help-system.md`.
2. `worker-cli list-devices --json` returns Universal Envelope with `Results = [DeviceInfo,...]`; on failure returns envelope with `Errors[].Code` from the `E_CAM_*` registry.
3. Every invocation writes a JSONL log file to `<log_root>/worker/YYYY-MM-DD/HHMMSS-<pid>-<subcmd>.jsonl` with `ts`, `level`, `event`, `code`, `msg`, `ctx`, `run_id`.
4. `worker-cli capture --serial <sn> --out <path>` produces one image file, writes `capture` row to Task DB, and emits `frame_ready` IPC message (see `76`).
5. `worker-cli doctor` runs a preflight check (SDK reachable, config schema valid, log root writable, DB migrations applied) and exits non-zero on any failure with `E_CLI_PREFLIGHT_FAILED`.
6. All exits use canonical codes: 0 ok, 2 usage, 3 domain error (envelope emitted), 4 IO/DB error, 5 SDK/vendor error.
7. Followed guidelines: `spec/02-coding-guidelines/`, `.lovable/coding-guidelines/coding-guidelines.md`. No magic strings. All identifiers PascalCase where wire-facing.
8. No fabricated frames; `InMemory` provider raises `E_CAM_CAPTURE_FAILED` on `grab` per `52-sdk-facade-pattern.md` guardrail.

## Affected files (new/changed)

- `BE/cli/worker/__init__.py`, `main.py`, `commands/{list_devices,open,close,configure,capture,stream,status,doctor,version}.py`
- `BE/cli/common/{logger.py, envelope_output.py, exit_codes.py, config_loader.py, db_bootstrap.py, ipc.py}`
- `BE/tests/cli/worker/test_*.py`

## Inputs

- Config: `config/worker.toml` (path overridable by `--config`) layered per `spec/06-seedable-config-architecture/`.
- Env: `APP_LOG_ROOT`, `APP_DB_ROOT`, `APP_PROVIDER`.
- Args: `--json`, `--provider {inmemory|vendor}`, `--verbose`, `--dry-run`.

## Outputs

- Filesystem log JSONL (per `76-cli-log-and-ipc.md`).
- DB rows (Root DB `devices`, `capture_sessions`; Task DB `captures`, `frames`).
- Optional image files under `<data_root>/captures/`.

## Attachments

None.
