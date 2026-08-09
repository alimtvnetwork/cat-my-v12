"""
Validation worker HTTP shim.

Intentionally thin: it validates the request shape, runs a placeholder
scorer, and returns `{ results, worker }`. The real OpenCV / Tesseract
scoring lands in a follow-up step; this file just makes deployment,
auth, and the request/response contract testable end to end today.
"""
from __future__ import annotations

import logging
import os
import time
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field

from calibration_service import (
    start as calibration_start,
    status as calibration_status,
    report as calibration_report,
)

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
log = logging.getLogger("validation-worker")

ENGINE = "stub-opencv"
VERSION = os.environ.get("WORKER_VERSION", "0.1.0")
TOKEN = os.environ.get("VALIDATION_WORKER_TOKEN")

app = FastAPI(title="Validation Worker", version=VERSION)


class RuleInput(BaseModel):
    id: str
    kind: str = Field(pattern="^[CRKSE]$")
    name: str
    x: float
    y: float
    width: float
    height: float
    params: Optional[Dict[str, Any]] = None


class ScoreRequest(BaseModel):
    imageDataUrl: str
    imageName: str
    imageWidth: int
    imageHeight: int
    rules: List[RuleInput]


@app.get("/healthz")
def healthz() -> Dict[str, Any]:
    return {"ok": True, "engine": ENGINE, "version": VERSION}


def _require_token(req: Request) -> None:
    if TOKEN and req.headers.get("authorization", "") != f"Bearer {TOKEN}":
        raise HTTPException(status_code=401, detail="unauthorized")


@app.post("/calibrate")
async def calibrate_start(req: Request) -> Dict[str, Any]:
    _require_token(req)
    return calibration_start()


@app.get("/calibrate/status")
def calibrate_status(req: Request) -> Dict[str, Any]:
    _require_token(req)
    return calibration_status()


@app.get("/calibration-report")
def calibrate_report(req: Request) -> Dict[str, Any]:
    _require_token(req)
    data = calibration_report()
    if data is None:
        raise HTTPException(status_code=404, detail="calibration-report.json not found")
    return data


@app.post("/score")
async def score(req: Request) -> Dict[str, Any]:
    if TOKEN:
        auth = req.headers.get("authorization", "")
        if auth != f"Bearer {TOKEN}":
            log.warning("score: bad auth header")
            raise HTTPException(status_code=401, detail="unauthorized")
    body = await req.json()
    try:
        payload = ScoreRequest.model_validate(body)
    except Exception as exc:
        log.exception("score: bad payload")
        raise HTTPException(status_code=400, detail=f"bad payload: {exc}") from exc

    started = time.time()
    results: Dict[str, Dict[str, Any]] = {}
    for r in payload.rules:
        # Placeholder scorer: deterministic per-rule score so wire-up is
        # verifiable. Real detectors replace this in the calibration pass.
        score = 1.0 if r.width > 0 and r.height > 0 else 0.0
        results[r.id] = {
            "status": "pass" if score >= 0.5 else "fail",
            "score": score,
            "message": "placeholder scorer" if score >= 0.5 else "zero-area ROI",
            "debug": {"kind": r.kind, "area": r.width * r.height},
        }
    log.info(
        "score: ok rules=%d ms=%d", len(payload.rules), int((time.time() - started) * 1000)
    )
    return {"results": results, "worker": {"version": VERSION, "engine": ENGINE}}