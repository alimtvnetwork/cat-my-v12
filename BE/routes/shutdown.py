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
import threading

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success

logger = logging.getLogger("BE.routes.shutdown")

router = APIRouter()

_SHUTDOWN_DELAY_S = 0.5
_LOOPBACK_HOSTS = ("127.0.0.1", "::1", "localhost", "testclient")


def _is_loopback_client(request: Request) -> bool:
    """True when the caller connects from this machine only."""
    client = request.client

    if client is None:
        return True

    return client.host in _LOOPBACK_HOSTS


def _initiate_shutdown() -> None:
    """Exit this process. SIGTERM first (graceful, see BE/main.py)."""
    logger.info("shutdown_initiated", extra={"operation": "POST /shutdown"})

    try:
        os.kill(os.getpid(), signal.SIGTERM)
    except Exception:
        logger.warning("shutdown_sigterm_failed", extra={"operation": "POST /shutdown"})
        os._exit(0)


def _schedule_shutdown() -> None:
    """Arm the exit timer so the HTTP response goes out first."""
    timer = threading.Timer(_SHUTDOWN_DELAY_S, _initiate_shutdown)
    timer.daemon = True
    timer.start()


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
    _schedule_shutdown()
    payload = {"status": "shutting_down"}
    envelope = success(payload, requested_at=str(request.url))
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


__all__ = ["router"]
