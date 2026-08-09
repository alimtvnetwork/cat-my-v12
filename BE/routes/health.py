"""GET /healthz -> success envelope with liveness + monotonic uptime.

Spec: spec/21-app/backend-implementation-request-v1.md §Home Backend-Mode
widget uses this as the reachability probe (`Test connection -> GET /healthz`).

Envelope shape (per BE/envelope.py, frozen):
    {"ok": true, "data": {"status": "ok", "uptime_s": <float>, "env": "dev"},
     "error": null}

Uptime uses `time.monotonic()` (never goes backward across NTP jumps), captured
once at module import so every request reports uptime since process start.
"""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from BE.config import get_settings
from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success

logger = logging.getLogger("BE.routes.health")

router = APIRouter()

_STARTED_AT = time.monotonic()


def _uptime_s() -> float:
    """Seconds since module import; monotonic, immune to wall-clock jumps."""
    return round(time.monotonic() - _STARTED_AT, 3)


@router.get("/healthz")
async def get_healthz(request: Request) -> JSONResponse:
    """Liveness probe. Always 200 unless the process is dead."""
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    cfg = get_settings()
    payload = {"status": "ok", "uptime_s": _uptime_s(), "env": cfg.env.value}
    logger.info(
        "healthz",
        extra={
            "CorrelationId": correlation_id,
            "operation": "GET /healthz",
            "code": None,
            "subject_id": None,
        },
    )
    envelope = success(payload, requested_at=str(request.url))
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


__all__ = ["router"]
