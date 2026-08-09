# 75. Processing CLI

Status: draft (v0.1)
Owner: BE / CLI
Depends on: `12-runtime-processes.md`, `16-processing-pipeline.md`, `17-parallelism-guarantees.md`, `24-results-json.md`, `47-rule-condition-model.md`, `49-validation-order.md`, `52-sdk-facade-pattern.md`
Related: `74-worker-cli.md`, `76-cli-log-and-ipc.md`, `spec/05-split-db-architecture/**`, `spec/06-seedable-config-architecture/**`

## Intent

Ship a standalone `processing-cli` that consumes frames handed off by the Worker CLI (or read from disk), evaluates the active rule bundle, emits `results.json` per `24-results-json.md`, and writes results into the Task DB. Logs identically to Worker CLI. No camera code, ever.

## Scope (in)

- Subcommands: `evaluate` (single frame), `batch` (folder or manifest), `watch` (tail Worker CLI IPC directory), `dry-run`, `verify-bundle`, `status`, `doctor`, `version`, `help`.
- Loads rule bundle from Rules DB (per `23-rules-db-overrides.md`) or from `--bundle <path>` JSON.
- Applies rules in `49-validation-order.md` order; short-circuit + full-mode both supported.
- Reads seed/config per `spec/06-seedable-config-architecture/`.
- Writes results (`results.json`) to `<data_root>/results/<run_id>/` and DB rows to Task DB.
- Emits `result_ready` IPC message consumable by the main app.
- Universal Envelope output when `--json`.

## Scope (out)

- Any camera SDK call.
- UI.

## Acceptance criteria

1. `processing-cli evaluate --frame <path> --bundle <path> --json` returns envelope with `Results = [ResultRecord]`.
2. `processing-cli watch --ipc-dir <dir>` polls the Worker IPC dir, processes each `frame_ready` message exactly once (idempotency key = `run_id + frame_seq`), and writes `result_ready` back to the same dir.
3. Every invocation writes JSONL log to `<log_root>/processing/YYYY-MM-DD/HHMMSS-<pid>-<subcmd>.jsonl` with identical schema to Worker CLI.
4. `processing-cli verify-bundle --bundle <path>` runs schema + acceptance-contract checks (`60-rule-acceptance-contract.md`) and exits non-zero with `E_RULE_BUNDLE_INVALID` on failure.
5. Error codes limited to `E_RULE_*`, `E_BE_*`, `E_CLI_*`.
6. Exit codes match `74-worker-cli.md` acceptance #6.
7. Followed guidelines: `spec/02-coding-guidelines/`, `spec/04-database-conventions/`.
8. `doctor` checks: DB reachable, bundle schema valid, log root writable, IPC dir writable.

## Affected files (new/changed)

- `BE/cli/processing/__init__.py`, `main.py`, `commands/{evaluate,batch,watch,dry_run,verify_bundle,status,doctor,version}.py`
- Shared with Worker CLI: `BE/cli/common/**` (see `74`)
- `BE/tests/cli/processing/test_*.py`

## Inputs

- Config: `config/processing.toml` layered per `spec/06-seedable-config-architecture/`.
- Env: `APP_LOG_ROOT`, `APP_DB_ROOT`, `APP_IPC_ROOT`.

## Outputs

- `results.json` per `24-results-json.md`.
- DB rows in Task DB (`results`, `result_details`).
- Log JSONL, IPC `result_ready` files.

## Attachments

None.
