# Specification 82: End-to-End CLI Verification Matrix

## Automated Test Cases
| ID | Category | Target | Expected Result | Pass Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **TC-82-01** | UI Menu | `StandardAppShell` DropdownMenu | Aligned at trigger bottom-left, no jumping to `(0, 0)` | `avoidCollisions=false`, `align=start`, `side=bottom` |
| **TC-82-02** | UI Menu | Menu hover transition | Cursor entering trigger/content maintains open state stably | No jitter or re-positioning flicker |
| **TC-82-03** | Window | `btn-window-minimize` | Sends `POST /window/minimize`, minimizes native window | Returns HTTP 200, no error toasts |
| **TC-82-04** | Window | `btn-window-maximize` | Sends `POST /window/maximize`, toggles native window size | Returns HTTP 200, no error toasts |
| **TC-82-05** | Window | `btn-window-close` | Sends `POST /window/close` and `POST /shutdown` | Clean exit, no "Alt+F4" modal dialog |
| **TC-82-06** | CLI | `run.ps1` formatting | ANSI banner, colored status rows, process supervision | Exits cleanly when browser or backend terminates |
