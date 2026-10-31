"""POST /shutdown -> clean backend shutdown for the in-app Exit button.

Spec 54 section 8: the desktop app is a browser --app window, so the
frontend cannot close its own window and cannot stop backend-server.
The in-app Exit button calls this endpoint; the backend replies first,
then exits its own process on a short timer so the response is
delivered before shutdown starts.

Trust model: the backend binds loopback only (launcher sets BE_HOST to
127.0.0.1) and CORS allows only the local frontend origins. As defense
in depth, non-loopback callers get 403.

The frontend bun server is NOT stopped here: the desktop launcher
waits on the browser process and tears the frontend down when the
browser window closes (see packaging/desktop/start.ps1 and
packaging/desktop/start.sh). If the launcher is not running, the
already-loaded SPA keeps running from memory until the user closes the
browser window. That is honest browser behavior, not a crash.
"""

from __future__ import annotations

import logging
import os
import signal
import sys
import threading
import traceback
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success, failure
from BE.errors.apperror import AppError

logger = logging.getLogger("BE.routes.shutdown")

router = APIRouter()

_SHUTDOWN_DELAY_S = 0.05
_LOOPBACK_HOSTS = ("127.0.0.1", "::1", "localhost", "testclient")


def _is_loopback_client(request: Request) -> bool:
    """True when the caller connects from this machine only."""
    client = request.client

    if client is None:
        return True

    return client.host in _LOOPBACK_HOSTS


def _initiate_shutdown() -> None:
    """Exit this process immediately."""
    logger.info("shutdown_initiated", extra={"operation": "POST /shutdown"})
    try:
        os._exit(0)
    except Exception:
        os._exit(0)


def _schedule_shutdown() -> None:
    """Arm the exit timer so the HTTP response goes out first."""
    timer = threading.Timer(_SHUTDOWN_DELAY_S, _initiate_shutdown)
    timer.daemon = True
    timer.start()


# Win32 ShowWindow command constants
SW_MAXIMIZE = 3
SW_MINIMIZE = 6
SW_RESTORE = 9
SW_FORCEMINIMIZE = 11

WINDOW_TITLE_KEYWORDS = (
    "cat vision",
    "cat ivision",
    "control automation",
    "pick a workflow",
    "inspection",
    "rules",
    "setup",
    "trial run",
    "diagnostics",
    "projects",
    "ng events",
    "hmi",
    "5173",
    "cat",
    "vision",
    "cat-my",
)


def _get_process_image_name(pid: int) -> str:
    """Safely query process executable image path without shell tools."""
    try:
        import ctypes
        import ctypes.wintypes as w

        kernel32 = ctypes.windll.kernel32
        PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
        hproc = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
        if not hproc:
            return ""
        try:
            buf = ctypes.create_unicode_buffer(1024)
            size = w.DWORD(1024)
            if kernel32.QueryFullProcessImageNameW(hproc, 0, buf, ctypes.byref(size)):
                return buf.value.lower()
            return ""
        finally:
            kernel32.CloseHandle(hproc)
    except Exception:
        return ""


