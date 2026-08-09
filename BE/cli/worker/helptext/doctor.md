# worker-cli doctor

Read-only preflight covering all installer-facing invariants: SDK facade
Protocol satisfaction, config schema validity, log-root writability, and
DB tier drift (root + task + rules). Returns `ExitCode.Usage` on drift so
installers and CI can gate on the exit code.

## Usage

    worker-cli doctor [--db-root <PATH>]

## Flags

| Flag      | Default | Description                            |
| --------- | ------- | -------------------------------------- |
| --db-root | (env)   | Override `APP_DB_ROOT` for this probe. |

## Prerequisites

- None. Doctor is the entry point installers call first.

## Examples

### Example 1: healthy host

    worker-cli doctor

**Output:**

    {"Results":[{"Tier":"sdk","Ok":true},{"Tier":"config","Ok":true},{"Tier":"logroot","Ok":true},{"Tier":"root","Ok":true},...]}

### Example 2: DB drift detected

    worker-cli doctor

**Output:**

    E_CLI_PREFLIGHT_FAILED: task DB drifted from on-disk migrations

## See Also

- [status](status.md) - runtime state (lease + stream marker)
- [version](version.md) - identity payload for install/upgrade gating
