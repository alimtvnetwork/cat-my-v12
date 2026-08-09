# worker-cli capture-frames

Bounded grab loop that hands each `Frame` to `StorageFacade.put()`.
Uses the held lease and, when active, the Step 46 stream marker so
persisted frames are always attributable to a known session.

## Usage

    worker-cli capture-frames --serial <SERIAL> --count N [--session <ID>]

## Flags

| Flag      | Default | Description                                |
| --------- | ------- | ------------------------------------------ |
| --serial  | (req)   | Held camera serial.                        |
| --count   | (req)   | Number of frames to grab and persist.      |
| --session | (auto)  | Session id used in the storage key prefix. |

## Prerequisites

- `worker-cli open --serial <SERIAL>` must have succeeded.
- `APP_DATA_ROOT` must be writable (see `doctor`).

## Examples

### Example 1: grab 10 frames

    worker-cli capture-frames --serial SN-STUB-0000 --count 10

**Output:**

    {"Results":[{"Persisted":10,"Session":"01J...","StorageKeyPrefix":"sessions/01J.../frames"}]}

### Example 2: refuse without a lease

    worker-cli capture-frames --serial SN-STUB-0000 --count 1

**Output:**

    E_CLI_PREFLIGHT_FAILED: no camera lease held

## See Also

- [capture](capture.md) - single-shot variant
- [open-stream](open-stream.md) - combined open + drain
