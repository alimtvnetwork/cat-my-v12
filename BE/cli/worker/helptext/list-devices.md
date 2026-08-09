# worker-cli list-devices

Enumerate cameras via `CameraFacade.list_devices()` and emit a
`DeviceInfo` array in the Universal Envelope. This is the payload the FE
uses to populate the device picker (spec 74 §Acceptance #2).

## Usage

    worker-cli list-devices [--provider memory|vendor]

## Flags

| Flag       | Default | Description                                |
| ---------- | ------- | ------------------------------------------ |
| --provider | memory  | Facade to enumerate. `vendor` is Phase 12. |

## Prerequisites

- None. Side-effect free.

## Examples

### Example 1: list stub devices

    worker-cli list-devices

**Output:**

    {"Results":[{"Serial":"SN-STUB-0000","Model":"MER2-STUB","Vendor":"Daheng","Interface":"USB3","Status":"Available"}]}

### Example 2: pipe into a serial picker

    worker-cli list-devices | jq -r '.Results[].Serial'

**Output:**

    SN-STUB-0000

## See Also

- [probe](probe.md) - minimal enumeration smoke test
- [open](open.md) - acquire the single-camera lease on a chosen serial
