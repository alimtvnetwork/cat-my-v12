"""Image references and upload endpoints for Day 3 MVP.

Provides:
- GET /images/reference (get project reference image)
- PUT /images/reference (update reference image binding)
- POST /images/upload (upload image file or base64 frame)
"""

from __future__ import annotations

import base64
import logging
import time
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

logger = logging.getLogger("BE.routes.images")

router = APIRouter(prefix="/images")

_PROJECT_REFERENCES: dict[str, dict[str, Any]] = {
    "default": {
        "id": 1,
        "url": "/src/assets/samples/pocket-1-filled.jpg",
        "width": 1920,
        "height": 1080,
    }
}


@router.get("/reference")
async def get_reference_image(request: Request, projectId: str = "default") -> JSONResponse:
    """Return active reference image for project."""
    cid = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    img = _PROJECT_REFERENCES.get(projectId, _PROJECT_REFERENCES["default"])
    env = success(img, requested_at=str(request.url))
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: cid})


@router.put("/reference")
async def set_reference_image(request: Request) -> JSONResponse:
    """Update active reference image for project."""
    cid = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    raw = await request.json()
    if not isinstance(raw, dict):
        raise AppError(ErrorCode.E_BE_BAD_REQUEST, "body must be a JSON object")
    pid = str(raw.get("projectId", "default"))
    img_id = raw.get("imageId", int(time.time() * 1000))
    url = raw.get("url", "/src/assets/samples/pocket-1-filled.jpg")
    updated = {"id": img_id, "url": url, "width": 1920, "height": 1080}
    _PROJECT_REFERENCES[pid] = updated
    env = success(updated, requested_at=str(request.url))
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: cid})


_PROCESSED_IMAGES: list[dict[str, Any]] = [
    {
        "id": "sample-good-1",
        "name": "Pocket 1 (PASS)",
        "url": "/src/assets/samples/pocket-1-filled.jpg",
        "timestamp": "Golden Part",
    },
    {
        "id": "sample-defect-empty",
        "name": "Empty Pocket (FAIL)",
        "url": "/src/assets/samples/pocket-2-empty-mixed.jpg",
        "timestamp": "Missing Chip",
    },
    {
        "id": "sample-defect-partial",
        "name": "Partial Chip (FAIL)",
        "url": "/src/assets/samples/pocket-5-partial.jpg",
        "timestamp": "Defect",
    },
    {
        "id": "sample-good-2",
        "name": "Pocket 2 (PASS)",
        "url": "/src/assets/samples/pocket-2-filled.jpg",
        "timestamp": "Good Part",
    },
    {
        "id": "sample-pcb",
        "name": "PCB Assembly",
        "url": "/src/assets/samples/pcb-assembly.jpg",
        "timestamp": "Sample",
    },
    {
        "id": "sample-blister",
        "name": "Blister Pack",
        "url": "/src/assets/samples/blister-pack.jpg",
        "timestamp": "Sample",
    },
]


@router.get("/processed")
async def get_processed_images(request: Request) -> JSONResponse:
    """Return recent processed and preset images."""
    cid = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    env = success(_PROCESSED_IMAGES, requested_at=str(request.url))
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: cid})


@router.post("/upload")
async def upload_image(request: Request) -> JSONResponse:
    """Receive an uploaded image (data URL or raw JSON) and return image metadata."""
    cid = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    raw = await request.json()
    if not isinstance(raw, dict):
        raise AppError(ErrorCode.E_BE_BAD_REQUEST, "body must be a JSON object")
    data_url = raw.get("dataUrl") or raw.get("url")
    if not data_url or not isinstance(data_url, str):
        raise AppError(ErrorCode.E_BE_BAD_REQUEST, "dataUrl is required")

    img_id = int(time.time() * 1000)
    width = int(raw.get("width", 1920))
    height = int(raw.get("height", 1080))
    time_str = time.strftime("%H:%M:%S")
    item = {
        "id": f"upload-{img_id}",
        "name": f"Upload {time_str}",
        "url": data_url,
        "width": width,
        "height": height,
        "timestamp": time_str,
    }
    _PROCESSED_IMAGES.insert(0, item)
    _PROJECT_REFERENCES["default"] = item

    env = success(item, requested_at=str(request.url))
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: cid})


__all__ = ["router"]
