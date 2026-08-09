# worker-cli open

Acquire the cross-invocation single-camera lease for the given serial.
Backing file: `<APP_DATA_ROOT>/worker/camera.lease.json`. Same-serial,
same-holder reacquisitions are idempotent; different-serial while a live
holder owns the lease returns `E_BE_CONFLICT` (spec 74 §Acceptance #3).

## Usage

    worker-cli open --serial <SERIAL> [--run-id <ID>]

## Flags

| Flag     | Default     | Description                                  |
| -------- | ----------- | -------------------------------------------- |
| --serial | (required)  | Device serial as reported by `list-devices`. |
| --run-id | (auto ULID) | Correlation id stored in the lease payload.  |

## Prerequisites

- Chosen serial must appear in `worker-cli list-devices`.

## Examples

### Example 1: acquire

    worker-cli open --serial SN-STUB-0000

**Output:**

    {"Results":[{"Serial":"SN-STUB-0000","Pid":12345,"RunId":"01J...","AcquiredAt":"2026-07-21T00:00:00Z"}]}

### Example 2: conflict against a live peer

    worker-cli open --serial SN-OTHER-0001

**Output:**

    E_BE_CONFLICT: camera 'SN-STUB-0000' is held by pid 12345 (requested 'SN-OTHER-0001')

## See Also

- [close](close.md) - idempotent release
- [status](status.md) - inspect current lease/stream state
