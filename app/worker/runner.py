"""Worker runner skeleton (spec 13, spec 36).

Accepts an InstructionBundle, verifies `SchemaVersion` and `SourceHash`, and
returns a Judgment record. Rule evaluation itself is stubbed in M3; the
guards, error codes, and IO contract are locked here.
"""
from __future__ import annotations

import logging
from typing import Any

from app.dispatcher.instruction_bundle import (
    INSTRUCTION_SCHEMA_VERSION,
    InstructionBundle,
    compute_source_hash,
)

log = logging.getLogger(__name__)


class InstructionSchemaError(RuntimeError):
    code = "E_INSTRUCTION_SCHEMA"


class InstructionTampered(RuntimeError):
    code = "E_INSTRUCTION_TAMPERED"


def verify_bundle(bundle: InstructionBundle) -> None:
    schema = bundle.get("SchemaVersion")
    if schema != INSTRUCTION_SCHEMA_VERSION:
        raise InstructionSchemaError(f"got={schema} want={INSTRUCTION_SCHEMA_VERSION}")
    expected = compute_source_hash(
        list(bundle["Regions"]),
        list(bundle["ToleranceProfiles"]),
        list(bundle["Rules"]),
    )
    if bundle["SourceHash"] != expected:
        raise InstructionTampered(f"instructionId={bundle['InstructionId']}")


def evaluate(bundle: InstructionBundle, worker_id: int, processed_at: str) -> dict[str, Any]:
    """Stub: verifies bundle and emits a passing Judgment. Real evaluators land in M6."""
    verify_bundle(bundle)
    log.info(
        "worker.evaluate workerId=%d taskId=%s instructionId=%s",
        worker_id, bundle["TaskId"], bundle["InstructionId"],
    )
    return {
        "type": "JudgmentEmitted",
        "taskId": bundle["TaskId"],
        "imageId": bundle["Image"]["ImageId"],
        "instructionId": bundle["InstructionId"],
        "judgmentCode": "OK",
        "reason": None,
        "ruleResults": [],
        "processedAt": processed_at,
        "workerId": worker_id,
    }
