# worker-cli close

Release the single-camera lease. Idempotent: no lease -> exit Ok with an
empty Results array (spec 74 §Acceptance #3). Passing `--serial` guards
against accidentally releasing a peer's lease and raises `E_BE_CONFLICT`
on mismatch.

## Usage

    worker-cli close [--serial <SERIAL>]

## Flags

| Flag     | Default | Description                                                |
| -------- | ------- | ---------------------------------------------------------- |
| --serial | (none)  | Expected holder; fail if the lease has a different serial. |

## Prerequisites

- None. Safe to call from shutdown hooks and PowerShell `finally` blocks.

## Examples

### Example 1: release whatever is held

    worker-cli close

**Output:**

    {"Results":[{"Serial":"SN-STUB-0000","Pid":12345,"AcquiredAt":"..."}]}

### Example 2: idempotent no-op

    worker-cli close

**Output:**

    {"Results":[]}

## See Also

- [open](open.md) - acquire the lease
- [status](status.md) - check lease + stream marker without mutating state
