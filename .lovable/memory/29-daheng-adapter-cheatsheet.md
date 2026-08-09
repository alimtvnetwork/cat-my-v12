# 29 - Daheng Adapter Cheatsheet

- **Provider**: Set `camera.provider=daheng` (or `--provider daheng` in CLI) to use the real adapter.
- **Hardware Tests**: Set `LOVABLE_HW_DAHENG=1` to run hardware smoke tests in `BE/tests/hardware/test_daheng_smoke.py`.
- **Primitives**: Interaction with the SDK goes through `BE/sdk_facade/vendors/daheng/primitives.py`. Every primitive is wrapped in `@map_gxipy_errors` for safe error boundaries, observability, and metrics.
- **Node Names Used**: `ExposureTime`, `Gain`, `OffsetX`, `OffsetY`, `Width`, `Height`, `BalanceRatioSelector` (Red/Green/Blue), `TriggerMode`, `TriggerSource`, `TriggerActivation`, `TriggerDelay`, `TriggerSoftware`, `LineSelector`, `LineStatus`, `UserOutputValue`.
- **Timeouts**: `grab` and `trigger_once` use a default `1000ms` timeout. Override via parameter.
- **Reconnect Knobs**: Handled by the adapter lifecycle state machine (Plan 90 S186). Reconnect policy uses exponential backoff.
- **Errors**: Translated to `E_CAM_*` and `E_BE_*` via the central registry.
- **Replay**: `ReplayCameraFacade` is available for CI via `.npy` fixtures (recorded via `scripts/record-daheng-fixture.py`).
