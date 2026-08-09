# Daheng Galaxy SDK Host Matrix

**Status:** Verified on Windows Dev VM
**SDK Version:** 1.0.2401.9051 (or latest 1.0.x)

## Baseline Requirements

1. **OS**: Windows 10/11 x64
2. **Driver**: Daheng Galaxy USB3.0/GigE Driver installed and visible in Device Manager.
3. **Environment Variable**: `GENICAM_ROOT_V3_2` (or similar) MUST be set by the installer.
4. **DLL Search Path**: The directory containing `GxIAPI.dll` must be in the `PATH` or adjacent to the `gxipy` wheel.

## Deviations

- None observed so far. The standard Daheng MSI installer configures the registry and PATH correctly for `gxipy` to locate the unmanaged DLLs.

## Verification

- If `import gxipy` fails with `FileNotFoundError: Could not find module 'GxIAPI.dll'`, it means the host PATH is missing the Daheng bin directory.
