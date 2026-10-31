# 01 - Runner Optimization & Terminal Lifecycle Specification

- **Specification ID**: `SPEC-87-01`
- **Module**: `Runner / Shell / TerminalLifecycle`
- **Status**: Verified Specification
- **Date**: 2026-10-31

---

## 1. Executive Summary

This specification addresses the developer ergonomics and stability issues identified in `run.ps1`:
1. **Elimination of Local Archive Packaging**: During local execution, compressing `chromium-shell` into `public\app-shell.zip` was completely redundant and produced `Test-Path : Illegal characters in path` exceptions. Local execution requires only serving the Vite frontend and launching the browser window with `--app`.
2. **Clean Process Tree Termination**: Replacing blunt PID killing with tree termination (`taskkill /pid $procId /T /F`), ensuring no child `vite.cmd`, `node.exe`, or `uvicorn` processes remain running while guaranteeing the host PowerShell console process is never killed.

---

## 2. Technical Implementation

### 2.1 Local Archive Removal (`run.ps1`)
- Lines 284–305: Removed the `Compress-Archive` block.
- Preflight verifies local ports and launches processes without attempting zip packaging.

### 2.2 Process Tree Teardown (`run.ps1`)
- In `finally`:
  ```powershell
  foreach ($job in $jobs) {
      if ($job -and -not $job.HasExited) {
          # Terminate entire process tree including spawned child nodes/uvicorn
          Start-Process -NoNewWindow -Wait -FilePath "taskkill" -ArgumentList "/pid $($job.Id) /T /F" -ErrorAction SilentlyContinue
      }
  }
  ```
- Protects the parent console (`$PID`) from being terminated.
