"""GET /api/seed -> return canonical CatSeedBundle for FE remote seed facade.

Spec: spec/21-app/backend-implementation-request-v1.md
FE contract: src/lib/seed/remote-facade.ts (parseCatSeedBundle).
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from BE.envelope import CORRELATION_HEADER, ensure_correlation_id

logger = logging.getLogger("BE.routes.seed")

router = APIRouter()

_REPO_ROOT = Path(__file__).resolve().parents[2]
_BUNDLE_PATH = _REPO_ROOT / "src" / "lib" / "seed" / "data" / "bundle.json"
_CACHED_BUNDLE: dict[str, Any] | None = None


def _load_bundle_from_disk(path: Path) -> dict[str, Any]:
    """Read and parse bundle JSON from disk."""
    return json.loads(path.read_text(encoding="utf-8"))


def _fallback_empty_bundle() -> dict[str, Any]:
    """Provide empty CatSeedBundle fallback when bundle.json is unavailable."""
    return {
        "version": "1.0.0",
        "projects": [],
        "categories": [],
        "ruleTemplates": [],
        "toolPresets": [],
        "sampleImages": [],
        "programs": [],
    }


def get_seed_bundle() -> dict[str, Any]:
    """Load and cache canonical CatSeedBundle payload."""
    global _CACHED_BUNDLE
    if _CACHED_BUNDLE is not None:
        return _CACHED_BUNDLE
    if _BUNDLE_PATH.is_file():
        _CACHED_BUNDLE = _load_bundle_from_disk(_BUNDLE_PATH)
        return _CACHED_BUNDLE
    _CACHED_BUNDLE = _fallback_empty_bundle()
    return _CACHED_BUNDLE


@router.get("/api/seed")
@router.get("/seed")
async def get_seed(request: Request) -> JSONResponse:
    """Return CatSeedBundle JSON for RemoteUiSeedFacade."""
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    bundle = get_seed_bundle()
    logger.info(
        "seed_bundle_served",
        extra={
            "CorrelationId": correlation_id,
            "operation": "GET /api/seed",
            "code": None,
            "subject_id": bundle.get("version", "unknown"),
        },
    )
    return JSONResponse(
        content=bundle,
        headers={CORRELATION_HEADER: correlation_id},
    )


__all__ = ["router", "get_seed_bundle"]
