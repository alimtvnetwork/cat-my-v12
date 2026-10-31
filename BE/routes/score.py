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

try:
    import cv2
except ImportError:
    cv2 = None

import numpy as np
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from BE.app.domain.carrier_segmenter import segment_carrier_belt
from BE.app.domain.vision_eval import (
    BoundingBox,
    ConfidenceResult,
    _check_color_area,
    _clip_to_roi,
    convert_roi_to_image,
    _match_pattern,
    _measure_blob_area,
    _measure_edge_width,
    _track_shapes,
    evaluate_grayscale_tolerance,
    evaluate_pattern_match,
)
from BE.app.domain.vision_preprocess import (
    apply_optical_settings,
    downsample_factor_for,
    maybe_downsample,
    resize_by_factor,
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
            except OSError as err:
                logger.debug("candidate_read_failed", extra={"path": str(c), "error": str(err)})

    if _DEFAULT_SAMPLE_PATH.exists():
        return _DEFAULT_SAMPLE_PATH.read_bytes()
    return np.full((128, 128, 3), 128, dtype=np.uint8).tobytes()


def _box_from_circle_geometry(values: Any) -> BoundingBox | None:
    """Bounding box of a circle domain region (centre plus radius)."""
    if not isinstance(values, dict):
        return None
    try:
        cx = int(values.get("x", values.get("X")))
        cy = int(values.get("y", values.get("Y")))
        radius = int(values.get("radius", values.get("Radius")))
        if radius > 0:
            return BoundingBox(x=cx - radius, y=cy - radius, width=radius * 2, height=radius * 2)
    except (KeyError, ValueError, TypeError):
        pass
    return None


def _box_from_dict(values: Any) -> BoundingBox | None:
    """Read a rectangle from flat or shape-model casing. None if unusable."""
    if not isinstance(values, dict):
        return None
    try:
        x = int(values.get("x", values.get("X")))
        y = int(values.get("y", values.get("Y")))
        w = int(values.get("width", values.get("Width")))
        h = int(values.get("height", values.get("Height")))
        if w > 0 and h > 0:
            return BoundingBox(x=x, y=y, width=w, height=h)
    except (KeyError, ValueError, TypeError):
        pass
    return None


def _parse_roi(raw_roi: Any) -> BoundingBox | None:
    """Parse a canonical-space ROI (spec 01 §7.1).

    Accepts the geometryJson envelope (preferred) and, during migration,
    a flat {x, y, width, height} payload. A flat payload carrying
    ImageWidth/ImageHeight stamp keys parses as flat (the stamps only
    record the space it was drawn against). Flat input is dual-parsed and
    the conversion is logged; flat-only intake is a migration shim, not
    the contract. The domain {shape, geometry} form is accepted directly:
    RECTANGLE and ELLIPSE yield their bounding box, CIRCLE yields its
    bounding box from centre plus radius; None and other shape kinds
    return None (treated as missing ROI, as before for unparseable input).
    """
    if not isinstance(raw_roi, dict):
        return None
    envelope = raw_roi.get("geometryJson")
    if isinstance(envelope, dict):
        kind = str(envelope.get("ShapeKind") or envelope.get("shapeKind") or envelope.get("shape") or "RECTANGLE").upper()
        if kind == "CIRCLE":
            return _box_from_circle_geometry(envelope.get("geometry"))
        if kind != "RECTANGLE" and kind != "ELLIPSE":
            return None
        box = _box_from_dict(envelope.get("geometry"))
        if box is not None:
            logger.info(
                "score_roi_envelope_accepted",
                extra={"roi_source": "envelope"},
            )
        return box
    if "ImageWidth" in raw_roi or "ImageHeight" in raw_roi or "geometry" in raw_roi:
        geometry = raw_roi.get("geometry")
        if isinstance(geometry, dict):
            kind = str(raw_roi.get("ShapeKind") or raw_roi.get("shapeKind") or raw_roi.get("shape") or "RECTANGLE").upper()
            if kind == "CIRCLE":
                return _box_from_circle_geometry(geometry)
            if kind != "RECTANGLE" and kind != "ELLIPSE":
                return None
            box = _box_from_dict(geometry)
            if box is not None:
                logger.info(
                    "score_roi_envelope_accepted",
                    extra={"roi_source": "envelope"},
                )
            return box
        # No geometry sub-dict: a flat payload carrying stamp keys (the
        # form _roi_recorded_size already accepts). Fall through to flat
        # parsing below instead of reporting missing_roi (F5).
    box = _box_from_dict(raw_roi)
    if box is not None:
        logger.info(
            "score_roi_flat_migration",
            extra={"roi_source": "flat"},
        )
    return box


def _roi_recorded_size(raw_roi: Any) -> tuple[int, int] | None:
    """Recorded image dimensions a canonical ROI was drawn against, if any."""
    if not isinstance(raw_roi, dict):
        return None
    envelope = raw_roi.get("geometryJson")
    if not isinstance(envelope, dict):
        envelope = raw_roi
    try:
        width = int(envelope.get("ImageWidth", envelope.get("imageWidth")))
        height = int(envelope.get("ImageHeight", envelope.get("imageHeight")))
        if width > 0 and height > 0:
            return (width, height)
    except (KeyError, ValueError, TypeError):
        pass
    return None


def _per_image_rois(
    roi: BoundingBox | None,
    recorded_size: tuple[int, int] | None,
    treatment_factor: float,
    ref_size: tuple[int, int] | None,
    smp_size: tuple[int, int] | None,
) -> tuple[BoundingBox | None, BoundingBox | None]:
    """Convert one canonical ROI into each treated image's pixel space (spec 01 §7.3).

    The stored ROI was already rescaled by treatment_factor above, so
    the recorded space in treated terms is recorded_size * treatment_factor.
    Each image gets its own conversion, because the reference and the
    sample may differ in size. When the recorded space is unknown both
    images share the ROI (the pre-existing behavior).
    """
    if roi is None or recorded_size is None:
        return (roi, roi)
    recorded_treated = (
        max(1, int(round(recorded_size[0] * treatment_factor))),
        max(1, int(round(recorded_size[1] * treatment_factor))),
    )
    ref_roi = (
        convert_roi_to_image(roi, recorded_size=recorded_treated, image_size=ref_size)
        if ref_size is not None
        else roi
    )
    smp_roi = (
        convert_roi_to_image(roi, recorded_size=recorded_treated, image_size=smp_size)
        if smp_size is not None
        else roi
    )
    return (ref_roi, smp_roi)


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
    # Pass mark (0-1 fraction), not a grayscale threshold: the grayscale
    # keys live in detection (resolved below).
    threshold = float(body.get("threshold", 0.8))
    calibration_factor = float(body.get("calibrationFactor", 0.05))
    calibration_unit = str(body.get("calibrationUnit", "mm"))
    roi = _parse_roi(body.get("roi"))
    search_padding = int(body.get("searchPadding") or body.get("tolerancePx") or 30)

    sample_param = body.get("sampleImageUrl") or body.get("referenceImageUrl")
    ref_bytes = _load_image_bytes(body.get("referenceImageUrl"))
    smp_bytes = _load_image_bytes(sample_param)

    rule_obj = body.get("rule") or body.get("Rule")
    if not isinstance(rule_obj, dict):
        rule_obj = {}

    detection = body.get("detection") or rule_obj.get("detection") or {}

    if not isinstance(detection, dict):
        detection = {}

    # Shared default mirrors PatternSearchSettings detection.lumaTolerance
    # (22). The backend has no cross-language shared module, so the value
    # is mirrored here, not invented. The value must stay positive:
    # evaluate_grayscale_tolerance falls back to 40 on 0, which would
    # silently loosen a strict rule.
    try:
        luma_tolerance = int(detection.get("lumaTolerance", 22))
    except (TypeError, ValueError):
        luma_tolerance = 22

    luma_tolerance = max(1, min(255, luma_tolerance))

    cam_settings = (
        body.get("cameraSettings")
        or body.get("CameraSettings")
        or rule_obj.get("cameraSettings")
        or rule_obj.get("CameraSettings")
    )
    light_settings = (
        body.get("lightSettings")
        or body.get("LightSettings")
        or rule_obj.get("lightSettings")
        or rule_obj.get("LightSettings")
    )

    smp_img: np.ndarray | None = None
    ref_img: np.ndarray | None = None
    if smp_bytes and cv2 is not None:
        smp_arr = np.frombuffer(smp_bytes, dtype=np.uint8)
        smp_img = cv2.imdecode(smp_arr, cv2.IMREAD_COLOR)

    if ref_bytes and cv2 is not None:
        ref_arr = np.frombuffer(ref_bytes, dtype=np.uint8)
        ref_img = cv2.imdecode(ref_arr, cv2.IMREAD_COLOR)

    # Symmetric treatment (spec 02 §4): the sample and the reference receive
    # the SAME downsample factor and the SAME optical settings, or neither
    # (when cv2 is unavailable nothing is decoded and both stay raw). The
    # treated values are committed only if the treated reference encodes
    # back to bytes, so a failed encode cannot leave an asymmetric pair.
    treatment_factor = 1.0

    if smp_img is not None and ref_img is not None:
        factor = min(
            downsample_factor_for(smp_img),
            downsample_factor_for(ref_img),
        )

        treated_smp = smp_img
        treated_ref = ref_img

        if factor < 1.0:
            treated_smp = resize_by_factor(treated_smp, factor)
            treated_ref = resize_by_factor(treated_ref, factor)

        if cam_settings or light_settings:
            treated_smp = apply_optical_settings(treated_smp, cam_settings, light_settings)
            treated_ref = apply_optical_settings(treated_ref, cam_settings, light_settings)

        ok, ref_png = cv2.imencode(".png", treated_ref)

        if ok:
            smp_img = treated_smp
            ref_bytes = ref_png.tobytes()
            treatment_factor = factor

            if factor < 1.0 and roi is not None:
                roi = BoundingBox(
                    x=int(round(roi.x * factor)),
                    y=int(round(roi.y * factor)),
                    width=max(1, int(round(roi.width * factor))),
                    height=max(1, int(round(roi.height * factor))),
                )

    # Per-image ROI conversion for the grayscale evaluator (spec 01 §7.3):
    # the canonical ROI is converted into each treated image's pixel
    # space, because the reference and the sample may differ in size.
    # The pattern_match branch below does its own conversion and does
    # not use these values. When the recorded space is unknown both
    # images share the ROI (the pre-existing behavior).
    roi_recorded_size = _roi_recorded_size(body.get("roi"))
    gray_ref_size: tuple[int, int] | None = None
    gray_smp_size: tuple[int, int] | None = None

    if cv2 is not None:
        gray_ref_decoded = cv2.imdecode(np.frombuffer(ref_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)

        if gray_ref_decoded is not None:
            gray_ref_size = (gray_ref_decoded.shape[1], gray_ref_decoded.shape[0])

    if smp_img is not None:
        gray_smp_size = (smp_img.shape[1], smp_img.shape[0])

    gray_ref_roi, gray_smp_roi = _per_image_rois(
        roi, roi_recorded_size, treatment_factor, gray_ref_size, gray_smp_size
    )

    start_time = time.perf_counter()
    result: ConfidenceResult

    if rule_type == "grayscale_tolerance":
        if roi is None:
            result = ConfidenceResult(
                score=0.0,
                is_pass=False,
                label="missing_roi",
                verdict="FAIL",
                reason="Greyscale inspection is not configured: missing saved search ROI.",
            )
        else:
            result = await evaluate_grayscale_tolerance(
                reference_bytes=ref_bytes,
                sample_bytes=smp_img if smp_img is not None else smp_bytes,
                roi=roi,
                ref_roi=gray_ref_roi,
                smp_roi=gray_smp_roi,
                tolerance=luma_tolerance,
                threshold=threshold,
                tape_mode=bool(body.get("tapeMode", False)),
            )
    elif rule_type == "pattern_match":
        ref_arr = np.frombuffer(ref_bytes, dtype=np.uint8)
        ref_img = cv2.imdecode(ref_arr, cv2.IMREAD_COLOR)

        if ref_img is None or smp_img is None:
            result = ConfidenceResult(
                score=0.0,
                is_pass=False,
                label="decode_error",
                verdict="FAIL",
                reason="Failed to decode image buffers",
            )
        elif roi is None:
            result = ConfidenceResult(
                score=0.0,
                is_pass=False,
                label="missing_roi",
                verdict="FAIL",
                reason="Pattern inspection is not configured: missing saved search ROI.",
            )
        else:
            # Convert the canonical ROI into each image's pixel space before
            # slicing; the search window (search_padding) is expanded
            # in sample space, after conversion, and clamped to the sample
            # bounds. A fully out-of-bounds ROI is a FAIL
            # verdict, not a short or empty slice.
            recorded_size = _roi_recorded_size(body.get("roi"))
            ref_roi = convert_roi_to_image(
                roi,
                recorded_size=recorded_size,
                image_size=(ref_img.shape[1], ref_img.shape[0]),
            )
            smp_roi = convert_roi_to_image(
                roi,
                recorded_size=recorded_size,
                image_size=(smp_img.shape[1], smp_img.shape[0]),
            )
            try:
                tmpl_img = _clip_to_roi(ref_img, ref_roi)
                search_roi = BoundingBox(
                    x=max(0, smp_roi.x - search_padding),
                    y=max(0, smp_roi.y - search_padding),
                    width=min(smp_img.shape[1] - max(0, smp_roi.x - search_padding), smp_roi.width + search_padding * 2),
                    height=min(smp_img.shape[0] - max(0, smp_roi.y - search_padding), smp_roi.height + search_padding * 2),
                )
                search_area = _clip_to_roi(smp_img, search_roi)
            except ValueError as exc:
                result = ConfidenceResult(
                    score=0.0,
                    is_pass=False,
                    label="roi_out_of_bounds",
                    verdict="FAIL",
                    reason=str(exc),
                )
            else:
                result = _match_pattern(search_area, tmpl_img, threshold=threshold)
    elif rule_type == "shape_track":
        if smp_img is None:
            result = ConfidenceResult(
                score=0.0,
                is_pass=False,
                label="decode_error",
                verdict="FAIL",
                reason="Failed to decode sample image",
            )
        else:
            try:
                clipped = _clip_to_roi(smp_img, roi)
            except ValueError as exc:
                result = ConfidenceResult(
                    score=0.0,
                    is_pass=False,
                    label="roi_out_of_bounds",
                    verdict="FAIL",
                    reason=str(exc),
                )
            else:
                result = _track_shapes(clipped, threshold=threshold)
    elif rule_type == "color_area":
        if smp_img is None:
            result = ConfidenceResult(
                score=0.0,
                is_pass=False,
                label="decode_error",
                verdict="FAIL",
                reason="Failed to decode sample image",
            )
        else:
            try:
                clipped = _clip_to_roi(smp_img, roi)
            except ValueError as exc:
                result = ConfidenceResult(
                    score=0.0,
                    is_pass=False,
                    label="roi_out_of_bounds",
                    verdict="FAIL",
                    reason=str(exc),
                )
            else:
                result = _check_color_area(clipped, (0, 30, 30), (180, 255, 255), threshold=threshold)
    elif rule_type in ("blob_area", "blob", "defect"):
        if smp_img is None:
            result = ConfidenceResult(
                score=0.0,
                is_pass=False,
                label="decode_error",
                verdict="FAIL",
                reason="Failed to decode sample image",
            )
        else:
            try:
                clipped = _clip_to_roi(smp_img, roi)
            except ValueError as exc:
                result = ConfidenceResult(
                    score=0.0,
                    is_pass=False,
                    label="roi_out_of_bounds",
                    verdict="FAIL",
                    reason=str(exc),
                )
            else:
                result = _measure_blob_area(
                    clipped,
                    calibration_factor=calibration_factor,
                    unit=calibration_unit,
                )
    elif rule_type in ("edge_width", "profile_width", "edge_pitch"):
        if smp_img is None:
            result = ConfidenceResult(
                score=0.0,
                is_pass=False,
                label="decode_error",
                verdict="FAIL",
                reason="Failed to decode sample image",
            )
        else:
            try:
                clipped = _clip_to_roi(smp_img, roi)
            except ValueError as exc:
                result = ConfidenceResult(
                    score=0.0,
                    is_pass=False,
                    label="roi_out_of_bounds",
                    verdict="FAIL",
                    reason=str(exc),
                )
            else:
                result = _measure_edge_width(
                    clipped,
                    calibration_factor=calibration_factor,
                    unit=calibration_unit,
                )
    else:
        # Default fallback to grayscale tolerance
        result = await evaluate_grayscale_tolerance(
            reference_bytes=ref_bytes,
            sample_bytes=smp_img if smp_img is not None else smp_bytes,
            roi=roi,
            ref_roi=gray_ref_roi,
            smp_roi=gray_smp_roi,
            tolerance=luma_tolerance,
            threshold=threshold,
            tape_mode=bool(body.get("tapeMode", False)),
        )

    duration_ms = max(1, int((time.perf_counter() - start_time) * 1000))

    # Multi-slot carrier belt segmentation & occupancy detection
    slots_payload: list[dict[str, Any]] = []
    has_multi_slot = False
    overall_pass = bool(result.is_pass)

    if smp_img is not None:
        seg_res = segment_carrier_belt(
            smp_img,
            expected_slot_width=roi.width if roi is not None else None,
        )

        if seg_res.totalSlots > 1:
            has_multi_slot = True

            for s_item in seg_res.slots:
                slot_pass = s_item.isOccupied and bool(result.is_pass)
                slot_verdict = "PASS" if slot_pass else ("EMPTY" if not s_item.isOccupied else "FAIL")

                if not slot_pass:
                    overall_pass = False

                slots_payload.append({
                    "slotIndex": s_item.slotIndex,
                    "state": s_item.state,
                    "isOccupied": s_item.isOccupied,
                    "isPass": slot_pass,
                    "verdict": slot_verdict,
                    "score": round(float(result.score if s_item.isOccupied else 0.0), 1),
                    "reason": s_item.reason if not s_item.isOccupied else getattr(result, "reason", ""),
                    "defect": "EMPTY_POCKET" if not s_item.isOccupied else (None if slot_pass else "DEVICE_DEFECT"),
                })

    score_payload = {
        "is_pass": overall_pass,
        "confidence": round(float(result.score), 1),
        "label": str(result.label),
        "verdict": "PASS" if overall_pass else "FAIL",
        "reason": getattr(result, "reason", ""),
        "trace": getattr(result, "trace", None) or {},
        "hasMultiSlot": has_multi_slot,
        "totalSlots": len(slots_payload) if has_multi_slot else 1,
        "slots": slots_payload,
        "calibration": {
            "factor": calibration_factor,
            "unit": calibration_unit,
        },
        "optical": {
            "cameraSettings": cam_settings,
            "lightSettings": light_settings,
        }
        if (cam_settings or light_settings)
        else None,
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
            "hasOptical": bool(cam_settings or light_settings),
            "downsampleFactor": treatment_factor,
            "hasMultiSlot": has_multi_slot,
            "totalSlots": len(slots_payload) if has_multi_slot else 1,
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
    wire["hasMultiSlot"] = score_payload["hasMultiSlot"]
    wire["totalSlots"] = score_payload["totalSlots"]
    wire["slots"] = score_payload["slots"]
    wire["calibration"] = score_payload["calibration"]
    wire["optical"] = score_payload["optical"]
    wire["runId"] = score_payload.get("runId")

    return JSONResponse(content=wire, headers={CORRELATION_HEADER: cid})



__all__ = ["router"]
