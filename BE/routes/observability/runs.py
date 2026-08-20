"""GET /observability/runs* — Plan 90 Step 100.

Read-only Task-DB surface for the FE run-history table, per-run detail
drawer, and per-rule artifact lightbox. Every route is envelope-wrapped
(spec 03 §"Universal Response Envelope") and pages with a hard
``Limit <= 200`` ceiling so a 10k-run DB does not full-table-scan on
every dashboard load. Cross-tier joins are forbidden; the Root-tier
``CliInvocation`` join key is the opaque ``RunId`` string, not an FK.

Endpoints
---------

* ``GET /observability/runs?limit=&verdict=&task_id=&run_id=``
    List runs newest first. ``verdict`` in ``Pass|Fail|Error``. When
    ``run_id`` is supplied it is an exact match on the ULID join key.
    ``limit`` defaults to 50, ceiling 200; violations raise
    ``E_BE_BAD_REQUEST`` (400).

* ``GET /observability/runs/{run_session_id}``
    Single run detail. Unknown id -> ``E_BE_NOT_FOUND`` (404).

* ``GET /observability/runs/{run_session_id}/rules``
    Per-rule verdicts for a run, ordered by ``OrderIndex, RuleResultId``.
    Unknown parent id -> ``E_BE_NOT_FOUND`` (404). Empty list is a
    valid response for a zero-rule bundle.

* ``GET /observability/runs/{run_session_id}/rules/{rule_result_id}/artifacts``
    Artifacts attached to a rule (RuleResultId FK match). Also serves
    run-level artifacts (RuleResultId NULL) when ``rule_result_id`` is
    the sentinel ``0``. Unknown parent chain -> ``E_BE_NOT_FOUND`` (404).

Failure surface
---------------

Every route raises ``AppError`` with a registered code; the shared
handler in ``BE/errors/handlers.py`` renders it as an envelope failure.
A missing table (Task-DB never bootstrapped) surfaces as
``E_BE_INTERNAL`` (500), never a silent empty list.
"""

from __future__ import annotations

import logging
import sqlite3
from typing import Any

from fastapi import APIRouter, Path, Query, Request
from fastapi.responses import JSONResponse

from BE.db.connections import get_task_conn
from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

logger = logging.getLogger("BE.routes.observability.runs")

router = APIRouter(prefix="/observability")

_DEFAULT_LIMIT = 50
_MAX_LIMIT = 200
_ALLOWED_VERDICT = ("Pass", "Fail", "Error")


# ---- guards -------------------------------------------------------------


def _validate_limit(raw: int) -> int:
    if raw < 1 or raw > _MAX_LIMIT:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"limit must be between 1 and {_MAX_LIMIT}",
            details={"Received": raw, "Min": 1, "Max": _MAX_LIMIT},
        )
    return raw


def _validate_verdict(raw: str | None) -> str | None:
    if raw is None:
        return None
    if raw not in _ALLOWED_VERDICT:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "verdict must be one of Pass|Fail|Error",
            details={"Received": raw, "Allowed": list(_ALLOWED_VERDICT)},
        )
    return raw


# ---- conn helper (surfaces missing-table as E_BE_INTERNAL) --------------


def _fetchall(sql: str, params: list[Any], *, correlation_id: str, op: str) -> list[sqlite3.Row]:
    conn = get_task_conn()
    try:
        conn.row_factory = sqlite3.Row
        try:
            return conn.safe_execute(sql, params).fetchall()
        except sqlite3.OperationalError as exc:
            logger.error(
                "runs_query_failed",
                extra={
                    "CorrelationId": correlation_id,
                    "operation": op,
                    "code": ErrorCode.E_BE_INTERNAL.value,
                    "sqlite_error": str(exc),
                },
            )
            raise AppError(
                ErrorCode.E_BE_INTERNAL,
                "task DB query failed; is bin/db-bootstrap.py applied?",
                details={"SqliteError": str(exc), "Hint": "python bin/db-bootstrap.py"},
            ) from exc
    finally:
        conn.close()


def _fetchone(sql: str, params: list[Any], *, correlation_id: str, op: str) -> sqlite3.Row | None:
    rows = _fetchall(sql, params, correlation_id=correlation_id, op=op)
    return rows[0] if rows else None


# ---- row -> wire adapters ------------------------------------------------


