"""Camera acquisition and status endpoints for Day 3 MVP.

Provides:
- GET /camera/status (camera connection probe)
- POST /camera/capture (simulated/replay camera acquisition)
- PUT /camera/settings (camera setting and trigger updates)
"""

from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success

logger = logging.getLogger("BE.routes.camera")

router = APIRouter(prefix="/camera")

_CURRENT_SETTINGS: dict[str, Any] = {
    "triggerMode": "software",
    "exposureUs": 20000,
    "gainDb": 0.0,
}


@router.get("/status")
async def get_camera_status(request: Request, cameraId: str = "default") -> JSONResponse:
    """Return camera connection status."""
    cid = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    payload = {
        "status": "connected",
        "message": f"Camera '{cameraId}' connected (Simulated/Replay mode)",
    }
    logger.info("camera_status", extra={"CorrelationId": cid, "operation": "GET /camera/status"})
    env = success(payload, requested_at=str(request.url))
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: cid})


@router.post("/capture")
async def capture_frame(request: Request) -> JSONResponse:
    """Simulate frame acquisition and return a ReferenceImage payload."""
    cid = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    now = int(time.time() * 1000)
    payload = {
        "id": now,
        "url": "/src/assets/samples/pocket-1-filled.jpg",
        "width": 1920,
        "height": 1080,
    }
    logger.info("camera_capture", extra={"CorrelationId": cid, "operation": "POST /camera/capture"})
    env = success(payload, requested_at=str(request.url))
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: cid})


@router.put("/settings")
async def update_camera_settings(request: Request) -> JSONResponse:
    """Update camera settings and trigger mode."""
    cid = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    try:
        raw = await request.json()
        if isinstance(raw, dict):
            _CURRENT_SETTINGS.update(raw)
    except Exception:
        pass
    env = success(_CURRENT_SETTINGS, requested_at=str(request.url))
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: cid})


__all__ = ["router"]
