# 06 - E2E Verification and Test Matrix Specification

## 1. Test Matrix

| ID | Test Scenario | Expected Result | Automation Tool |
| :--- | :--- | :--- | :--- |
| **TC-01** | Initial app startup | Pre-hydration splash displays with Cat Vision logo, spinner, and version badge; smoothly fades out upon hydration. | Unit test / Playwright / DOM probe |
| **TC-02** | Click Minimize button | Sends `POST /window/minimize`, resolves HWND, executes `SW_MINIMIZE`, returns `isMinimized: true`. | `bun test` + `pytest` |
| **TC-03** | Click Maximize / Restore | Sends `POST /window/maximize`, queries `IsZoomed()`, toggles `SW_RESTORE` or `SW_MAXIMIZE`, updates icon state without browser Esc banner. | `bun test` + `pytest` |
| **TC-04** | Click Close button | Triggers exit dialog or direct close, sends `POST /window/close` and `POST /shutdown`, shuts down uvicorn and Vite, terminates processes in <100ms. | `bun test` + `pytest` |
| **TC-05** | Error capture & Stack trace | Failed calls emit structured error payload into `useErrorStore` and write traceback to Split-DB `system_errors`. | `pytest` + unit test |
| **TC-06** | `run.ps1` execution | Starts cleanly without syntax errors, suppresses unpadded JSON dumps, launches Chromium with `--start-maximized`. | PowerShell execution test |
