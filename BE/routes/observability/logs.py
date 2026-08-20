"""GET /observability/sessions/{cli_invocation_id}/logs - Plan 90 Step 73.

Read-only page-and-tail of the JSONL log file recorded in
`CliInvocation.LogPath` (Root-DB migration 0010). Anchor endpoint for the
FE log-tail viewer (Step 76). Poll-based (not SSE) to stay compatible with
uvicorn / edge runtimes and to keep the handler shape identical to
Step 72's `sessions.py` (functions <=15 lines per
`spec/coding-guidelines/python.md`).

Contract
--------

Request::

    GET /observability/sessions/{cli_invocation_id}/logs
        ?tail=<1..2000>&after_offset=<int>=0>

    * ``tail``         optional, default 200, hard ceiling 2000.
    * ``after_offset`` optional. When set, read starts at that byte offset
      in the log file and ``tail`` is ignored. Enables incremental polling
      without re-reading history. Non-negative int only.

Response payload::

    {
      "CliInvocationId": <int>,
      "RunId": "...",
      "LogPath": "...",           # server-side absolute path (safe: LogPath
                                    # is written by our own JsonlLogger).
      "NextOffset": <int>,        # byte offset after the last returned line
      "IsTruncated": <bool>,      # true when tail slice dropped lines
      "Items": [ <parsed_json>, ... ]
    }

Each item is the parsed JSONL record. Unparseable lines are surfaced as
``{"_Raw": "<line>", "_ParseError": "..."}`` so a poison line NEVER
silently drops from the tail (loud-failure contract, spec 03).

Failure surface
---------------

* Bad params -> ``E_BE_BAD_REQUEST`` (400), details name the offender.
* Unknown ``cli_invocation_id`` -> ``E_BE_NOT_FOUND`` (404).
* ``LogPath IS NULL`` on the row -> ``E_BE_NOT_FOUND`` (404) with hint
  (CLI died before opening its log; check ``ExitCode``).
* Log file missing on disk -> ``E_BE_NOT_FOUND`` (404) with the resolved
  path in details. Never returns an empty ``Items=[]`` for a missing file;
  that would look identical to "log is empty" and hide the bug.
* Path escapes ``APP_LOG_ROOT`` -> ``E_BE_BAD_REQUEST`` (400). LogPath is
  authored by our own logger but we still gate: a Root-DB row written by
  a tampered CLI must not turn this endpoint into arbitrary file read.
* Root-DB missing ``CliInvocation`` table -> ``E_BE_INTERNAL`` (500) with
  bootstrap hint (matches Step 72).

Never queries Task or Rules tiers.
"""

from __future__ import annotations

import json
import logging
import sqlite3
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Query, Request
from fastapi import Path as PathParam
from fastapi.responses import JSONResponse

from BE.cli.common.paths import resolve_root
from BE.db.connections import get_root_conn
from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

logger = logging.getLogger("BE.routes.observability.logs")

router = APIRouter(prefix="/observability")

_MAX_TAIL = 2000
_DEFAULT_TAIL = 200
_MAX_READ_BYTES = 4 * 1024 * 1024  # 4 MiB per response ceiling


def _validate_tail(raw: int) -> int:
    if raw < 1 or raw > _MAX_TAIL:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"tail must be between 1 and {_MAX_TAIL}",
            details={"Received": raw, "Min": 1, "Max": _MAX_TAIL},
        )
    return raw


def _validate_offset(raw: int | None) -> int | None:
    if raw is None:
        return None
    if raw < 0:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "after_offset must be >= 0",
            details={"Received": raw},
        )
    return raw


def _fetch_row(cli_invocation_id: int, correlation_id: str) -> sqlite3.Row:
    conn = get_root_conn()
    try:
        conn.row_factory = sqlite3.Row
        try:
            row = conn.safe_execute(
                "SELECT CliInvocationId, RunId, LogPath, ExitCode "
                "FROM CliInvocation WHERE CliInvocationId = ?",
                (cli_invocation_id,),
            ).fetchone()
        except sqlite3.OperationalError as exc:
            logger.error(
                "logs_query_failed",
                extra={
                    "CorrelationId": correlation_id,
                    "operation": "GET /observability/sessions/{id}/logs",
                    "code": ErrorCode.E_BE_INTERNAL.value,
                    "subject_id": cli_invocation_id,
                    "sqlite_error": str(exc),
                },
            )
            raise AppError(
                ErrorCode.E_BE_INTERNAL,
                "root DB query failed; is bin/db-bootstrap.py applied?",
                details={"SqliteError": str(exc), "Hint": "python bin/db-bootstrap.py"},
            ) from exc
    finally:
        conn.close()
    if row is None:
        raise AppError(
            ErrorCode.E_BE_NOT_FOUND,
            "unknown CliInvocationId",
            details={"CliInvocationId": cli_invocation_id},
        )
    return row


