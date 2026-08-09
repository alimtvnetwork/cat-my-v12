"""GET /meta -> version, capabilities, sdkFacadeVersion.

Spec: spec/21-app/backend-implementation-request-v1.md
Consumers: FE typed client (Step 30) and Backend-Mode widget (Step 33) read
this to gate features on the running backend build. Envelope shape:

    {"ok": true,
     "data": {
       "version": "<BE.__version__>",
       "env": "dev",
       "capabilities": {"camera": "stub", "rules": "stub", "samples": "stub"},
       "sdkFacadeVersion": "0.0.0-stub"
     },
     "error": null}

`capabilities` values are literals ("stub" | "in-memory" | "vendor") and
advance as Steps 20-22 land the real facade providers. `sdkFacadeVersion`
stays at `0.0.0-stub` until the SDK drop arrives.
"""

from __future__ import annotations

import logging
from typing import Final

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from BE import __version__ as BE_VERSION
from BE.config import get_settings
from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success

logger = logging.getLogger("BE.routes.meta")

router = APIRouter()

_CAPABILITIES: Final[dict[str, str]] = {
    "camera": "stub",
    "rules": "stub",
    "samples": "stub",
}
from BE.sdk_facade import SDK_FACADE_VERSION as _SDK_FACADE_VERSION


@router.get("/meta")
async def get_meta(request: Request) -> JSONResponse:
    """Return backend build metadata for FE feature gating."""
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    cfg = get_settings()
    payload = {
        "version": BE_VERSION,
        "env": cfg.env.value,
        "capabilities": dict(_CAPABILITIES),
        "sdkFacadeVersion": _SDK_FACADE_VERSION,
    }
    logger.info(
        "meta",
        extra={
            "CorrelationId": correlation_id,
            "operation": "GET /meta",
            "code": None,
            "subject_id": None,
        },
    )
    envelope = success(payload, requested_at=str(request.url))
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


__all__ = ["router"]
