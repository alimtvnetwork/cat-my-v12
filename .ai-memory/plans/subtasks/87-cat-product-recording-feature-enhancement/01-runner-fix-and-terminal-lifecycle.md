# Subtask 01: Runner Speed Optimization & Terminal Lifecycle

- **Task**: `cat-product-recording-feature-enhancement - Subtask 01`
- **Module**: `AppRuntime / DevRunner / TerminalLifecycle`
- **Owner**: Runner Stability Engineer (`dfc7bbd1-2077-4e0a-af00-cf6b50bb5c73`)
- **Status**: READY_FOR_EXECUTION
- **Target Files**: `run.ps1`, `scripts/dev/wait-for-http.ps1`, `BE/routes/shutdown.py`
- **Reference Spec**: `02-spec/21-app/87-cat-product-recording-feature-enhancement/01-runner-speed-and-terminal-lifecycle-spec.md`

---

## 1. Context & Objectives

Local runs via `run.ps1` are currently sluggish (taking 5–18 seconds) and cause terminal corruption upon exit. This subtask implements surgical modifications to `run.ps1` to achieve:
1. **Instant Cold Startup (< 1.5s)**: Remove the redundant `Compress-Archive` loop from local runs, fix path escape character bugs (`\a` ASCII Bell), and optimize health check polling.
2. **Deterministic Process Teardown**: Replace PowerShell's `Stop-Process` with Win32 recursive tree kills (`taskkill /F /T /PID`), preventing orphaned `python.exe` / `uvicorn` processes from holding port 8787.
3. **Console Mode Restoration**: Restore cursor visibility, clear input buffers, and reset ANSI text modes in `finally` blocks, preventing the terminal from freezing or losing echo after Ctrl+C.

---

## 2. Root Cause Analysis Summary

| Defect | File & Location | Mechanism | Remediation |
| :--- | :--- | :--- | :--- |
| **Zipping Overhead** | `run.ps1` L284–305 | Synchronous `Compress-Archive` on every launch recurses `chromium-shell` | Relegate to `-PackageShell` switch; bypass completely for local dev |
| **Path Escape (`\a`)** | `run.ps1` L248, L287–302 | `\a` in `"public\app-shell.zip"` parses as ASCII 0x07 (BEL), causing `Illegal characters in path` | Normalize all paths to forward slashes `/` (`public/app-shell.zip`, `./run.ps1`) |
| **Orphaned Uvicorn** | `run.ps1` L186, L379 | `uv run` spawns child `python.exe`. `Stop-Process` only kills `uv.exe`, leaving child `python.exe` binding port 8787 | Use `taskkill /F /T /PID` to terminate the entire process hierarchy |
| **Console Hijacking** | `run.ps1` L186, L228 | `-NoNewWindow` inherits console modes; Ctrl+C aborts without resetting `ENABLE_ECHO_INPUT` / `ENABLE_LINE_INPUT` | Add console mode restoration (`CursorVisible`, `ResetColor`, ANSI reset) in `finally` |
| **Missing Graceful Exit** | `run.ps1` L375–385 | Abrupt SIGKILL bypasses SQLite WAL checkpointing and camera driver release | Send `POST http://127.0.0.1:8787/shutdown` before tree kill fallback |

---

## 3. Step-by-Step Execution Plan

### Step 1: Normalize String Paths & Eliminate Escape Characters
- In `run.ps1`:
  - Replace `"public pp-shell.zip"` and `"public\app-shell.zip"` with `'public/app-shell.zip'`.
  - Fix `"run .un.ps1 again"` on line 248 to `"run .\run.ps1 again"` or `"run ./run.ps1 again"`.
  - Ensure all path variables (`$userDataDir`, `$dbOutLog`, `$BackendOutLog`) use forward slashes or `Join-Path` without unescaped backslashes.