def _run_to_wire(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "RunSessionId": int(row["RunSessionId"]),
        "RunId": row["RunId"],
        "TaskId": row["TaskId"],
        "InstructionId": row["InstructionId"],
        "Verdict": row["Verdict"],
        "Mode": row["Mode"],
        "ImageFilePath": row["ImageFilePath"],
        "ResultsJsonlPath": row["ResultsJsonlPath"],
        "RuleCount": int(row["RuleCount"]),
        "ActiveCount": int(row["ActiveCount"]),
        "InactiveCount": int(row["InactiveCount"]),
        "SilentCount": int(row["SilentCount"]),
        "PassCount": int(row["PassCount"]),
        "FailCount": int(row["FailCount"]),
        "ErrorCount": int(row["ErrorCount"]),
        "TimeoutCount": int(row["TimeoutCount"]),
        "PromotedErrorCode": row["PromotedErrorCode"],
        "CapturedAt": None if row["CapturedAt"] is None else int(row["CapturedAt"]),
        "PersistedAt": int(row["PersistedAt"]),
    }


def _rule_to_wire(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "RuleResultId": int(row["RuleResultId"]),
        "RunSessionId": int(row["RunSessionId"]),
        "RuleId": row["RuleId"],
        "RuleKind": row["RuleKind"],
        "Verdict": row["Verdict"],
        "IsSilent": bool(int(row["IsSilent"])),
        "OrderIndex": None if row["OrderIndex"] is None else int(row["OrderIndex"]),
        "ElapsedMs": None if row["ElapsedMs"] is None else float(row["ElapsedMs"]),
        "ErrorCode": row["ErrorCode"],
        "MetricsJson": row["MetricsJson"],
        "PersistedAt": int(row["PersistedAt"]),
    }


def _artifact_to_wire(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "FrameArtifactId": int(row["FrameArtifactId"]),
        "RunSessionId": int(row["RunSessionId"]),
        "RuleResultId": None if row["RuleResultId"] is None else int(row["RuleResultId"]),
        "ArtifactKind": row["ArtifactKind"],
        "RelPath": row["RelPath"],
        "Sha256": row["Sha256"],
        "Bytes": int(row["Bytes"]),
        "MimeType": row["MimeType"],
        "CapturedAt": None if row["CapturedAt"] is None else int(row["CapturedAt"]),
        "PersistedAt": int(row["PersistedAt"]),
    }


# ---- routes -------------------------------------------------------------


@router.get("/runs")
async def list_runs(
    request: Request,
    limit: int = Query(_DEFAULT_LIMIT, description="1..200, default 50"),
    verdict: str | None = Query(None, description="Pass | Fail | Error"),
    task_id: str | None = Query(None, alias="task_id"),
    run_id: str | None = Query(None, alias="run_id"),
) -> JSONResponse:
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    limit_v = _validate_limit(limit)
    verdict_v = _validate_verdict(verdict)

    where: list[str] = []
    params: list[Any] = []
    if verdict_v is not None:
        where.append("Verdict = ?")
        params.append(verdict_v)
    if task_id is not None:
        where.append("TaskId = ?")
        params.append(task_id)
    if run_id is not None:
        where.append("RunId = ?")
        params.append(run_id)
    clause = f" WHERE {' AND '.join(where)}" if where else ""
    sql = (
        "SELECT RunSessionId, RunId, TaskId, InstructionId, Verdict, Mode, "
        "ImageFilePath, ResultsJsonlPath, RuleCount, ActiveCount, "
        "InactiveCount, SilentCount, PassCount, FailCount, ErrorCount, "
        "TimeoutCount, PromotedErrorCode, CapturedAt, PersistedAt "
        f"FROM RunSession{clause} "
        "ORDER BY PersistedAt DESC, RunSessionId DESC LIMIT ?"
    )
    params.append(limit_v)

    rows = _fetchall(sql, params, correlation_id=correlation_id, op="GET /observability/runs")
    items = [_run_to_wire(r) for r in rows]
    logger.info(
        "runs_listed",
        extra={
            "CorrelationId": correlation_id,
            "operation": "GET /observability/runs",
            "count": len(items),
            "filter_verdict": verdict_v,
            "filter_task_id": task_id,
            "filter_run_id": run_id,
            "limit": limit_v,
        },
    )
    payload = {"items": items, "total": len(items), "limit": limit_v}
    env = success(payload, requested_at=str(request.url))
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: correlation_id})


@router.get("/runs/{run_session_id}")
async def get_run(
    request: Request,
    run_session_id: int = Path(..., ge=1),
) -> JSONResponse:
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    row = _fetchone(
        "SELECT RunSessionId, RunId, TaskId, InstructionId, Verdict, Mode, "
        "ImageFilePath, ResultsJsonlPath, RuleCount, ActiveCount, "
        "InactiveCount, SilentCount, PassCount, FailCount, ErrorCount, "
        "TimeoutCount, PromotedErrorCode, CapturedAt, PersistedAt "
        "FROM RunSession WHERE RunSessionId = ?",
        [run_session_id],
        correlation_id=correlation_id,
        op="GET /observability/runs/{id}",
    )
    if row is None:
        raise AppError(
            ErrorCode.E_BE_NOT_FOUND,
            f"RunSession {run_session_id} not found",
            details={"RunSessionId": run_session_id},
        )
    logger.info(
        "run_fetched",
        extra={
            "CorrelationId": correlation_id,
            "operation": "GET /observability/runs/{id}",
            "RunSessionId": run_session_id,
        },
    )
    env = success(_run_to_wire(row), requested_at=str(request.url))
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: correlation_id})


