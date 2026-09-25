"""Score and rule inspection orchestrator endpoint for Day 4 MVP.

Provides:
- POST /score (evaluates deterministic vision rule kernels on frames/ROIs)
"""

from __future__ import annotations

import base64
import logging
import time
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from BE.app.domain.vision_eval import (
    BoundingBox,
    ConfidenceResult,
    _check_color_area,
    _clip_to_roi,
    _match_pattern,
    _measure_blob_area,
    _measure_edge_width,
    _track_shapes,
    evaluate_grayscale_tolerance,
    evaluate_pattern_match,
)
from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

logger = logging.getLogger("BE.routes.score")

router = APIRouter(prefix="/score")

# Default fallback reference images in repo
_REPO_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_SAMPLE_PATH = _REPO_ROOT / "src" / "assets" / "samples" / "pocket-1-filled.jpg"


def _load_image_bytes(url_or_data: str | None) -> bytes:
    """Resolve an image URL, base64 data URL, or local path to raw image bytes."""
    if not url_or_data:
        if _DEFAULT_SAMPLE_PATH.exists():
            return _DEFAULT_SAMPLE_PATH.read_bytes()
        return np.full((128, 128, 3), 128, dtype=np.uint8).tobytes()

    if url_or_data.startswith("data:image/"):
        try:
            _, b64 = url_or_data.split(",", 1)
            return base64.b64decode(b64)
        except Exception as exc:
            logger.warning("score_b64_decode_failed", extra={"cause": str(exc)})

    # Local file path check
    clean_path = url_or_data.lstrip("/")
    candidates = [
        Path(url_or_data),
        _REPO_ROOT / clean_path,
        _REPO_ROOT / "src" / clean_path,
        _DEFAULT_SAMPLE_PATH,
    ]
    for c in candidates:
        if c.is_file():
            try:
                return c.read_bytes()
            except OSError:
                pass

    if _DEFAULT_SAMPLE_PATH.exists():
        return _DEFAULT_SAMPLE_PATH.read_bytes()
    return np.full((128, 128, 3), 128, dtype=np.uint8).tobytes()


def _parse_roi(raw_roi: Any) -> BoundingBox | None:
    if not isinstance(raw_roi, dict):
        return None
    try:
        x = int(raw_roi["x"])
        y = int(raw_roi["y"])
        w = int(raw_roi["width"])
        h = int(raw_roi["height"])
        if w > 0 and h > 0:
            return BoundingBox(x=x, y=y, width=w, height=h)
    except (KeyError, ValueError, TypeError):
        pass
    return None


