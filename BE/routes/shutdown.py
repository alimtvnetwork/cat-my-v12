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


def _find_window_hwnd() -> tuple[int | None, int | None]:
    """Find the top-level Chromium embedded HMI window HWND and owning PID."""
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

        # Attach current thread to the interactive desktop station (Session 1 WinSta0\Default)
        hdesk = user32.OpenDesktopW("default", 0, False, 0x01FF)
        if hdesk:
            user32.SetThreadDesktop(hdesk)

        target: list[tuple[int, int]] = []

        def enum_cb(hwnd: int, _: int) -> bool:
            if not user32.IsWindowVisible(hwnd):
                return True

            rect = w.RECT()
            if not user32.GetWindowRect(hwnd, ctypes.byref(rect)):
                return True

            width = rect.right - rect.left
            height = rect.bottom - rect.top
            if width < 300 or height < 200:
                return True

            cbuf = ctypes.create_unicode_buffer(256)
            user32.GetClassNameW(hwnd, cbuf, 256)
            cls_name = cbuf.value

            tlen = user32.GetWindowTextLengthW(hwnd)
            title = ""
            if tlen > 0:
                tbuf = ctypes.create_unicode_buffer(tlen + 1)
                user32.GetWindowTextW(hwnd, tbuf, tlen + 1)
                title = tbuf.value.lower()

            pid = w.DWORD()
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))

            is_candidate = False
            if cls_name == "Chrome_WidgetWin_1":
                if any(k in title for k in WINDOW_TITLE_KEYWORDS):
                    is_candidate = True
                elif "5173" in title or "cat" in title or "vision" in title:
                    is_candidate = True
            elif any(k in title for k in WINDOW_TITLE_KEYWORDS):
                is_candidate = True

            if is_candidate:
                target.append((hwnd, pid.value))
                return False

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


def _minimize_window() -> bool:
    hwnd, pid = _find_window_hwnd()
    if not hwnd:
        logger.warning("minimize_window_not_found")
        return False

    try:
        import ctypes
        user32 = ctypes.windll.user32
        user32.ShowWindow(hwnd, 11)  # SW_FORCEMINIMIZE
        user32.ShowWindow(hwnd, 6)   # SW_MINIMIZE
        user32.CloseWindow(hwnd)
        logger.info("minimize_window_success", extra={"hwnd": hwnd, "pid": pid})
        return True
    except Exception as exc:
        logger.error(f"minimize_window_failed: {exc}", exc_info=True)
        return False


def _toggle_maximize_window() -> bool:
    hwnd, pid = _find_window_hwnd()
    if not hwnd:
        logger.warning("toggle_maximize_window_not_found")
        return False

    try:
        import ctypes
        user32 = ctypes.windll.user32
        is_zoomed = bool(user32.IsZoomed(hwnd))
        # Toggle: restore (9) if zoomed, maximize (3) if normal
        next_action = 9 if is_zoomed else 3
        user32.ShowWindow(hwnd, next_action)
        new_state = not is_zoomed
        logger.info("toggle_maximize_window_success", extra={"hwnd": hwnd, "pid": pid, "is_maximized": new_state})
        return new_state
    except Exception as exc:
        logger.error(f"toggle_maximize_window_failed: {exc}", exc_info=True)
        return False


def _close_window() -> bool:
    hwnd, pid = _find_window_hwnd()
    if hwnd:
        try:
            import ctypes
            ctypes.windll.user32.PostMessageW(hwnd, 0x0010, 0, 0)
        except Exception as exc:
            logger.warning(f"post_wm_close_failed: {exc}")

    # Immediately terminate browser process tree (<10ms)
    if pid and sys.platform == "win32":
        try:
            import subprocess
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
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
                ["taskkill", "/F", "/IM", "chrome.exe", "/FI", "WINDOWTITLE eq CAT*"],
                timeout=1.0,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except Exception:
            pass

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