def _ensure_run_exists(run_session_id: int, *, correlation_id: str, op: str) -> None:
    row = _fetchone(
        "SELECT 1 FROM RunSession WHERE RunSessionId = ?",
        [run_session_id],
        correlation_id=correlation_id,
        op=op,
    )
    if row is None:
        raise AppError(
            ErrorCode.E_BE_NOT_FOUND,
            f"RunSession {run_session_id} not found",
            details={"RunSessionId": run_session_id},
        )


@router.get("/runs/{run_session_id}/rules")
async def list_run_rules(
    request: Request,
    run_session_id: int = Path(..., ge=1),
) -> JSONResponse:
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    op = "GET /observability/runs/{id}/rules"
    _ensure_run_exists(run_session_id, correlation_id=correlation_id, op=op)
    rows = _fetchall(
        "SELECT RuleResultId, RunSessionId, RuleId, RuleKind, Verdict, "
        "IsSilent, OrderIndex, ElapsedMs, ErrorCode, MetricsJson, PersistedAt "
        "FROM RuleResult WHERE RunSessionId = ? "
        "ORDER BY COALESCE(OrderIndex, 2147483647) ASC, RuleResultId ASC",
        [run_session_id],
        correlation_id=correlation_id,
        op=op,
    )
    items = [_rule_to_wire(r) for r in rows]
    logger.info(
        "run_rules_listed",
        extra={
            "CorrelationId": correlation_id,
            "operation": op,
            "RunSessionId": run_session_id,
            "count": len(items),
        },
    )
    payload = {"items": items, "total": len(items), "RunSessionId": run_session_id}
    env = success(payload, requested_at=str(request.url))
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: correlation_id})


@router.get("/runs/{run_session_id}/rules/{rule_result_id}/artifacts")
async def list_rule_artifacts(
    request: Request,
    run_session_id: int = Path(..., ge=1),
    rule_result_id: int = Path(..., ge=0),  # 0 = sentinel for run-level (NULL FK)
) -> JSONResponse:
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    op = "GET /observability/runs/{id}/rules/{rid}/artifacts"
    _ensure_run_exists(run_session_id, correlation_id=correlation_id, op=op)

    if rule_result_id == 0:
        rows = _fetchall(
            "SELECT FrameArtifactId, RunSessionId, RuleResultId, ArtifactKind, "
            "RelPath, Sha256, Bytes, MimeType, CapturedAt, PersistedAt "
            "FROM FrameArtifact "
            "WHERE RunSessionId = ? AND RuleResultId IS NULL "
            "ORDER BY FrameArtifactId ASC",
            [run_session_id],
            correlation_id=correlation_id,
            op=op,
        )
    else:
        # Verify the RuleResult belongs to this run before returning artifacts.
        rr = _fetchone(
            "SELECT 1 FROM RuleResult WHERE RuleResultId = ? AND RunSessionId = ?",
            [rule_result_id, run_session_id],
            correlation_id=correlation_id,
            op=op,
        )
        if rr is None:
            raise AppError(
                ErrorCode.E_BE_NOT_FOUND,
                f"RuleResult {rule_result_id} not found under RunSession {run_session_id}",
                details={"RunSessionId": run_session_id, "RuleResultId": rule_result_id},
            )
        rows = _fetchall(
            "SELECT FrameArtifactId, RunSessionId, RuleResultId, ArtifactKind, "
            "RelPath, Sha256, Bytes, MimeType, CapturedAt, PersistedAt "
            "FROM FrameArtifact "
            "WHERE RunSessionId = ? AND RuleResultId = ? "
            "ORDER BY FrameArtifactId ASC",
            [run_session_id, rule_result_id],
            correlation_id=correlation_id,
            op=op,
        )
    items = [_artifact_to_wire(r) for r in rows]
    logger.info(
        "rule_artifacts_listed",
        extra={
            "CorrelationId": correlation_id,
            "operation": op,
            "RunSessionId": run_session_id,
            "RuleResultId": rule_result_id,
            "count": len(items),
        },
    )
    payload = {
        "items": items,
        "total": len(items),
        "RunSessionId": run_session_id,
        "RuleResultId": rule_result_id if rule_result_id > 0 else None,
    }
    env = success(payload, requested_at=str(request.url))
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: correlation_id})


__all__ = ["router"]
