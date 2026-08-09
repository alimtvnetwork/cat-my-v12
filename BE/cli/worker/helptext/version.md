# worker-cli version

Emit a machine-readable identity payload for install/upgrade gating.
CI stamps `WORKER_CLI_VERSION`, `WORKER_CLI_COMMIT`, and
`WORKER_CLI_BUILD_DATE` at release build; local dev sees the pyproject
version and literal `"unknown"` for commit/build-date (never fabricated).

## Usage

    worker-cli version

## Flags

| Flag   | Default | Description       |
| ------ | ------- | ----------------- |
| (none) | -       | Identity payload. |

## Prerequisites

- None. Side-effect free.

## Examples

### Example 1: dev environment

    worker-cli version

**Output:**

    {"Results":[{"Name":"worker-cli","Version":"0.1.0","Commit":"unknown","BuildDate":"unknown"}]}

### Example 2: released binary

    worker-cli version

**Output:**

    {"Results":[{"Name":"worker-cli","Version":"1.2.3","Commit":"deadbeef","BuildDate":"2026-07-21T00:00:00Z"}]}

## See Also

- [doctor](doctor.md) - full host preflight
- [status](status.md) - runtime state reporter
