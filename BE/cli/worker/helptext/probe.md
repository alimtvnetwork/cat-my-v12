# worker-cli probe

Exercise the SDK facade spine with zero hardware side effects: enumerate
devices via the in-memory `CameraFacade` and emit the count in the log
session index. This is the smoke test CI uses to prove the substrate
before any capture subcommand runs.

## Usage

    worker-cli probe [--provider memory|vendor]

## Flags

| Flag       | Default | Description                                        |
| ---------- | ------- | -------------------------------------------------- |
| --provider | memory  | Facade to enumerate. `vendor` is Phase 12 (fails). |

## Prerequisites

- None. Read-only; no lease, no DB, no marker files touched.

## Examples

### Example 1: default in-memory probe

    worker-cli probe

**Output:**

    {"Status":{"IsSuccess":true,"Code":200,...},"Results":[{"Serial":"SN-STUB-0000","Model":"MER2-STUB",...}]}

### Example 2: vendor probe (fails until Phase 12)

    worker-cli probe --provider vendor

**Output:**

    E_CLI_UNSUPPORTED_HOST: vendor CameraFacade not wired yet (Plan 90 Phase 12)

## See Also

- [list-devices](list-devices.md) - richer per-device payload for UI consumers
- [doctor](doctor.md) - full preflight (SDK + config + log root + DB tiers)
