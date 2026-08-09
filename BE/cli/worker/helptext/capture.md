# worker-cli capture

Single-shot capture on the held camera. Refuses when a Step 46 stream
marker is active to prevent resource races (spec 74 §Acceptance #4).
The in-memory stub raises `E_CAM_CAPTURE_FAILED` per the "no fabricated
frames" rule; the vendor adapter (Phase 12) produces a real Frame.

## Usage

    worker-cli capture --serial <SERIAL> [--key <STORAGE_KEY>]

## Flags

| Flag     | Default | Description                                              |
| -------- | ------- | -------------------------------------------------------- |
| --serial | (req)   | Held camera serial.                                      |
| --key    | (auto)  | Storage key override; default is a ULID under sessions/. |

## Prerequisites

- Lease held: `worker-cli open --serial <SERIAL>`.
- No active stream marker (see `stream stop`).

## Examples

### Example 1: single shot

    worker-cli capture --serial SN-STUB-0000

**Output:**

    E_CAM_CAPTURE_FAILED: in-memory facade does not fabricate frames

### Example 2: refuse during active stream

    worker-cli capture --serial SN-STUB-0000

**Output:**

    E_BE_CONFLICT: capture refused while stream marker is active

## See Also

- [capture-frames](capture-frames.md) - bounded batch variant
- [status](status.md) - inspect lease and stream marker
