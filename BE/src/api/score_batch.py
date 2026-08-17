"""POST /score/batch — evaluate multiple rules in one request.

Accepts a list of rule IDs and returns a map of ruleId -> ScoreResponse.
"""
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from BE.envelope import Envelope, success
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from BE.app.domain.vision_eval import ConfidenceResult

router = APIRouter(prefix="/score/batch", tags=["score"])


class BatchRuleScore(BaseModel):
    ruleId: str
    ruleType: Literal[
        "pattern_match", "grayscale_tolerance", "shape_track", "color_area"
    ]
    threshold: float = 0.8
    tolerance: int = 20


class BatchScoreRequest(BaseModel):
    rules: list[BatchRuleScore]
    referenceImageUrl: str | None = None


class BatchRuleResult(BaseModel):
    ruleId: str
    is_pass: bool
    confidence: float
    label: str


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _stub_score(rule: BatchRuleScore) -> BatchRuleResult:
    """Return a stub score respecting the configured threshold."""
    score_map = {
        "pattern_match": 85.0,
        "grayscale_tolerance": 90.0,
        "shape_track": 78.0,
        "color_area": 82.0,
    }
    score = score_map.get(rule.ruleType, 75.0)
    return BatchRuleResult(
        ruleId=rule.ruleId,
        is_pass=score >= rule.threshold * 100.0,
        confidence=round(score, 2),
        label=rule.ruleType + "_stub",
    )


@router.post("", response_model=Envelope)
async def batch_score_rules(req: BatchScoreRequest) -> Envelope:
    """Evaluate a list of rules sequentially, returning all results."""
    requested_at = _now()
    try:
        results = [_stub_score(rule) for rule in req.rules]
    except AppError:
        raise
    except Exception as exc:
        raise AppError(
            ErrorCode.E_VISION_FAULT,
            f"Batch evaluation failed: {exc!r}",
        ) from exc

    payload = [r.model_dump() for r in results]
    return success({"results": payload, "total": len(payload)}, requested_at=requested_at)