def _find_window_hwnd() -> tuple[int | None, int | None]:
    """Find the top-level Chromium embedded HMI window HWND and owning PID.
    
    Guaranteed to strictly target the HMI browser process and never IDE/editor processes.
    """
    if sys.platform != "win32":
        return None, None

    try:
        import ctypes
        import ctypes.wintypes as w

        user32 = ctypes.windll.user32
        user32.GetWindowTextLengthW.argtypes = [w.HWND]
        user32.GetWindowTextLengthW.restype = ctypes.c_int
        user32.GetWindowTextW.argtypes = [w.HWND, w.LPWSTR, ctypes.c_int]
        user32.GetWindowTextW.restype = ctypes.c_int
        user32.GetClassNameW.argtypes = [w.HWND, w.LPWSTR, ctypes.c_int]
        user32.GetClassNameW.restype = ctypes.c_int
        user32.IsWindowVisible.argtypes = [w.HWND]
        user32.IsWindowVisible.restype = w.BOOL
        user32.GetWindowRect.argtypes = [w.HWND, ctypes.POINTER(w.RECT)]
        user32.GetWindowRect.restype = w.BOOL
        user32.GetWindowThreadProcessId.argtypes = [w.HWND, ctypes.POINTER(w.DWORD)]
        user32.GetWindowThreadProcessId.restype = w.DWORD
        user32.IsZoomed.argtypes = [w.HWND]
        user32.IsZoomed.restype = w.BOOL
        user32.ShowWindow.argtypes = [w.HWND, ctypes.c_int]
        user32.ShowWindow.restype = w.BOOL
        user32.PostMessageW.argtypes = [w.HWND, w.UINT, w.WPARAM, w.LPARAM]
        user32.PostMessageW.restype = w.BOOL
        user32.CloseWindow.argtypes = [w.HWND]
        user32.CloseWindow.restype = w.BOOL

        # Check recorded browser PID from run.ps1 if present
        preferred_pid: int | None = None
        pid_file = Path(".logs/browser.pid")
        if pid_file.exists():
            try:
                content = pid_file.read_text(encoding="utf-8").strip()
                if content.isdigit():
                    preferred_pid = int(content)
            except Exception:
                pass

        # Attach current thread to the interactive desktop station (Session 1 WinSta0\Default)
        hdesk = user32.OpenDesktopW("default", 0, False, 0x01FF)
        if hdesk:
            user32.SetThreadDesktop(hdesk)

        target: list[tuple[int, int]] = []

        def enum_cb(hwnd: int, _: int) -> bool:
            if not user32.IsWindowVisible(hwnd):
                return True

            is_iconic = bool(user32.IsIconic(hwnd))
            rect = w.RECT()
            if not user32.GetWindowRect(hwnd, ctypes.byref(rect)):
                return True

            width = rect.right - rect.left
            height = rect.bottom - rect.top

            # Minimized windows have rect (-32000, -32000); only check size threshold if not iconic
            if not is_iconic and (width < 300 or height < 200):
                return True

            cbuf = ctypes.create_unicode_buffer(256)
            user32.GetClassNameW(hwnd, cbuf, 256)
            cls_name = cbuf.value

            # Chromium and Edge top-level windows always use Chrome_WidgetWin_1
            if cls_name != "Chrome_WidgetWin_1":
                return True

            pid = w.DWORD()
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            current_pid = pid.value

            # Verify process image name
            image_name = _get_process_image_name(current_pid)
            is_browser_proc = any(
                image_name.endswith(b) for b in ("chrome.exe", "msedge.exe", "chromium.exe")
            )
            if not is_browser_proc:
                return True

            # If we have a recorded PID, check for exact match
            if preferred_pid and current_pid == preferred_pid:
                target.append((hwnd, current_pid))
                return False

            tlen = user32.GetWindowTextLengthW(hwnd)
            title = ""
            if tlen > 0:
                tbuf = ctypes.create_unicode_buffer(tlen + 1)
                user32.GetWindowTextW(hwnd, tbuf, tlen + 1)
                title = tbuf.value.lower()

            # Window title heuristic for CAT HMI and Control Automation
            if any(k in title for k in ("cat", "vision", "5173", "inspection", "industrial", "control", "automation", "run", "smt")):
                target.append((hwnd, current_pid))
                return False

            # If no other candidate found, accept browser window
            target.append((hwnd, current_pid))
            return True

        WNDENUMPROC = ctypes.WINFUNCTYPE(w.BOOL, w.HWND, w.LPARAM)
        cb = WNDENUMPROC(enum_cb)

        if hdesk:
            user32.EnumDesktopWindows(hdesk, cb, 0)
        if not target:
            user32.EnumWindows(cb, 0)

        if target:
            return target[0]

        return None, None
    except Exception as exc:
        logger.error(f"find_window_hwnd_failed: {exc}", exc_info=True)
        return None, None


def _record_window_error(code: str, message: str, exc: Exception | None = None) -> None:
    try:
        import traceback
        import uuid
        from BE.db.connections import get_task_conn
        from BE.app.db.writers import error as error_writer

        stack = traceback.format_exc() if exc is not None else "".join(traceback.format_stack())
        rec = {
            "CorrelationId": f"win-{uuid.uuid4().hex[:8]}",
            "Code": code,
            "Level": "error",
            "Message": message,
            "StackTrace": stack,
            "TriggerComponent": "WindowControls",
            "Endpoint": "/window",
        }
        conn = get_task_conn()
        try:
            error_writer.write_errors(conn, [rec])
        finally:
            conn.close()
    except Exception as log_err:
        logger.warning(f"Failed to record window error to Split-DB: {log_err}")


def _minimize_window() -> bool:
    hwnd, pid = _find_window_hwnd()

    if not hwnd:
        logger.warning("minimize_window_not_found")
        _record_window_error("E_WINDOW_MINIMIZE_NOT_FOUND", "Window handle not found for minimize")
        return False

    try:
        import ctypes
        user32 = ctypes.windll.user32
        # SC_MINIMIZE = 0xF020 via WM_SYSCOMMAND (0x0112) guarantees Chromium handles it natively
        user32.PostMessageW(hwnd, 0x0112, 0xF020, 0)
        user32.ShowWindowAsync(hwnd, 6)   # SW_MINIMIZE
        user32.ShowWindow(hwnd, 11)  # SW_FORCEMINIMIZE
        user32.ShowWindow(hwnd, 6)   # SW_MINIMIZE
        user32.CloseWindow(hwnd)
        logger.info("minimize_window_success", extra={"hwnd": hwnd, "pid": pid})
        return True
    except Exception as exc:
        logger.error(f"minimize_window_failed: {exc}", exc_info=True)
        _record_window_error("E_WINDOW_MINIMIZE_FAILED", str(exc), exc)
        return False


