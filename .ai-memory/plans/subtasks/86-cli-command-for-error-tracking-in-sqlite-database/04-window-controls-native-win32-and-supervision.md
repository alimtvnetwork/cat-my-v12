# Subtask 04: Window Controls Native Win32 & Supervision

## Status: Completed

## Implemented
1. In `run.ps1`:
   - Writes `$chromeProcess.Id` to `.logs/browser.pid`.
   - Pre-warms Vite root view before launching browser.
   - Clean exit handling and termination of all background processes when window closes.
2. In `BE/routes/shutdown.py`:
   - Reads `.logs/browser.pid` and matches strictly against `chrome.exe` / `msedge.exe` / `chromium.exe` with class `Chrome_WidgetWin_1`.
   - Never targets IDE/editor processes (such as Antigravity).
3. In `src/components/layout/WindowControlButtons.tsx`:
   - Native minimize, maximize/restore, and instant exit without HTML5 fullscreen banner.
