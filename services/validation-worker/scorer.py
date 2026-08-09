"""
Validation worker for Control Automation.

Runs outside the Cloudflare Worker runtime (which cannot host Python).
Deploy on any host reachable from the app: Fly.io, Render, Cloud Run, a
VM, etc. The TanStack Start server function `scoreRulesRemote` POSTs to
`{VALIDATION_WORKER_URL}/score` with a JSON payload matching PayloadIn
below, and expects PayloadOut back.

Contract lives in `src/lib/editor/validation.functions.ts`. Do not drift.

Per-rule scoring is intentionally simple in v1: it hooks in one scorer
per rule kind (C / R / K / S / E) using OpenCV + NumPy. Replace the body
of each scorer to plug in real vision code. The response shape is the
contract; the algorithms behind it are free to evolve.

Run locally:
    python -m pip install fastapi uvicorn opencv-python-headless numpy pydantic
    VALIDATION_WORKER_TOKEN=devtoken \
        uvicorn scorer:app --host 0.0.0.0 --port 8787
"""
from __future__ import annotations

import base64
import io
import logging
import os
import time
from typing import Any, Dict, List, Literal, Optional

import numpy as np
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

try:
    import cv2  # type: ignore
except ImportError:  # pragma: no cover
    cv2 = None  # scorer falls back to numpy-only heuristics

LOG = logging.getLogger("validation-worker")
logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))

WORKER_VERSION = "0.1.0"
ENGINE = "opencv" if cv2 is not None else "numpy"
EXPECTED_TOKEN = os.environ.get("VALIDATION_WORKER_TOKEN")

app = FastAPI(title="Control Automation Validation Worker", version=WORKER_VERSION)


class RuleIn(BaseModel):
    id: str
    kind: Literal["C", "R", "K", "S", "E"]
    name: str
    x: float
    y: float
    width: float
    height: float
    params: Optional[Dict[str, Any]] = None


class PayloadIn(BaseModel):
    imageDataUrl: str = Field(..., description="data:image/*;base64,<...>")
    imageName: str
    imageWidth: int
    imageHeight: int
    rules: List[RuleIn]


class ResultOut(BaseModel):
    status: Literal["pass", "fail", "warn", "pending"]
    score: Optional[float] = None
    message: Optional[str] = None
    debug: Optional[Dict[str, Any]] = None


class PayloadOut(BaseModel):
    results: Dict[str, ResultOut]
    worker: Dict[str, str]


def _decode_data_url(data_url: str) -> np.ndarray:
    if "," not in data_url:
        raise ValueError("imageDataUrl missing base64 payload separator ','")
    _, b64 = data_url.split(",", 1)
    raw = base64.b64decode(b64)
    arr = np.frombuffer(raw, dtype=np.uint8)
    if cv2 is not None:
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("cv2.imdecode returned None; unsupported image bytes")
        return img
    # numpy fallback: fail loudly rather than silently mis-score.
    raise RuntimeError("opencv-python-headless is required to decode images")


def _crop(img: np.ndarray, rule: RuleIn) -> np.ndarray:
    h, w = img.shape[:2]
    x0 = max(0, int(rule.x))
    y0 = max(0, int(rule.y))
    x1 = min(w, int(rule.x + rule.width))
    y1 = min(h, int(rule.y + rule.height))
    if x1 <= x0 or y1 <= y0:
        return np.zeros((1, 1, 3), dtype=np.uint8)
    return img[y0:y1, x0:x1]


# ---- per-kind scorers -------------------------------------------------

def score_c(roi: np.ndarray, rule: RuleIn) -> ResultOut:
    """C: circular ROI. v1 measures mean saturation as a presence proxy."""
    if cv2 is None:
        return ResultOut(status="pending", message="cv2 unavailable")
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    sat = float(hsv[:, :, 1].mean()) / 255.0
    status = "pass" if sat > 0.15 else "fail"
    return ResultOut(
        status=status,
        score=sat,
        message=f"mean saturation {sat:.3f}",
        debug={"kind": "C", "engine": ENGINE, "meanSaturation": sat},
    )


def score_r(roi: np.ndarray, rule: RuleIn) -> ResultOut:
    """R: rectangular ROI. v1 measures edge density (Canny)."""
    if cv2 is None:
        return ResultOut(status="pending", message="cv2 unavailable")
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 80, 160)
    density = float((edges > 0).mean())
    status = "pass" if density > 0.02 else "fail"
    return ResultOut(
        status=status,
        score=density,
        message=f"edge density {density:.4f}",
        debug={"kind": "R", "engine": ENGINE, "edgeDensity": density},
    )


def score_k(roi: np.ndarray, rule: RuleIn) -> ResultOut:
    """K: keypoint anchor. Placeholder returns warn until ORB wiring lands."""
    return ResultOut(
        status="warn",
        score=None,
        message="K (keypoint) scorer not yet implemented",
        debug={"kind": "K", "engine": ENGINE},
    )


def score_s(roi: np.ndarray, rule: RuleIn) -> ResultOut:
    """S: shape match. Placeholder."""
    return ResultOut(
        status="warn",
        message="S (shape) scorer not yet implemented",
        debug={"kind": "S", "engine": ENGINE},
    )


def score_e(roi: np.ndarray, rule: RuleIn) -> ResultOut:
    """E: expression / math. Requires no image; returns pass by default."""
    return ResultOut(
        status="pass",
        score=1.0,
        message="E (expression) rules are evaluated client-side",
        debug={"kind": "E", "engine": ENGINE},
    )


SCORERS = {"C": score_c, "R": score_r, "K": score_k, "S": score_s, "E": score_e}


@app.post("/score", response_model=PayloadOut)
def score(payload: PayloadIn, authorization: Optional[str] = Header(default=None)) -> PayloadOut:
    if EXPECTED_TOKEN:
        if not authorization or authorization != f"Bearer {EXPECTED_TOKEN}":
            raise HTTPException(status_code=401, detail="invalid or missing bearer token")
    started = time.perf_counter()
    try:
        img = _decode_data_url(payload.imageDataUrl)
    except Exception as exc:
        LOG.exception("image decode failed")
        raise HTTPException(status_code=400, detail=f"image decode failed: {exc}") from exc

    results: Dict[str, ResultOut] = {}
    for rule in payload.rules:
        roi = _crop(img, rule)
        try:
            results[rule.id] = SCORERS[rule.kind](roi, rule)
        except Exception as exc:
            LOG.exception("scorer failed for rule %s (%s)", rule.id, rule.kind)
            results[rule.id] = ResultOut(
                status="fail",
                message=f"scorer error: {exc}",
                debug={"kind": rule.kind, "engine": ENGINE, "error": str(exc)},
            )
    elapsed_ms = (time.perf_counter() - started) * 1000
    LOG.info(
        "scored image=%s rules=%d ms=%.1f engine=%s",
        payload.imageName,
        len(payload.rules),
        elapsed_ms,
        ENGINE,
    )
    return PayloadOut(
        results=results,
        worker={"version": WORKER_VERSION, "engine": ENGINE, "elapsedMs": f"{elapsed_ms:.1f}"},
    )


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "version": WORKER_VERSION, "engine": ENGINE}
