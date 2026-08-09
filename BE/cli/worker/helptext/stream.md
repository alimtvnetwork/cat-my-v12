# worker-cli stream

Split-phase streaming on the currently-held camera lease. `start` writes
`<APP_DATA_ROOT>/worker/stream.state.json` and returns immediately;
`stop` clears it. Uses the Step 45 lease so a stream cannot outlive its
owner (spec 74 §Subcommands).

## Usage

    worker-cli stream start --serial <SERIAL>
    worker-cli stream stop  [--serial <SERIAL>]

## Flags

| Flag     | Default      | Description                     |
| -------- | ------------ | ------------------------------- |
| --serial | (start: req) | Serial matching the held lease. |

## Prerequisites

- `start`: `worker-cli open --serial <SERIAL>` must have succeeded.
- `stop`: no-op when no marker exists.

## Examples

### Example 1: start then stop

    worker-cli open   --serial SN-STUB-0000
    worker-cli stream start --serial SN-STUB-0000
    worker-cli stream stop

**Output:**

    {"Results":[{"State":"stopped","Serial":"SN-STUB-0000"}]}

### Example 2: refuse start without a lease

    worker-cli stream start --serial SN-STUB-0000

**Output:**

    E_CLI_PREFLIGHT_FAILED: no camera lease held for 'SN-STUB-0000'

## See Also

- [open-stream](open-stream.md) - single-shot bounded grab loop
- [status](status.md) - reports lease + stream marker together
