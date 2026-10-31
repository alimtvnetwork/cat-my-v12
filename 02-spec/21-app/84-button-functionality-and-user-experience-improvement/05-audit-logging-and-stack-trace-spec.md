# 05 - Audit Logging and Stack Trace Telemetry Specification

## 1. Overview
This specification establishes mandatory structured audit logging and stack trace capture across the window management lifecycle, eliminating all silent catch blocks (`catch(() => {})`).

---

## 2. Telemetry Schema & Protocols

### 2.1 Frontend Telemetry (`useErrorStore` & Audit Dispatch)
Every user interaction on `WindowControlButtons.tsx` emits a structured audit record:
- `timestamp`: UTC ISO-8601 string.
- `correlationId`: UUIDv4 tracking the lifecycle of the user request.
- `component`: `"WindowControlButtons"`.
- `action`: `"minimize"` | `"toggleMaximize"` | `"confirmExit"` | `"dismissShutdown"`.
- `status`: `"dispatched"` | `"success"` | `"failure"`.
- `error`: Serialized error object including name, message, and full client stack trace if rejected.

### 2.2 Backend Audit & Error Storage (Split-DB `system_errors`)
When a window control endpoint is invoked:
1. Generate / forward `CorrelationId` via `CORRELATION_HEADER`.
2. Log standard structured JSON message to `BE.routes.shutdown` logger:
   - `logger`: `"BE.routes.shutdown"`
   - `operation`: `"POST /window/minimize"` | `"POST /window/maximize"` | `"POST /window/close"` | `"POST /shutdown"`
   - `hwnd`: Captured window handle integer.
   - `pid`: Associated Chromium process ID.
   - `win32_result`: Boolean outcome of user32 API calls.
3. On exception:
   - Extract full Python traceback using `traceback.format_exc()`.
   - Insert structured error record into `system_errors` in Root-DB.
   - Return 500 error envelope with serialized error code `E_WINDOW_CONTROL_FAILED`.