def _toggle_maximize_window() -> bool:
    hwnd, pid = _find_window_hwnd()

    if not hwnd:
        logger.warning("toggle_maximize_window_not_found")
        _record_window_error("E_WINDOW_MAXIMIZE_NOT_FOUND", "Window handle not found for toggle maximize")
        return False

    try:
        import ctypes
        user32 = ctypes.windll.user32
        is_zoomed = bool(user32.IsZoomed(hwnd))
        is_iconic = bool(user32.IsIconic(hwnd))

        # Toggle: restore (9, SC_RESTORE = 0xF120) if zoomed or iconic, maximize (3, SC_MAXIMIZE = 0xF030) if normal
        next_action = 9 if (is_zoomed or is_iconic) else 3
        sys_cmd = 0xF120 if (is_zoomed or is_iconic) else 0xF030

        user32.PostMessageW(hwnd, 0x0112, sys_cmd, 0)
        user32.ShowWindowAsync(hwnd, next_action)
        user32.ShowWindow(hwnd, next_action)
        new_state = not (is_zoomed or is_iconic)
        logger.info("toggle_maximize_window_success", extra={"hwnd": hwnd, "pid": pid, "is_maximized": new_state})
        return new_state
    except Exception as exc:
        logger.error(f"toggle_maximize_window_failed: {exc}", exc_info=True)
        _record_window_error("E_WINDOW_MAXIMIZE_FAILED", str(exc), exc)
        return False


def _close_window() -> bool:
    hwnd, pid = _find_window_hwnd()

    # Fallback to recorded browser PID if find_window_hwnd did not yield a PID
    effective_pid = pid
    if not effective_pid:
        pid_file = Path(".logs/browser.pid")
        if pid_file.exists():
            try:
                content = pid_file.read_text(encoding="utf-8").strip()
                if content.isdigit():
                    effective_pid = int(content)
            except Exception:
                pass

    if hwnd:
        try:
            import ctypes
            # Post both WM_CLOSE (0x0010) and SC_CLOSE (0xF060)
            ctypes.windll.user32.PostMessageW(hwnd, 0x0010, 0, 0)
            ctypes.windll.user32.PostMessageW(hwnd, 0x0112, 0xF060, 0)
        except Exception as exc:
            logger.warning(f"post_wm_close_failed: {exc}")

    # Immediately terminate browser process tree in background daemon thread (<1ms response delivery)
    def _async_terminate(target_pid: int | None) -> None:
        if target_pid and sys.platform == "win32":
            try:
                import subprocess
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(target_pid)],
                    timeout=1.0,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            except Exception as exc:
                logger.warning(f"taskkill_pid_failed: {exc}")

        # Secondary sweep for any process matching our profile
        if sys.platform == "win32":
            try:
                import subprocess
                subprocess.run(
                    ["taskkill", "/F", "/IM", "chrome.exe", "/FI", "WINDOWTITLE eq *CAT*"],
                    timeout=1.0,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            except Exception:
                pass

    t = threading.Thread(target=_async_terminate, args=(effective_pid,), daemon=True)
    t.start()
    return True


@router.post("/window/minimize")
async def post_window_minimize(request: Request) -> JSONResponse:
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    success_status = _minimize_window()
    payload = {"isMinimized": success_status}
    envelope = success(payload, requested_at=str(request.url))
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


@router.post("/window/maximize")
async def post_window_maximize(request: Request) -> JSONResponse:
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    success_status = _toggle_maximize_window()
    payload = {"isMaximized": success_status}
    envelope = success(payload, requested_at=str(request.url))
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


@router.post("/window/close")
async def post_window_close(request: Request) -> JSONResponse:
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    _close_window()
    _schedule_shutdown()
    payload = {"isClosed": True}
    envelope = success(payload, requested_at=str(request.url))
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


@router.post("/shutdown")
async def post_shutdown(request: Request) -> JSONResponse:
    """Acknowledge the Exit request, then stop the backend process."""
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))

    if not _is_loopback_client(request):
        logger.warning(
            "shutdown_rejected_non_loopback",
            extra={
                "CorrelationId": correlation_id,
                "operation": "POST /shutdown",
                "code": None,
                "subject_id": None,
            },
        )
        return JSONResponse(
            status_code=403,
            content={"detail": "shutdown is only available from this machine"},
            headers={CORRELATION_HEADER: correlation_id},
        )

    logger.info(
        "shutdown_requested",
        extra={
            "CorrelationId": correlation_id,
            "operation": "POST /shutdown",
            "code": None,
            "subject_id": None,
        },
    )
    _close_window()
    _schedule_shutdown()
    payload = {"status": "shutting_down"}
    envelope = success(payload, requested_at=str(request.url))
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


__all__ = ["router"]