def _resolve_log_path(row: sqlite3.Row, correlation_id: str) -> Path:
    raw = row["LogPath"]
    cli_invocation_id = int(row["CliInvocationId"])
    if raw is None:
        raise AppError(
            ErrorCode.E_BE_NOT_FOUND,
            "session has no LogPath (CLI died before opening its log)",
            details={
                "CliInvocationId": cli_invocation_id,
                "ExitCode": row["ExitCode"],
                "Hint": "check CliInvocation.ExitCode for the crash reason",
            },
        )
    log_root = resolve_root("log").resolve()
    path = Path(raw).resolve()
    try:
        path.relative_to(log_root)
    except ValueError as exc:
        logger.error(
            "logs_path_escape",
            extra={
                "CorrelationId": correlation_id,
                "operation": "GET /observability/sessions/{id}/logs",
                "code": ErrorCode.E_BE_BAD_REQUEST.value,
                "subject_id": cli_invocation_id,
                "log_path": str(path),
                "log_root": str(log_root),
            },
        )
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "LogPath escapes APP_LOG_ROOT",
            details={"LogPath": str(path), "LogRoot": str(log_root)},
        ) from exc
    if not path.is_file():
        raise AppError(
            ErrorCode.E_BE_NOT_FOUND,
            "log file missing on disk",
            details={"LogPath": str(path), "Hint": "log may have been GC'd or host differs"},
        )
    return path


def _read_from_offset(path: Path, offset: int) -> tuple[list[bytes], int, bool]:
    size = path.stat().st_size
    if offset > size:
        return [], size, False
    with path.open("rb") as fp:
        fp.seek(offset)
        chunk = fp.read(_MAX_READ_BYTES)
    is_truncated = (offset + len(chunk)) < size
    # Trailing partial line (no LF yet) is held back so we don't emit
    # half-written JSON. `next_offset` advances only past complete lines.
    if not chunk:
        return [], offset, is_truncated
    if chunk.endswith(b"\n"):
        lines = chunk.splitlines()
        next_offset = offset + len(chunk)
    else:
        last_nl = chunk.rfind(b"\n")
        if last_nl == -1:
            return [], offset, is_truncated
        lines = chunk[: last_nl + 1].splitlines()
        next_offset = offset + last_nl + 1
    return lines, next_offset, is_truncated


def _read_tail(path: Path, tail: int) -> tuple[list[bytes], int, bool]:
    size = path.stat().st_size
    if size == 0:
        return [], 0, False
    read_bytes = min(size, _MAX_READ_BYTES)
    window_start = size - read_bytes
    with path.open("rb") as fp:
        fp.seek(window_start)
        chunk = fp.read(read_bytes)
    is_truncated_bytes = window_start > 0
    # Drop leading partial line if we sliced mid-record.
    slice_start = 0
    if window_start > 0:
        first_nl = chunk.find(b"\n")
        if first_nl == -1:
            return [], size, True
        slice_start = first_nl + 1
    # Drop trailing partial line (no LF yet); next_offset must point at
    # the last complete newline so a resume poll does not re-read it.
    if chunk.endswith(b"\n"):
        end = len(chunk)
    else:
        last_nl = chunk.rfind(b"\n", slice_start)
        end = 0 if last_nl == -1 else last_nl + 1
    complete = chunk[slice_start:end]
    next_offset = window_start + end
    lines = complete.splitlines()
    is_truncated = is_truncated_bytes or len(lines) > tail
    if len(lines) > tail:
        lines = lines[-tail:]
    return lines, next_offset, is_truncated


def _parse_line(raw: bytes) -> dict[str, Any]:
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        return {"_Raw": repr(raw), "_ParseError": f"utf-8 decode: {exc}"}
    try:
        obj = json.loads(text)
    except json.JSONDecodeError as exc:
        return {"_Raw": text, "_ParseError": f"json decode: {exc.msg}"}
    if not isinstance(obj, dict):
        return {"_Raw": text, "_ParseError": "top-level not object"}
    return obj


@router.get("/sessions/{cli_invocation_id}/logs")
async def tail_session_logs(
    request: Request,
    cli_invocation_id: int = PathParam(..., ge=1),
    tail: int = Query(_DEFAULT_TAIL, description="1..2000, default 200"),
    after_offset: int | None = Query(None, description="resume byte offset; overrides tail"),
) -> JSONResponse:
    """Return a page of JSONL log lines for a CLI invocation."""
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    tail_v = _validate_tail(tail)
    offset_v = _validate_offset(after_offset)

    row = _fetch_row(cli_invocation_id, correlation_id)
    path = _resolve_log_path(row, correlation_id)

    if offset_v is not None:
        raw_lines, next_offset, is_truncated = _read_from_offset(path, offset_v)
    else:
        raw_lines, next_offset, is_truncated = _read_tail(path, tail_v)

    items = [_parse_line(ln) for ln in raw_lines]
    logger.info(
        "logs_tailed",
        extra={
            "CorrelationId": correlation_id,
            "operation": "GET /observability/sessions/{id}/logs",
            "code": None,
            "subject_id": cli_invocation_id,
            "count": len(items),
            "next_offset": next_offset,
            "is_truncated": is_truncated,
            "mode": "offset" if offset_v is not None else "tail",
        },
    )
    payload = {
        "CliInvocationId": int(row["CliInvocationId"]),
        "RunId": row["RunId"],
        "LogPath": str(path),
        "NextOffset": next_offset,
        "IsTruncated": is_truncated,
        "Items": items,
    }
    envelope = success(payload, requested_at=str(request.url))
    return JSONResponse(
        content=envelope.to_wire(),
        headers={CORRELATION_HEADER: correlation_id},
    )


__all__ = ["router"]
