# Daheng Galaxy SDK Integration

This package implements the `CameraFacadeProtocol` over the Daheng Galaxy `gxipy` SDK.

## DLL Search Order and Installation

The Python wrapper (`gxipy`) is a thin ctypes shim over `GxIAPI.dll` (Windows) or `libgxiapi.so` (Linux).
For `import gxipy` to succeed:

1. The host must have the Daheng driver installed.
2. The directory containing the native library must be in the `PATH` (Windows) or `LD_LIBRARY_PATH` (Linux).
3. The `GENICAM_ROOT_V3_2` (or similar depending on the version) environment variable must be set.

## Reconnect Policy

Per `spec/21-app/73`, the adapter implements an exponential backoff reconnect policy:

- Delays: 200ms, 500ms, 1s, 2s, 5s.
- Capped at 5 attempts.
- The correlation id is preserved in every log line to trace the reconnect lifecycle.
