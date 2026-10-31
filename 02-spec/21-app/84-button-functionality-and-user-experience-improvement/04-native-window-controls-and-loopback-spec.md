# 04 - Native Window Controls and Loopback Specification

## 1. Overview
This specification defines the deterministic Win32 window discovery, state querying, and manipulation routines exposed via FastAPI loopback endpoints.

---

## 2. Window Identification Protocol

### 2.1 Process ID Resolution
Instead of relying on fragile window title text, the backend resolves the browser window via its dedicated user data directory profile:
1. Scan running processes named `chrome.exe` or `msedge.exe`.
2. Match command line argument containing `.browser-profile`.
3. Extract matching Process IDs (`target_pids`).

### 2.2 HWND Resolution via `EnumWindows`
1. Iterate over all top-level windows using `EnumWindows`.
2. Retrieve the owning PID using `GetWindowThreadProcessId(hwnd, ctypes.byref(pid))`.
3. If `pid.value in target_pids`:
   - Verify `IsWindowVisible(hwnd) == TRUE`.
   - Verify `GetWindowRect(hwnd, ctypes.byref(rect))` yields `width > 400` and `height > 300`.
   - Store matching `hwnd`.

---

## 3. Window Control Operations

### 3.1 Minimize (`POST /window/minimize`)
- Call `user32.ShowWindow(hwnd, 11)` (`SW_FORCEMINIMIZE`).
- Call `user32.ShowWindow(hwnd, 6)` (`SW_MINIMIZE`).
- Call `user32.CloseWindow(hwnd)`.
- Returns `{ "isMinimized": true }`.

### 3.2 Maximize / Restore Toggle (`POST /window/maximize`)
- Check `user32.IsZoomed(hwnd)`.
- If `IsZoomed(hwnd)` is true:
  - Call `user32.ShowWindow(hwnd, 9)` (`SW_RESTORE`).
  - Returns `{ "isMaximized": false, "state": "restored" }`.
- If `IsZoomed(hwnd)` is false:
  - Call `user32.ShowWindow(hwnd, 3)` (`SW_MAXIMIZE`).
  - Returns `{ "isMaximized": true, "state": "maximized" }`.

### 3.3 Close & Clean Teardown (`POST /window/close` & `POST /shutdown`)
- Call `user32.PostMessageW(hwnd, 0x0010, 0, 0)` (`WM_CLOSE`).
- Immediately terminate the browser process tree using `taskkill /F /T /PID <pid>` (<10ms latency).
- Arm a 50ms daemon timer to exit the Python process cleanly (`os._exit(0)`).
- Returns `{ "isClosed": true }`.
