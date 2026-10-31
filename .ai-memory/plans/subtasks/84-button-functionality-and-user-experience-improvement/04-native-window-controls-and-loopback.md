# Subtask 04: Deterministic Win32 Controls and Launcher Polish

- **Slug**: `button-functionality-and-user-experience-improvement - Task 04`
- **Owner**: Systems & Backend Specialist
- **Status**: PENDING

## Objectives
1. In `run.ps1`:
   - Replace `--start-fullscreen` with `--start-maximized`.
   - Suppress unformatted JSON dumps from Split-DB bootstrap and Uvicorn.
   - Enforce uniform two-space indentation and 12-char column padding.
2. In `BE/routes/shutdown.py`:
   - Implement PID-based HWND resolution inspecting processes with `--user-data-dir=.../.browser-profile`.
   - Enhance `_minimize_window()` with `SW_FORCEMINIMIZE` and `SW_MINIMIZE`.
   - Enhance `_toggle_maximize_window()` toggling between `SW_RESTORE` and `SW_MAXIMIZE`.
   - Enhance `_close_window()` with `WM_CLOSE` and instant process termination via `taskkill /F /PID` (<10ms).

## Target Files
- `run.ps1`
- `BE/routes/shutdown.py`