### Step 2: Remove Local Shell Zipping Overhead
- In `run.ps1` lines 273–305:
  - Add optional parameter `[switch]$PackageShell = $false`.
  - Wrap the zipping logic in `if ($PackageShell) { ... }`.
  - In normal dev runs (default), skip zipping entirely. This immediately eliminates 4–12 seconds of disk I/O and CPU thrashing.

### Step 3: Implement Win32 Process Tree Termination Helper
- In `run.ps1`, define helper function `Stop-ProcessTree`:
  ```powershell
  function Stop-ProcessTree([int]$ProcessId) {
      if ($ProcessId -le 0) { return }
      $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
      if ($null -ne $proc) {
          & taskkill.exe /F /T /PID $ProcessId 2>&1 | Out-Null
      }
  }
  ```
- Replace all calls to `Stop-Process -Id $job.Id -Force` with `Stop-ProcessTree -ProcessId $job.Id`.

### Step 4: Integrate Graceful Backend Teardown Hook
- In `run.ps1` before invoking `taskkill`:
  ```powershell
  function Invoke-GracefulBackendShutdown([string]$HostIp, [int]$Port) {
      $url = "http://$HostIp`:$Port/shutdown"
      try {
          Invoke-RestMethod -Method Post -Uri $url -TimeoutSec 1 -ErrorAction Stop | Out-Null
          Start-Sleep -Milliseconds 80
      } catch {}
  }
  ```
- Call `Invoke-GracefulBackendShutdown -HostIp $HostIp -Port $BePort` at the start of the `finally` teardown block.

### Step 5: Implement Port Lingering Defense & Cleanup
- In `run.ps1` `finally` block, verify ports 8787 and 5173 are freed:
  ```powershell
  function Free-PortIfBound([int]$Port) {
      try {
          $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
          foreach ($c in $conns) {
              if ($c.OwningProcess -gt 0) {
                  Stop-ProcessTree -ProcessId $c.OwningProcess
              }
          }
      } catch {}
  }
  ```
- Invoke `Free-PortIfBound -Port $BePort` and `Free-PortIfBound -Port $FePort`.

### Step 6: Implement Console Mode State Preservation & Restoration
- At the top of `run.ps1`:
  ```powershell
  $OriginalCursorState = $true
  try { $OriginalCursorState = [System.Console]::CursorVisible } catch {}
  ```
- In the `finally` block of `run.ps1`:
  ```powershell
  try {
      [System.Console]::CursorVisible = $true
      [System.Console]::ResetColor()
  } catch {}
  Write-Host "$([char]27)[0m$([char]27)[?25h" -NoNewline
  ```

### Step 7: Fast-Track Loopback Polling
- In `run.ps1` line 189 and line 259:
  - Reduce poll sleep intervals from `Start-Sleep -Seconds 1` to `Start-Sleep -Milliseconds 100`.
  - Cap loopback timeout to fast failure.

---

## 4. Verification & Testing Procedure

1. **Benchmark Startup Speed**:
   ```powershell
   Measure-Command { .\run.ps1 -NoShell }
   ```
   *Pass Criteria*: Total execution duration to healthy listening state is `< 1.5 seconds`.

2. **Verify Port Release on Interrupt**:
   - Start `.\run.ps1`.
   - Wait 3 seconds, then press `Ctrl+C`.
   - Run `Get-NetTCPConnection -LocalPort 8787 -ErrorAction SilentlyContinue`.
   *Pass Criteria*: Command returns null (no process holding port 8787).

3. **Verify Console Usability**:
   - Immediately following `Ctrl+C` exit, type test characters in the PowerShell prompt.
   *Pass Criteria*: Cursor is visible, text echoes immediately without glitches or invisible typing.

4. **Verify No Zip Creation**:
   - Inspect timestamp of `public/app-shell.zip`.
   *Pass Criteria*: Timestamp does not change across local runs unless `-PackageShell` is passed.

---

## 5. Rollback Strategy

If any regression occurs in developer environments:
1. Revert `run.ps1` to the previous commit using GitMap.
2. Keep the `Stop-ProcessTree` helper as it prevents orphan process leaks regardless of startup optimizations.
