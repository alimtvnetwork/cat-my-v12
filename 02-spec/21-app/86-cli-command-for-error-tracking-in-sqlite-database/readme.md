# Specification: CLI Command for Error Tracking in Split SQLite Database

## 1. Overview & Purpose
This specification governs repository-wide error tracking, storage, retrieval, and diagnostic reporting across both tiers of the SQLite Split-DB architecture:
- **Root Tier (`root.db`)**: Table `SystemError` (written by `BE/repos/sqlite_error_repo.py`, migration `0021_system_errors.sql`). Tracks system-level exceptions, fatal crashes, unhandled FastAPI server errors, and database migration faults.
- **Task Tier (`task.db`)**: Table `Error` (written by `BE/app/db/writers/error.py`, migration `0029_task_errors.sql`). Tracks invocation-scoped errors, frontend `CapturedError` records, API contract errors, and interactive runtime exceptions.

A dedicated CLI command (`python -m BE.cli.processing.main errors` / `processing-cli errors`) enables developers and autonomous AI agents to list, inspect, and export every recorded error with complete, unabridged stack traces directly from the terminal without opening a browser.

---

## 2. Root Cause Analysis (RCA)

### 2.1 Missing Errors in SQLite Database
- **Cause 1 (Frontend Sync Gating):** In `src/lib/errors/history-facade.ts`, `resolveBackendSyncTarget()` verified `mode === "backend"`. The default mode in `useBackendMode` was initialized to `"seed"` (`BackendModeType.Seed`). As a result, all captured errors on the client side silently skipped syncing to `POST /errors`, leaving `task.db` empty during normal operations.
- **Cause 2 (Split-DB Disconnect in CLI):** `BE/cli/processing/commands/errors.py` strictly opened and queried `task.db` (`get_task_conn()`). It never queried `root.db` (`SystemError`), meaning backend server errors and unhandled exceptions were invisible to the CLI.

### 2.2 Window Control Buttons Failure & Delayed Close
- **Cause 1 (False HWND Match on Antigravity / IDE):** In `BE/routes/shutdown.py`, `_find_window_hwnd()` matched any visible window whose title contained keywords like `"rules"`, `"setup"`, `"cat"`, or `"cat-my"`. In development, Antigravity or VS Code holds a workspace named `cat-my`, causing `_find_window_hwnd()` to latch onto PID 4624 (the IDE) instead of Chromium. Win32 commands (`ShowWindow`, `taskkill`) were directed at the wrong process.
- **Cause 2 (HTML5 Fullscreen Fallback):** When `POST /window/maximize` failed, `WindowControlButtons.tsx` fell back to `document.documentElement.requestFullscreen()`, which triggered Chrome's black "To exit full screen, press Esc" banner instead of a native OS window maximize.
- **Cause 3 (Close Button Delay & Supervision):** `POST /window/close` tried to terminate the wrong PID or timed out before terminating the backend.

### 2.3 Rule Set Version Conflict Toast (`rule set version is behind server`)
- **Cause:** In `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`, `handleSaveRuleSet` called `await saveRuleSet(envelope); onSaved(envelope);` instead of passing the committed envelope (`const committed = await saveRuleSet(envelope); onSaved(committed);`). The stale version was preserved in the client state, making every subsequent save fail with HTTP 409 `E_BE_CONFLICT`.

### 2.4 ROI Shape Auto-Squaring & Boundary Spilling
- **Cause 1 (Auto-Squaring):** `RuleRightToolbarPanel.tsx` forced `width: side, height: side` whenever `shapeType === "square"`. `pinned-pattern-geometry.ts` called `squareSearchRegion(rebased)`. `VisualToolWorkpieceCanvas.tsx` evaluated `const needsSquare = roi.width !== roi.height` and re-pinned the rule in an effect loop.
- **Cause 2 (Boundary Spilling):** ROI coordinates (`x`, `y`, `width`, `height`) during drag and corner resizing lacked upper-bound clamping against natural image dimensions (`naturalW`, `naturalH`), allowing the bounding box to spill out into the black canvas letterbox.

---

## 3. Architecture & Functional Requirements

### 3.1 Unified CLI Error Tracking (`processing-cli errors`)
1. **Tier Awareness (`--tier all|task|root`)**:
   - `--tier all` (default): Queries both `task.db` (`Error`) and `root.db` (`SystemError`), merging records by `CreatedAt` descending.
   - `--tier task`: Queries only `task.db`.
   - `--tier root`: Queries only `root.db`.
2. **Terminal Trace Formatting (`--trace` / default human output)**:
   - Formatted summary header: Code, Severity, Timestamp, Trigger Component/Subsystem, Correlation ID.
   - Formatted stack trace with visible line breaks.
   - JSON output preserved when requested or piped.

### 3.2 Frontend Error Synchronization (Zero Swallow)
1. `resolveBackendSyncTarget()` in `src/lib/errors/history-facade.ts` falls back to `DEFAULT_BACKEND_URL` (`http://127.0.0.1:8787`) whenever `localStorage` lacks an explicit override, ensuring all frontend exceptions land in `task.db`.
2. Save errors, window control failures, and canvas pixel caching failures are captured into `useErrorStore` and persisted.

### 3.3 Native Win32 Window Controls & Process Supervision
1. `run.ps1` writes the browser PID to `.logs/browser.pid` upon launch.
2. `BE/routes/shutdown.py` prioritizes `.logs/browser.pid` and matches only `chrome.exe` / `msedge.exe` with class `Chrome_WidgetWin_1`.
3. `POST /window/maximize` performs native `SW_MAXIMIZE` / `SW_RESTORE` without triggering HTML5 fullscreen.
4. `POST /window/close` closes the window and immediately shuts down the backend, causing `run.ps1` to terminate all background jobs cleanly.

### 3.4 ROI Natural Boundary Clamping
1. Clamp `roi.x` to `[0, naturalW - 16]`.
2. Clamp `roi.y` to `[0, naturalH - 16]`.
3. Clamp `roi.width` to `[16, naturalW - roi.x]`.
4. Clamp `roi.height` to `[16, naturalH - roi.y]`.
5. Remove all aggressive auto-squaring so rectangular ROIs are preserved.

### 3.5 Bug Recorder Multi-Action Export Suite
Replace the single "Export ZIP" button with a 4-action dropdown:
1. `Export ZIP` (Full session archive with screenshots).
2. `Copy Prompt for AI / IDE` (Formatted Markdown with `file:///` screenshot paths).
3. `Save to Local Machine` (`POST /bug-reports/local` writing `.logs/recorded-bugs/<id>/`).
4. `Inspect in CLI` (`python -m BE.cli.processing.main errors list --session-id <id>`).
