"""POST /errors + GET /errors* — Spec 54 error ingest + readout.

Frontend `CapturedError` records land in the Task-tier `Error` table
(migration 0029) so errors survive the browser session, and the CLI
(`BE/cli/processing/commands/errors.py`) reads the same table. One SQL
owner: `BE/app/db/writers/error.py` — this module only maps the wire
shape and wraps results in the Universal Response Envelope
(spec 03 §"Universal Response Envelope").

Endpoints
---------

* ``POST /errors``
    Ingest one `CapturedError` object, a JSON array of them, or
    ``{"items": [...]}``. The frontend `id` (uuid) is NOT stored;
    `correlationId` is the identity (UNIQUE in migration 0029), so a
    retried ingest is an idempotent skip, reported as `skipped`, never
    a duplicate row. Malformed records raise ``E_BE_BAD_REQUEST`` (400)
    naming the field; a missing table raises ``E_BE_INTERNAL`` (500)
    with the `bin/db-bootstrap.py` hint, never a silent empty success.

* ``GET /errors?limit=&code=&level=&session_id=&correlation_id=``
    List errors newest first. ``limit`` defaults to 50, ceiling 200;
    violations raise ``E_BE_BAD_REQUEST`` (400).

* ``GET /errors/{correlation_id}``
    Single error with the full stack trace. Unknown id ->
    ``E_BE_NOT_FOUND`` (404).

Wire mapping (frontend camelCase -> DB PascalCase) is done here so the
writer stays shape-agnostic: `correlationId`, `code`, `level`,
`message`, `stackTrace`, `endpoint`, `triggerComponent`, `sessionId`,
`createdAt` map to columns; the remaining diagnostic fields
(`context`, `triggerAction`, `invocationChain`, `method`,
`responseStatus`, `backendStackTrace`, `file`, `line`, `function`,
`envelopeErrors`) merge into `Details` (redacted at write time per
AC-01). Interaction traces (`backendLogs`, `uiClickPath`,
`executionLogs`) stay in browser history + export and are NOT stored
here, keeping the table focused on the failure itself.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Path, Query, Request
from fastapi.responses import JSONResponse

from BE.app.db.writers import error as error_writer
from BE.db.connections import get_task_conn
from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

logger = logging.getLogger("BE.routes.errors")

router = APIRouter(prefix="/errors")

_DEFAULT_LIMIT = 50
_MAX_LIMIT = 200

# Diagnostic fields folded into Details (see module docstring). `context`
# merges first so its keys survive alongside the named fields.
_DETAILS_FIELDS: tuple[str, ...] = (
    "triggerAction",
    "invocationChain",
    "method",
    "responseStatus",
    "backendStackTrace",
    "file",
    "line",
    "function",
    "envelopeErrors",
)


def _to_writer_record(payload: dict[str, Any]) -> dict[str, Any]:
    """Map one frontend `CapturedError` object onto the writer record shape."""
    if not isinstance(payload, dict):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "each error must be a JSON object",
            {"Type": type(payload).__name__},
        )
    record: dict[str, Any] = {
        "CorrelationId": payload.get("correlationId"),
        "Code": payload.get("code"),
        "Level": payload.get("level"),
        "Message": payload.get("message"),
        "StackTrace": payload.get("stackTrace"),
        "Endpoint": payload.get("endpoint"),
        "TriggerComponent": payload.get("triggerComponent"),
        "SessionId": payload.get("sessionId"),
        "CreatedAt": payload.get("createdAt"),
    }
    details = payload.get("details")
    if isinstance(details, str) and details:
        record["Details"] = details
    else:
        merged: dict[str, Any] = {}
        context = payload.get("context")
        if isinstance(context, dict):
            merged.update(context)
        for key in _DETAILS_FIELDS:
            if payload.get(key) is not None:
                merged[key] = payload[key]
        if merged:
            record["Details"] = merged
    return record


def _normalize_body(body: Any) -> list[dict[str, Any]]:
    """Accept a single object, an array, or ``{"items": [...]}``."""
    if isinstance(body, list):
        return [_to_writer_record(item) for item in body]
    if isinstance(body, dict) and isinstance(body.get("items"), list):
        return [_to_writer_record(item) for item in body["items"]]
    if isinstance(body, dict):
        return [_to_writer_record(body)]
    raise AppError(
        ErrorCode.E_BE_BAD_REQUEST,
        "POST /errors body must be an error object, an array, or {items: [...]}",
        {"Type": type(body).__name__},
    )


@router.post("")
async def ingest_errors(request: Request) -> JSONResponse:
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    try:
        body = await request.json()
    except ValueError as exc:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "POST /errors body is not valid JSON",
            {"Error": str(exc)},
        ) from exc
    records = _normalize_body(body)
    if not records:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "POST /errors body contains no errors",
            {"Received": body if isinstance(body, (list, dict)) else type(body).__name__},
        )

    conn = get_task_conn()
    try:
        outcome = error_writer.write_errors(conn, errors=records)
    finally:
        conn.close()
    logger.info(
        "errors_ingested",
        extra={
            "CorrelationId": correlation_id,
            "operation": "POST /errors",
            "inserted": outcome.InsertedCount,
            "skipped": outcome.SkippedCount,
        },
    )
    payload = {
        "inserted": outcome.InsertedCount,
        "skipped": outcome.SkippedCount,
        "rows": [
            {
                "ErrorId": r.ErrorId,
                "CorrelationId": r.CorrelationId,
                "Code": r.Code,
                "Level": r.Level,
                "Message": r.Message,
                "WasInserted": r.WasInserted,
            }
            for r in outcome.Rows
        ],
    }
    env = success(payload, requested_at=str(request.url))
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: correlation_id})


@router.get("")
async def list_errors_route(
    request: Request,
    limit: int = Query(_DEFAULT_LIMIT, description="1..200, default 50"),
    code: str | None = Query(None, description="exact Code match"),
    level: str | None = Query(None, description="error | warn | info"),
    session_id: str | None = Query(None, alias="session_id"),
    correlation_id: str | None = Query(None, alias="correlation_id"),
) -> JSONResponse:
    request_correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    conn = get_task_conn()
    try:
        items = error_writer.list_errors(
            conn,
            limit=limit,
            code=code,
            level=level,
            session_id=session_id,
            correlation_id=correlation_id,
        )
    finally:
        conn.close()
    logger.info(
        "errors_listed",
        extra={
            "CorrelationId": request_correlation_id,
            "operation": "GET /errors",
            "count": len(items),
            "filter_code": code,
            "filter_level": level,
            "filter_session_id": session_id,
            "limit": limit,
        },
    )
    payload = {"items": items, "total": len(items), "limit": limit}
    env = success(payload, requested_at=str(request.url))
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: request_correlation_id})


@router.get("/{correlation_id}")
async def get_error_route(
    request: Request,
    correlation_id: str = Path(..., min_length=1),
) -> JSONResponse:
    request_correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    conn = get_task_conn()
    try:
        item = error_writer.get_error_by_correlation(conn, correlation_id)
    finally:
        conn.close()
    if item is None:
        raise AppError(
            ErrorCode.E_BE_NOT_FOUND,
            f"Error {correlation_id} not found",
            {"CorrelationId": correlation_id},
        )
    logger.info(
        "error_fetched",
        extra={
            "CorrelationId": request_correlation_id,
            "operation": "GET /errors/{correlation_id}",
            "ErrorCorrelationId": correlation_id,
        },
    )
    env = success(item, requested_at=str(request.url))
    return JSONResponse(content=env.to_wire(), headers={CORRELATION_HEADER: request_correlation_id})


__all__ = ["router"]
