# 02 - Root Cause Analysis Specification: Window Controls & Startup UX

## 1. Executive Summary

A comprehensive 4-Part Root Cause Analysis (RCA) was conducted across the frontend UI shell, backend FastAPI routes, and PowerShell launcher scripts to diagnose:
1. Why the top-right window buttons (Minimize, Maximize, Close) failed to respond or exhibited noticeable delays.
2. Why Chromium displayed the intrusive security prompt `"http://127.0.0.1:5173 — To exit full screen, press Esc"`.
3. Why the application opened with a prolonged blank/empty screen on startup.
4. Why errors occurred silently with zero stack traces or audit entries recorded.

---

## 2. 4-Part Root Cause Analysis

### RCA-01: Top-Right Window Controls Unresponsive & Delayed

#### Part 1: Symptoms and Context
- Clicking **Minimize (`—`)** had zero visual effect on the Chromium window.
- Clicking **Maximize / Fullscreen (`▢`)** caused an intrusive security overlay to appear (`"http://127.0.0.1:5173 — To exit full screen, press Esc"`).
- Clicking **Close (`✕`)** took 2 to 4 seconds to dismiss the application window, creating the perception of a frozen or crashed process.

#### Part 2: Proximate Cause
- `WindowControlButtons.tsx` called both `fetch('/window/maximize')` and HTML5 `document.documentElement.requestFullscreen()`. The HTML5 fullscreen API triggers the Chromium security banner.
- `_find_window_hwnd()` in `BE/routes/shutdown.py` searched for window titles matching keywords like `"cat vision"`, but Chromium `--app` mode uses dynamic route titles or hostname URLs before title hydration, causing HWND resolution to fail and return `None`.
- `_close_window()` spawned a child `powershell.exe` process to query `Get-CimInstance Win32_Process`, taking up to 2,500ms to initialize the CLR and scan processes.

#### Part 3: Systemic Cause
- Lack of end-to-end integration between the browser frontend and native OS windowing. The system relied on optimistic heuristics (window title substrings and heavy PowerShell process scanning) instead of direct Win32 process ID correlation.
- `run.ps1` used `--start-fullscreen`, which locks Chromium into an exclusive kiosk mode where standard Win32 `SW_MINIMIZE` and `SW_RESTORE` commands are rejected.

#### Part 4: Preventative Action & Architectural Invariants
- Replace `--start-fullscreen` with `--start-maximized` in `run.ps1`.
- In `BE/routes/shutdown.py`, resolve HWND directly by inspecting the PID of the Chromium process attached to `--user-data-dir=.../.browser-profile`.
- In `_close_window()`, replace the 2.5s PowerShell child process with instant `taskkill /F /PID <pid>` or `kernel32.TerminateProcess`, terminating in <10ms.
- Eliminate HTML5 `requestFullscreen()` from `WindowControlButtons.tsx`, relying purely on native Win32 window maximize/restore.

---

### RCA-02: Blank / Empty Screen Latency on Application Startup

#### Part 1: Symptoms and Context
- Upon running `.\run`, the browser opens immediately, but the operator sees a completely blank, empty screen for 2 to 4 seconds before the inspection interface appears.

#### Part 2: Proximate Cause
- In Vite dev mode and TanStack Start, the server returns an empty `<body>` tag containing only script references (`<script type="module" src="...">`).
- The browser must fetch, parse, and execute hundreds of JavaScript modules before React hydrates and renders the first DOM element.

#### Part 3: Systemic Cause
- No pre-hydration placeholder or static splash screen was embedded in `src/routes/__root.tsx`. The DOM remained completely unpopulated until full React runtime mount.

#### Part 4: Preventative Action & Architectural Invariants
- Embed an inline, zero-external-dependency HTML/CSS splash screen (`#app-pre-hydration-splash`) directly into `RootShell` in `src/routes/__root.tsx`.
- Include the Cat Vision brand SVG, pulsing industrial spinner, and live version badge (`v4.113.15`).
- Ensure graceful CSS fade-out upon React hydration with zero layout shift or hydration mismatch errors.

---

### RCA-03: Silent Error Swallowing & Missing Audit Stack Traces

#### Part 1: Symptoms and Context
- When window controls failed, no errors appeared in the developer console, no notifications were displayed, and no error entries were written to the SQLite Split-DB `system_errors` table.

#### Part 2: Proximate Cause
- In `src/components/layout/WindowControlButtons.tsx`, all network calls were wrapped in `.catch(() => {})`, completely discarding rejected promises and network errors.
- In `BE/routes/shutdown.py`, all Win32 calls used bare `except Exception: return False` or `pass`, without capturing stack traces or logging failure reasons.

#### Part 3: Systemic Cause
- Premature suppression of exceptions during initial prototyping that was never upgraded to enterprise error management standards (`AppError`, `useErrorStore`, Split-DB audit logging).

#### Part 4: Preventative Action & Architectural Invariants
- Enforce the **Universal Error Management Standard**: every window control action must record an audit entry with correlation ID, component name, timestamp, and action parameters.
- If an endpoint or Win32 call fails, format the exception into an `AppError`, write it to the `system_errors` table in Root-DB, and capture it in the frontend `useErrorStore` with full stack traces.
