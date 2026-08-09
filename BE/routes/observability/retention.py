"""Plan 90 Step 111 - GET /observability/retention.

Read-only view over the rotated JSONL retention audit stream written by
``BE.app.retention_audit.append_pass`` (Step 110). Combines
``<APP_LOG_ROOT>/retention.log`` + ``retention.log.1`` via
``BE.app.jsonl_rotator.read_pair`` (which returns previous-first, then
current, i.e. oldest-first) and returns the newest ``limit`` rows.

Root cause guarded (one sentence): Step 110 persists per-pass rows but
nothing exposed them over HTTP, so the future FE observability view and
any operator not on the box had no way to answer "did last night's
retention pass run and what did it drop?".

Contract
--------

Request::

    GET /observability/retention?limit=<1..500>&mode=<single-shot|loop>

    * ``limit`` optional, default 50, hard ceiling 500 (bounded so a big
      generation cannot flood one response).
    * ``mode`` optional, filters to a single ``Mode`` value.

Response ``Data`` shape::

    {
      "items":         [ <row>, ... ],   # newest-first
      "total":         <int>,            # rows returned
      "available":     <int>,            # rows in both generations (pre-filter)
      "limit":         <int>,
      "currentPath":   "<abs path>",
      "previousPath":  "<abs path>",
      "hasCurrent":    <bool>,
      "hasPrevious":   <bool>
    }

Row shape matches ``retention_audit.build_row``: ``TimestampUtc``,
``Mode``, ``PassIndex``, plus ``RetentionOutcome.to_wire()`` keys.

Failure surface
---------------

* Bad params -> ``E_BE_BAD_REQUEST`` (400).
* Log root unresolvable (bad env override, no HOME) -> ``E_BE_INTERNAL``
  (500) with the underlying ``AppError.details`` copied for the operator.
* I/O failure reading the JSONL files -> ``E_BE_INTERNAL`` (500). Poison
  lines are NOT an error: ``read_jsonl`` surfaces them as
  ``{"_Raw": ..., "_ParseError": ...}`` rows so a corrupt tail can never
  silently drop from the view (spec 03 loud-failure contract).
* Missing files are NOT an error: they mean retention has never run in
  this environment, so we return an empty items list with ``hasCurrent``
  / ``hasPrevious`` = false. Distinguishing "empty" from "missing" is
  what those two booleans exist for.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from BE.app.jsonl_rotator import read_pair
from BE.app.retention_audit import audit_paths
from BE.cli.common.paths import resolve_root
from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

logger = logging.getLogger("BE.routes.observability.retention")

router = APIRouter(prefix="/observability")

_DEFAULT_LIMIT = 50
_MAX_LIMIT = 500
_ALLOWED_MODES = ("single-shot", "loop", "loop-halt")


def _validate_limit(raw: int) -> int:
    if raw < 1 or raw > _MAX_LIMIT:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"limit must be between 1 and {_MAX_LIMIT}",
            details={"Received": raw, "Min": 1, "Max": _MAX_LIMIT},
        )
    return raw


def _validate_mode(raw: str | None) -> str | None:
    if raw is None:
        return None
    if raw not in _ALLOWED_MODES:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "mode must be one of single-shot|loop|loop-halt",
            details={"Received": raw, "Allowed": list(_ALLOWED_MODES)},
        )

    return raw


def _resolve_log_root(correlation_id: str) -> Path:
    try:
        return resolve_root("log")
    except AppError as exc:
        logger.error(
            "retention_log_root_unresolved",
            extra={
                "CorrelationId": correlation_id,
                "operation": "GET /observability/retention",
                "code": ErrorCode.E_BE_INTERNAL.value,
                "cause_code": exc.code.value,
            },
        )
        raise AppError(
            ErrorCode.E_BE_INTERNAL,
            "cannot resolve APP_LOG_ROOT for retention audit",
            details={"CauseCode": exc.code.value, **(exc.details or {})},
        ) from exc


def _read_rows(current: Path, previous: Path, correlation_id: str) -> list[dict[str, Any]]:
    try:
        return read_pair(current, previous)
    except OSError as exc:
        logger.error(
            "retention_audit_read_failed",
            extra={
                "CorrelationId": correlation_id,
                "operation": "GET /observability/retention",
                "code": ErrorCode.E_BE_INTERNAL.value,
                "current_path": str(current),
                "previous_path": str(previous),
                "os_error": str(exc),
            },
        )
        raise AppError(
            ErrorCode.E_BE_INTERNAL,
            "retention audit read failed",
            details={
                "CurrentPath": str(current),
                "PreviousPath": str(previous),
                "OsError": str(exc),
            },
        ) from exc


def _filter_by_mode(rows: list[dict[str, Any]], mode: str | None) -> list[dict[str, Any]]:
    if mode is None:
        return rows
    return [r for r in rows if r.get("Mode") == mode]


@router.get("/retention")
async def list_retention(
    request: Request,
    limit: int = Query(_DEFAULT_LIMIT, description="1..500, default 50"),
    mode: str | None = Query(None, description="single-shot | loop | loop-halt"),
) -> JSONResponse:
    """Return the newest ``limit`` retention audit rows (newest-first)."""
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    limit_v = _validate_limit(limit)
    mode_v = _validate_mode(mode)

    log_root = _resolve_log_root(correlation_id)
    current, previous = audit_paths(log_root)

    rows = _read_rows(current, previous, correlation_id)
    filtered = _filter_by_mode(rows, mode_v)
    # ``read_pair`` returns oldest-first; slice the tail then reverse so
    # the response is newest-first for FE convenience.
    tail = filtered[-limit_v:]
    items = list(reversed(tail))

    payload = {
        "items": items,
        "total": len(items),
        "available": len(rows),
        "limit": limit_v,
        "currentPath": str(current),
        "previousPath": str(previous),
        "hasCurrent": current.is_file(),
        "hasPrevious": previous.is_file(),
    }
    logger.info(
        "retention_listed",
        extra={
            "CorrelationId": correlation_id,
            "operation": "GET /observability/retention",
            "returned": len(items),
            "available": len(rows),
            "mode_filter": mode_v,
        },
    )
    env = success(payload, requested_at=str(request.url))
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: correlation_id})
