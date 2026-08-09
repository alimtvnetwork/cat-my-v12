# worker-cli status

Side-effect free reporter that peeks the camera lease and stream marker
and returns diagnostic flags (`PidAlive`, `StreamStaleLease`,
`StreamSerialMismatch`). Never fixes state; it only reports.

## Usage

    worker-cli status

## Flags

| Flag   | Default | Description    |
| ------ | ------- | -------------- |
| (none) | -       | Reporter only. |

## Prerequisites

- None.

## Examples

### Example 1: idle host

    worker-cli status

**Output:**

    {"Results":[{"Lease":null,"Stream":null}]}

### Example 2: stale stream marker without a lease

    worker-cli status

**Output:**

    {"Results":[{"Lease":null,"Stream":{"Serial":"SN-STUB-0000"},"StreamStaleLease":true}]}

## See Also

- [open](open.md) / [close](close.md) - lease lifecycle
- [stream](stream.md) - stream marker lifecycle
