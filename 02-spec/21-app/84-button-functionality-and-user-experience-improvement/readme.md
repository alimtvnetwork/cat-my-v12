# 84 - Button Functionality and User Experience Improvement

## Overview
This specification addresses the root causes of the titlebar window control unresponsiveness (minimize, full screen / maximize, close), the empty screen latency during application startup, and the lack of structured audit logging and stack trace telemetry.

## Directory Structure
- `01-architecture-spec.md`: End-to-end architecture bridging the Chromium HMI frontend, FastAPI backend loopback API, and native Windows OS window management.
- `02-root-cause-analysis-spec.md`: 4-part Root Cause Analysis detailing why Chromium `--start-fullscreen` suppresses native OS message loops, why `.catch(() => {})` concealed failures, and why hydration latency caused blank screens.
- `03-loading-spinner-and-version-showcase-spec.md`: Zero-latency inline HTML/CSS splash screen and version badge displayed instantly before React hydration.
- `04-native-window-controls-and-loopback-spec.md`: Robust Win32 window discovery via process PID and bounding rect, multi-method minimization (`SW_FORCEMINIMIZE`, `SW_MINIMIZE`, `CloseWindow`), and `--start-maximized` launch flag.
- `05-audit-logging-and-stack-trace-spec.md`: Structured audit telemetry across frontend (`useErrorStore`, `clientLogger`) and backend Split-DB logging (`system_errors`, `system_audit_logs`).
- `06-e2e-verification-and-test-matrix-spec.md`: Verification matrix, unit tests, and CLI validation scripts.

## Plan & Execution References
- Master Plan: `.ai-memory/plans/pending/84-button-functionality-and-user-experience-improvement.md`
- Subtasks Directory: `.ai-memory/plans/subtasks/84-button-functionality-and-user-experience-improvement/`
