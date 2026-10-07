"""Handler simulation and automated feeder sequence endpoint (Day 10 MVP).

Provides:
- GET /handler/status (current handler simulator state & bin statistics)
- POST /handler/step (simulate single part index -> capture -> evaluate -> sort cycle)
- POST /handler/start (start automated continuous handler feed)
- POST /handler/stop (pause/stop automated continuous handler feed)
- POST /handler/reset (reset simulation counters and bins)
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from enum import StrEnum
from pathlib import Path
from typing import Any, Final

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from BE.app.domain.vision_eval import (
    BoundingBox,
    evaluate_grayscale_tolerance,
)
from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from BE.repos.sqlite_results_repo import SqliteResultsRepo

logger = logging.getLogger("BE.routes.handler")

router = APIRouter(prefix="/handler")

_REPO_ROOT = Path(__file__).resolve().parents[2]


class SortDestinationType(StrEnum):
    """Destination tray or rejection bin for sorted parts."""

    TRAY_A_ACCEPTED = "Tray A (Accepted / Good)"
    BIN_B_REJECTED = "Bin B (Rejected / Defect)"


class VerdictType(StrEnum):
    """Standard inspection verdict."""

    PASS = "Pass"
    FAIL = "Fail"


class DecisionType(StrEnum):
    """High-level inspection decision."""

    PASS = "PASS"
    FAIL = "FAIL"


# Optical and inspection parameters
DEFAULT_ROI_X: Final[int] = 100
DEFAULT_ROI_Y: Final[int] = 100
DEFAULT_ROI_WIDTH: Final[int] = 440
DEFAULT_ROI_HEIGHT: Final[int] = 320
DEFAULT_TOLERANCE: Final[int] = 40
DEFAULT_THRESHOLD: Final[float] = 0.8
DEFAULT_FEED_RATE_MS: Final[int] = 1500

FALLBACK_IMAGE_WIDTH: Final[int] = 640
FALLBACK_IMAGE_HEIGHT: Final[int] = 480

# Standard carrier tape fixture samples representing production stream
HANDLER_SAMPLE_STREAM: Final[tuple[str, ...]] = (
    "/src/assets/samples/pocket-1-filled.jpg",
    "/src/assets/samples/pocket-2-filled.jpg",
    "/src/assets/samples/pocket-2-empty-mixed.jpg",
    "/src/assets/samples/pocket-3-filled.jpg",
    "/src/assets/samples/pocket-4-filled.jpg",
    "/src/assets/samples/pocket-5-partial.jpg",
)

_SIMULATOR_STATE: dict[str, Any] = {
    "is_running": False,
    "cycle_count": 0,
    "current_stream_index": 0,
    "current_pocket_id": "LOT-2026-P0001",
    "accept_count": 0,
    "reject_count": 0,
    "last_cycle_ms": 0,
    "last_event": None,
    "feed_rate_ms": DEFAULT_FEED_RATE_MS,
}

_BACKGROUND_TASK: asyncio.Task[None] | None = None


def _load_sample_image(rel_path: str) -> bytes:
    clean = rel_path.lstrip("/")
    full_path = _REPO_ROOT / clean
    if full_path.exists():
        return full_path.read_bytes()

    # Fallback to pocket 1
    fallback = _REPO_ROOT / "src" / "assets" / "samples" / "pocket-1-filled.jpg"
    if fallback.exists():
        return fallback.read_bytes()

    import cv2
    import numpy as np

    img = np.zeros((FALLBACK_IMAGE_HEIGHT, FALLBACK_IMAGE_WIDTH, 3), dtype=np.uint8)
    cv2.rectangle(img, (200, 150), (440, 330), (180, 180, 180), -1)
    _, enc = cv2.imencode(".jpg", img)
    return enc.tobytes()


async def _execute_single_cycle() -> dict[str, Any]:
    """Execute one full handler indexer cycle: move -> acquire -> score -> sort -> persist."""
    start_time = time.perf_counter()
    _SIMULATOR_STATE["cycle_count"] += 1
    stream_idx = _SIMULATOR_STATE["current_stream_index"]
    sample_path = HANDLER_SAMPLE_STREAM[stream_idx]
    _SIMULATOR_STATE["current_stream_index"] = (stream_idx + 1) % len(HANDLER_SAMPLE_STREAM)

    pocket_num = _SIMULATOR_STATE["cycle_count"]
    part_id = f"LOT-2026-P{pocket_num:04d}"
    _SIMULATOR_STATE["current_pocket_id"] = part_id

    # 1. Acquire reference and sample frame
    ref_bytes = _load_sample_image(HANDLER_SAMPLE_STREAM[0])
    smp_bytes = _load_sample_image(sample_path)

    # 2. Evaluate against standard Post-Seal ROI inspection
    roi = BoundingBox(
        x=DEFAULT_ROI_X,
        y=DEFAULT_ROI_Y,
        width=DEFAULT_ROI_WIDTH,
        height=DEFAULT_ROI_HEIGHT,
    )
    conf_res = await evaluate_grayscale_tolerance(
        reference_bytes=ref_bytes,
        sample_bytes=smp_bytes,
        roi=roi,
        tolerance=DEFAULT_TOLERANCE,
        threshold=DEFAULT_THRESHOLD,
    )

    elapsed_ms = max(1, int((time.perf_counter() - start_time) * 1000))
    _SIMULATOR_STATE["last_cycle_ms"] = elapsed_ms

    is_pass = conf_res.is_pass
    verdict_str = VerdictType.PASS.value if is_pass else VerdictType.FAIL.value
    decision_str = DecisionType.PASS.value if is_pass else DecisionType.FAIL.value

    # 3. Handler sorting mechanism
    if is_pass:
        _SIMULATOR_STATE["accept_count"] += 1
        sort_destination = SortDestinationType.TRAY_A_ACCEPTED.value
    else:
        _SIMULATOR_STATE["reject_count"] += 1
        sort_destination = SortDestinationType.BIN_B_REJECTED.value

    # 4. Durable persistence to SQLite task.db
    run_id = f"01J{int(time.time() * 1000):012d}H1"
    try:
        repo = SqliteResultsRepo()
        session_id = repo.create_run_session(
            run_id=run_id,
            verdict=verdict_str,
            mode="handler_sim",
            image_file_path=sample_path,
            rule_count=1,
            active_count=1,
            pass_count=1 if is_pass else 0,
            fail_count=0 if is_pass else 1,
        )
        frame_id = repo.create_frame(run_id=run_id)
        result_id = repo.save_result(
            run_id=run_id,
            frame_id=frame_id,
            decision=decision_str,
            score_percent=round(float(conf_res.score), 1),
            duration_ms=elapsed_ms,
        )
        repo.save_result_detail(
            result_id=result_id,
            rule_name="post_seal_pocket_verify",
            is_passed=is_pass,
            measured_value=conf_res.score,
            message=conf_res.reason,
        )
        repo.save_rule_result(
            run_session_id=session_id,
            verdict=verdict_str,
            rule_kind="grayscale_tolerance",
            reason_message=conf_res.reason,
            elapsed_ms=float(elapsed_ms),
            metrics_json=json.dumps({"partId": part_id, "sortDestination": sort_destination}),
        )
    except Exception as exc:
        logger.warning("Handler cycle persistence failed: %s", exc)
        session_id = 0

    event_payload = {
        "cycleNumber": pocket_num,
        "partId": part_id,
        "imageFilePath": sample_path,
        "is_pass": is_pass,
        "verdict": verdict_str,
        "score": round(float(conf_res.score), 1),
        "reason": conf_res.reason,
        "sortDestination": sort_destination,
        "durationMs": elapsed_ms,
        "runSessionId": session_id,
        "timestamp": int(time.time()),
    }
    _SIMULATOR_STATE["last_event"] = event_payload
    return event_payload


async def _continuous_feeder_loop() -> None:
    """Async background task that cycles parts while is_running is True."""
    try:
        while _SIMULATOR_STATE["is_running"]:
            await _execute_single_cycle()
            feed_rate = _SIMULATOR_STATE.get("feed_rate_ms", 1500) / 1000.0
            await asyncio.sleep(feed_rate)
    except asyncio.CancelledError:
        pass
    except Exception as exc:
        logger.error("Continuous feeder loop encountered error: %s", exc)
    finally:
        _SIMULATOR_STATE["is_running"] = False


@router.get("/status")
async def get_handler_status(request: Request) -> JSONResponse:
    """Return the current handler simulation and sorting bin status."""
    cid = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    env = success(_SIMULATOR_STATE, requested_at=str(request.url))
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: cid})


@router.post("/step")
async def step_handler(request: Request) -> JSONResponse:
    """Trigger a single index -> capture -> evaluate -> sort cycle."""
    cid = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    cycle_result = await _execute_single_cycle()
    payload = {
        "cycle": cycle_result,
        "simulatorState": {
            "cycleCount": _SIMULATOR_STATE["cycle_count"],
            "acceptCount": _SIMULATOR_STATE["accept_count"],
            "rejectCount": _SIMULATOR_STATE["reject_count"],
            "isRunning": _SIMULATOR_STATE["is_running"],
        },
    }
    env = success(payload, requested_at=str(request.url))
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: cid})


@router.post("/start")
async def start_handler(request: Request) -> JSONResponse:
    """Start continuous automated part feeding and inspection."""
    global _BACKGROUND_TASK
    cid = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))

    if not _SIMULATOR_STATE["is_running"]:
        _SIMULATOR_STATE["is_running"] = True
        _BACKGROUND_TASK = asyncio.create_task(_continuous_feeder_loop())

    env = success(
        {"is_running": True, "message": "Handler automated simulation started"},
        requested_at=str(request.url),
    )
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: cid})


@router.post("/stop")
async def stop_handler(request: Request) -> JSONResponse:
    """Stop continuous automated part feeding."""
    global _BACKGROUND_TASK
    cid = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))

    _SIMULATOR_STATE["is_running"] = False
    if _BACKGROUND_TASK and not _BACKGROUND_TASK.done():
        _BACKGROUND_TASK.cancel()
        _BACKGROUND_TASK = None

    env = success(
        {"is_running": False, "message": "Handler automated simulation stopped"},
        requested_at=str(request.url),
    )
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: cid})


@router.post("/reset")
async def reset_handler(request: Request) -> JSONResponse:
    """Reset simulator counters and sorting bins."""
    global _BACKGROUND_TASK
    cid = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))

    _SIMULATOR_STATE["is_running"] = False
    if _BACKGROUND_TASK and not _BACKGROUND_TASK.done():
        _BACKGROUND_TASK.cancel()
        _BACKGROUND_TASK = None

    _SIMULATOR_STATE["cycle_count"] = 0
    _SIMULATOR_STATE["current_stream_index"] = 0
    _SIMULATOR_STATE["accept_count"] = 0
    _SIMULATOR_STATE["reject_count"] = 0
    _SIMULATOR_STATE["last_event"] = None

    env = success(
        {"reset": True, "message": "Handler counters and bins reset to zero"},
        requested_at=str(request.url),
    )
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: cid})


__all__ = ["router"]
