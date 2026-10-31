# Subtask 01: Research and Root Cause Analysis

- **Slug**: `button-functionality-and-user-experience-improvement - Task 01`
- **Owner**: Research & RCA Specialist
- **Status**: COMPLETE

## Objectives
1. Investigate the failure modes of the titlebar window control buttons: Minimize, Maximize/Fullscreen, Close.
2. Uncover the root cause behind the `"http://127.0.0.1:5173 - To exit full screen, press Esc"` security toast.
3. Diagnose startup blank screen latency and absence of audit telemetry.
4. Document full 4-part RCA in `02-spec/21-app/84-button-functionality-and-user-experience-improvement/02-root-cause-analysis-spec.md`.

## Key Findings
- `--start-fullscreen` creates an isolated kiosk mode that rejects external Win32 `SW_MINIMIZE` and `SW_RESTORE`.
- `document.documentElement.requestFullscreen()` triggers Chromium's security banner.
- Window title substring matching in `BE/routes/shutdown.py` failed due to dynamic or unhydrated document titles.
- `_close_window()` spawned a heavy `powershell.exe` instance taking >2 seconds to execute.
- Empty `<body>` in Vite SPA caused a 2-4 second blank screen before React mount.
