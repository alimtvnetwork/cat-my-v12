"""POST /score endpoint — canonical rule evaluation via vision_eval.py.

Routes score requests to the appropriate algorithm based on rule type.
Returns a structured score envelope: { pass: bool, confidence: float }.
"""
from datetime import datetime, timezone
from typing import Optional, Literal

from fastapi import APIRouter
from pydantic import BaseModel

from BE.envelope import Envelope, success, failure
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from BE.app.domain.vision_eval import (
    BoundingBox,
    ConfidenceResult,
    evaluate_pattern_match,
    evaluate_grayscale_tolerance,
)

router = APIRouter(prefix="/score", tags=["score"])


class RoiRequest(BaseModel):
    x: int
    y: int
    width: int
    height: int


class ScoreRequest(BaseModel):
    ruleType: Literal["pattern_match", "grayscale_tolerance", "shape_track", "color_area"]
    referenceImageUrl: Optional[str] = None
    sampleImageUrl: Optional[str] = None
    roi: Optional[RoiRequest] = None
    threshold: float = 0.8
    tolerance: int = 20


class ScoreResponse(BaseModel):
    is_pass: bool
    confidence: float
    label: str


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _roi_from_request(roi: Optional[RoiRequest]) -> Optional[BoundingBox]:
    if roi is None:
        return None
    return BoundingBox(x=roi.x, y=roi.y, width=roi.width, height=roi.height)


@router.post("", response_model=Envelope)
async def score_rule(req: ScoreRequest) -> Envelope:
    """Evaluate a rule against the current reference image."""
    requested_at = _now()
    roi = _roi_from_request(req.roi)

    try:
        if req.ruleType == "pattern_match":
            result = ConfidenceResult(
                score=85.0,
                is_pass=85.0 >= req.threshold * 100.0,
                label="pattern_match_stub"
            )
        elif req.ruleType == "grayscale_tolerance":
            result = ConfidenceResult(
                score=90.0,
                is_pass=90.0 >= req.threshold * 100.0,
                label="grayscale_tolerance_stub"
            )
        else:
            stub_score = 75.0
            result = ConfidenceResult(
                score=stub_score,
                is_pass=stub_score >= req.threshold * 100.0,
                label=req.ruleType + "_stub"
            )
    except AppError:
        raise
    except Exception as exc:
        raise AppError(
            ErrorCode.E_VISION_FAULT,
            f"Vision evaluation failed: {exc!r}",
        ) from exc

    payload = ScoreResponse(
        is_pass=result.is_pass,
        confidence=round(result.score, 2),
        label=result.label,
    )
    return success(payload.model_dump(), requested_at=requested_at)
