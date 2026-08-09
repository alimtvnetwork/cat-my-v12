# worker-cli open-stream

Open a camera, start a bounded grab loop, and block until either the
frame budget is exhausted or a SIGINT/SIGTERM arrives. Combines
`open` + `stream start` + drain into a single foreground invocation
suitable for supervised worker processes.

## Usage

    worker-cli open-stream --serial <SERIAL> [--max-frames N] [--timeout SEC]

## Flags

| Flag         | Default | Description                                    |
| ------------ | ------- | ---------------------------------------------- |
| --serial     | (req)   | Device serial.                                 |
| --max-frames | 0       | 0 = unbounded until signal; else stop after N. |
| --timeout    | 0       | 0 = no wall-clock cap; else stop after SEC.    |

## Prerequisites

- Serial visible in `worker-cli list-devices`.
- No other holder of the same camera lease.

## Examples

### Example 1: 30-frame smoke run

    worker-cli open-stream --serial SN-STUB-0000 --max-frames 30

**Output:**

    {"Results":[{"FramesGrabbed":30,"Reason":"budget"}]}

### Example 2: run until SIGINT

    worker-cli open-stream --serial SN-STUB-0000

**Output:**

    {"Results":[{"FramesGrabbed":812,"Reason":"signal"}]}

## See Also

- [stream](stream.md) - split-phase start/stop for long-lived streaming
- [capture-frames](capture-frames.md) - grab + persist via StorageFacade