@router.post("")
async def evaluate_score(request: Request) -> JSONResponse:
    """Evaluate image against deterministic rule criteria (Day 4 Orchestrator)."""
    cid = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    try:
        body = await request.json()
    except Exception as exc:
        raise AppError(ErrorCode.E_BE_BAD_REQUEST, "Invalid JSON body") from exc

    if not isinstance(body, dict):
        raise AppError(ErrorCode.E_BE_BAD_REQUEST, "JSON body must be an object")

    rule_type = str(body.get("ruleType", "grayscale_tolerance"))
    threshold = float(body.get("threshold", 0.8))
    tolerance = int(body.get("tolerance", 40))
    calibration_factor = float(body.get("calibrationFactor", 0.05))
    calibration_unit = str(body.get("calibrationUnit", "mm"))
    roi = _parse_roi(body.get("roi"))

    sample_param = body.get("sampleImageUrl") or body.get("referenceImageUrl")
    ref_bytes = _load_image_bytes(body.get("referenceImageUrl"))
    smp_bytes = _load_image_bytes(sample_param)

    start_time = time.perf_counter()
    result: ConfidenceResult

    if rule_type == "grayscale_tolerance":
        result = await evaluate_grayscale_tolerance(
            reference_bytes=ref_bytes,
            sample_bytes=smp_bytes,
            roi=roi,
            tolerance=tolerance,
            threshold=threshold,
        )
    elif rule_type == "pattern_match":
        ref_arr = np.frombuffer(ref_bytes, dtype=np.uint8)
        ref_img = cv2.imdecode(ref_arr, cv2.IMREAD_COLOR)
        smp_arr = np.frombuffer(smp_bytes, dtype=np.uint8)
        smp_img = cv2.imdecode(smp_arr, cv2.IMREAD_COLOR)

        if ref_img is None or smp_img is None:
            result = ConfidenceResult(score=0.0, is_pass=False, label="decode_error", verdict="FAIL", reason="Failed to decode image buffers")
        else:
            if roi is not None:
                tmpl_img = _clip_to_roi(ref_img, roi)
                search_roi = BoundingBox(
                    x=max(0, roi.x - 20),
                    y=max(0, roi.y - 20),
                    width=min(smp_img.shape[1] - max(0, roi.x - 20), roi.width + 40),
                    height=min(smp_img.shape[0] - max(0, roi.y - 20), roi.height + 40),
                )
                search_area = _clip_to_roi(smp_img, search_roi)
                result = _match_pattern(search_area, tmpl_img, threshold=threshold)
            else:
                result = _match_pattern(smp_img, ref_img, threshold=threshold)
    elif rule_type == "shape_track":
        smp_arr = np.frombuffer(smp_bytes, dtype=np.uint8)
        smp_img = cv2.imdecode(smp_arr, cv2.IMREAD_COLOR)
        if smp_img is None:
            result = ConfidenceResult(score=0.0, is_pass=False, label="decode_error", verdict="FAIL", reason="Failed to decode sample image")
        else:
            clipped = _clip_to_roi(smp_img, roi)
            result = _track_shapes(clipped, threshold=threshold)
    elif rule_type == "color_area":
        smp_arr = np.frombuffer(smp_bytes, dtype=np.uint8)
        smp_img = cv2.imdecode(smp_arr, cv2.IMREAD_COLOR)
        if smp_img is None:
            result = ConfidenceResult(score=0.0, is_pass=False, label="decode_error", verdict="FAIL", reason="Failed to decode sample image")
        else:
            clipped = _clip_to_roi(smp_img, roi)
            result = _check_color_area(clipped, (0, 30, 30), (180, 255, 255), threshold=threshold)
    elif rule_type in ("blob_area", "blob", "defect"):
        smp_arr = np.frombuffer(smp_bytes, dtype=np.uint8)
        smp_img = cv2.imdecode(smp_arr, cv2.IMREAD_COLOR)
        if smp_img is None:
            result = ConfidenceResult(score=0.0, is_pass=False, label="decode_error", verdict="FAIL", reason="Failed to decode sample image")
        else:
            clipped = _clip_to_roi(smp_img, roi)
            result = _measure_blob_area(
                clipped,
                calibration_factor=calibration_factor,
                unit=calibration_unit,
            )
    elif rule_type in ("edge_width", "profile_width", "edge_pitch"):
        smp_arr = np.frombuffer(smp_bytes, dtype=np.uint8)
        smp_img = cv2.imdecode(smp_arr, cv2.IMREAD_COLOR)
        if smp_img is None:
            result = ConfidenceResult(score=0.0, is_pass=False, label="decode_error", verdict="FAIL", reason="Failed to decode sample image")
        else:
            clipped = _clip_to_roi(smp_img, roi)
            result = _measure_edge_width(
                clipped,
                calibration_factor=calibration_factor,
                unit=calibration_unit,
            )
    else:
        # Default fallback to grayscale tolerance
        result = await evaluate_grayscale_tolerance(
            reference_bytes=ref_bytes,
            sample_bytes=smp_bytes,
            roi=roi,
            tolerance=tolerance,
            threshold=threshold,
        )

    duration_ms = max(1, int((time.perf_counter() - start_time) * 1000))

    score_payload = {
        "is_pass": bool(result.is_pass),
        "confidence": round(float(result.score), 1),
        "label": str(result.label),
        "verdict": getattr(result, "verdict", "PASS" if result.is_pass else "FAIL"),
        "reason": getattr(result, "reason", ""),
        "trace": getattr(result, "trace", None) or {},
        "calibration": {
            "factor": calibration_factor,
            "unit": calibration_unit,
        },
        "duration_ms": duration_ms,
    }

    # Day 5/6: TaskDb durable persistence of inspection runs and verdict
    try:
        import json
        from BE.repos.sqlite_results_repo import SqliteResultsRepo
        repo = SqliteResultsRepo()
        run_id = f"01J{int(time.time() * 1000):012d}R1"
        verdict = "Pass" if score_payload["is_pass"] else "Fail"
        decision = "PASS" if score_payload["is_pass"] else "FAIL"
        session_id = repo.create_run_session(
            run_id=run_id,
            verdict=verdict,
            mode="manual",
            image_file_path=str(sample_param or "/src/assets/samples/pocket-1-filled.jpg"),
            rule_count=1,
            active_count=1,
            pass_count=1 if score_payload["is_pass"] else 0,
            fail_count=0 if score_payload["is_pass"] else 1,
        )
        frame_id = repo.create_frame(run_id=run_id)
        result_id = repo.save_result(
            run_id=run_id,
            frame_id=frame_id,
            decision=decision,
            score_percent=round(float(score_payload["confidence"]), 1),
            duration_ms=duration_ms,
        )
        repo.save_result_detail(
            result_id=result_id,
            rule_name=rule_type,
            is_passed=score_payload["is_pass"],
            measured_value=score_payload["confidence"],
            message=score_payload["reason"],
        )
        repo.save_rule_result(
            run_session_id=session_id,
            verdict=verdict,
            rule_kind=rule_type,
            reason_message=score_payload["reason"],
            elapsed_ms=float(duration_ms),
            metrics_json=json.dumps(score_payload.get("trace", {})),
        )
        score_payload["runId"] = run_id
        score_payload["runSessionId"] = session_id
        score_payload["resultId"] = result_id
    except Exception as persist_err:
        logger.warning("failed_to_persist_score_result", extra={"cause": str(persist_err)})

    logger.info(
        "score_evaluated",
        extra={
            "CorrelationId": cid,
            "operation": "POST /score",
            "ruleType": rule_type,
            "verdict": score_payload["verdict"],
            "is_pass": score_payload["is_pass"],
            "confidence": score_payload["confidence"],
            "runId": score_payload.get("runId"),
        },
    )

    env = success(score_payload, requested_at=str(request.url))
    wire = env.to_wire()
    wire["is_pass"] = score_payload["is_pass"]
    wire["confidence"] = score_payload["confidence"]
    wire["label"] = score_payload["label"]
    wire["verdict"] = score_payload["verdict"]
    wire["reason"] = score_payload["reason"]
    wire["trace"] = score_payload["trace"]
    wire["calibration"] = score_payload["calibration"]
    wire["runId"] = score_payload.get("runId")

    return JSONResponse(content=wire, headers={CORRELATION_HEADER: cid})


__all__ = ["router"]
