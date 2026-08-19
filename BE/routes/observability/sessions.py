"""GET /observability/sessions — Plan 90 Step 72.

Read-only listing of recent CLI invocations from the Root-tier DB
(``CliInvocation`` table, migration ``BE/db/migrations/root/0010_*``). This
is the anchor endpoint for the CLI observability UI (Steps 73-77); every
downstream screen (log tail, IPC monitor) is keyed by ``CliInvocationId`` +
``RunId`` returned here, so this route MUST land first.

Contract
--------

Request::

    GET /observability/sessions?limit=<1..500>&cli=<worker-cli|processing-cli>
                              &status=<active|success|failure>
                              &sort=<StartedAt|CliName|Status|DurationMs>
                              &dir=<asc|desc>

    * ``limit``  optional, default 50, hard ceiling 500. Non-positive or
      >500 raises ``E_BE_BAD_REQUEST`` (400).
    * ``cli``    optional, whitelist matches the ``CliName`` CHECK
      constraint on ``CliInvocation``.
    * ``status`` optional; ``active`` = ``EndedAt IS NULL``, ``success`` =
      ``IsSuccess=1``, ``failure`` = ``EndedAt IS NOT NULL AND IsSuccess=0``.
    * ``sort``   optional, default ``StartedAt``. ``Status`` ranks
      active(0) < success(1) < failure(2), matching FE Step 81. For
      ``DurationMs``, rows with ``EndedAt IS NULL`` always sink to the end
      regardless of ``dir`` so active work stays visible inside the 500-row cap.
    * ``dir``    optional, default ``desc``.

Response envelope wraps a single ``dict`` with the shape used across
``/rules`` and ``/samples`` for list endpoints::

    {
      "items": [<Session>, ...],
      "total": <int>,
      "limit": <int>,
      "sort": <str>,
      "dir": <str>,
    }


Each ``Session`` uses PascalCase wire keys to match the Universal
Envelope convention::

    { "CliInvocationId", "RunId", "CliName", "Subcommand", "HostName",
      "Pid", "StartedAt", "EndedAt", "ExitCode", "IsSuccess", "LogPath",
      "DurationMs" }

``DurationMs`` is computed server-side: ``(EndedAt - StartedAt) * 1000``
when ``EndedAt`` is set, else ``None``. Both columns are ``unixepoch()``
integers per Root-DB migration 0010.

Failure surface
---------------

* Bad query params -> ``E_BE_BAD_REQUEST`` (400), details name the offender.
* Root-DB not bootstrapped (``no such table: CliInvocation``) ->
  ``E_BE_INTERNAL`` (500) with ``Hint`` pointing at ``bin/db-bootstrap.py``.
  Never silently returns an empty list; a missing table is an operator
  bug that must surface, not a "0 sessions" false-negative.

Never queries Task or Rules tiers. Cross-tier joins are forbidden per
``spec/05-split-db-architecture/`` and enforced by the guarded connection
in ``BE/db/connections.py``.
"""

from __future__ import annotations

import base64
import json
import logging
import sqlite3
from typing import Any, Literal

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from BE.db.connections import get_root_conn
from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

logger = logging.getLogger("BE.routes.observability.sessions")

router = APIRouter(prefix="/observability")

_ALLOWED_CLI = ("worker-cli", "processing-cli")
_ALLOWED_STATUS = ("active", "success", "failure")
_ALLOWED_SORT = ("StartedAt", "CliName", "Status", "DurationMs")
_ALLOWED_DIR = ("asc", "desc")
_MAX_LIMIT = 500
_DEFAULT_LIMIT = 50
_DEFAULT_SORT = "StartedAt"
_DEFAULT_DIR = "desc"

StatusFilter = Literal["active", "success", "failure"]
SortKey = Literal["StartedAt", "CliName", "Status", "DurationMs"]
SortDir = Literal["asc", "desc"]




def _validate_limit(raw: int) -> int:
    if raw < 1 or raw > _MAX_LIMIT:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"limit must be between 1 and {_MAX_LIMIT}",
            details={"Received": raw, "Min": 1, "Max": _MAX_LIMIT},
        )
    return raw


def _validate_cli(raw: str | None) -> str | None:
    if raw is None:
        return None
    if raw not in _ALLOWED_CLI:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "cli filter must be one of the whitelisted CLI names",
            details={"Received": raw, "Allowed": list(_ALLOWED_CLI)},
        )
    return raw


def _validate_status(raw: str | None) -> StatusFilter | None:
    if raw is None:
        return None
    if raw not in _ALLOWED_STATUS:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "status filter must be one of active|success|failure",
            details={"Received": raw, "Allowed": list(_ALLOWED_STATUS)},
        )
    return raw  # type: ignore[return-value]


def _validate_sort(raw: str | None) -> SortKey:
    if raw is None:
        return _DEFAULT_SORT  # type: ignore[return-value]
    if raw not in _ALLOWED_SORT:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "sort must be one of StartedAt|CliName|Status|DurationMs",
            details={"Received": raw, "Allowed": list(_ALLOWED_SORT)},
        )
    return raw  # type: ignore[return-value]


def _validate_dir(raw: str | None) -> SortDir:
    if raw is None:
        return _DEFAULT_DIR  # type: ignore[return-value]
    if raw not in _ALLOWED_DIR:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "dir must be one of asc|desc",
            details={"Received": raw, "Allowed": list(_ALLOWED_DIR)},
        )
    return raw  # type: ignore[return-value]


def _order_clause(sort: SortKey, direction: SortDir) -> str:
    """Return an ORDER BY clause matching FE Step 81 semantics.

    * ``Status`` ranks active(0) < success(1) < failure(2).
    * ``DurationMs`` is ``(EndedAt - StartedAt) * 1000`` when ended, else NULL;
      NULLs always sink to the end regardless of direction, so active work
      stays visible instead of being pushed off the 500-row window.
    * Every clause gets a stable ``CliInvocationId DESC`` tiebreaker so
      identical values do not flap between requests.
    """
    d = "ASC" if direction == "asc" else "DESC"
    if sort == "StartedAt":
        expr = "StartedAt"
    elif sort == "CliName":
        expr = "CliName"
    elif sort == "Status":
        # Same ranking as FE statusRank(): active(0) < success(1) < failure(2)
        expr = (
            "CASE WHEN EndedAt IS NULL THEN 0 "
            "WHEN IsSuccess = 1 THEN 1 ELSE 2 END"
        )
    else:  # DurationMs
        # NULLs (still-running) sink to the end regardless of direction.
        return (
            "ORDER BY (CASE WHEN EndedAt IS NULL THEN 1 ELSE 0 END) ASC, "
            f"(EndedAt - StartedAt) {d}, CliInvocationId DESC"
        )
    return f"ORDER BY {expr} {d}, CliInvocationId DESC"


def _encode_cursor(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _decode_cursor(raw: str, sort: SortKey) -> dict[str, Any]:
    """Decode + validate cursor. Never trust caller-supplied JSON blindly."""
    try:
        padded = raw + "=" * (-len(raw) % 4)
        data = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")))
    except Exception as exc:  # noqa: BLE001 - want a single 400 on any parse fail
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "cursor is not a valid opaque token",
            details={"Hint": "Only pass values returned by this endpoint"},
        ) from exc
    if not isinstance(data, dict) or "id" not in data or "v" not in data:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "cursor payload malformed",
            details={"Hint": "Only pass values returned by this endpoint"},
        )
    if not isinstance(data["id"], int):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "cursor id must be an integer",
        )
    if sort == "DurationMs" and data.get("b") not in (0, 1):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "cursor bucket required for DurationMs sort",
        )
    return data


def _cursor_predicate(
    sort: SortKey, direction: SortDir, cursor: dict[str, Any]
) -> tuple[str, list[Any]]:
    """WHERE clause matching the ORDER BY tiebreaker (CliInvocationId DESC).

    Ordering is ``expr <dir>, CliInvocationId DESC``, so the strictly-after
    predicate is ``(expr <op> v) OR (expr = v AND CliInvocationId < id)``
    where ``<op>`` is ``>`` for ``asc`` and ``<`` for ``desc``.
    """
    op = ">" if direction == "asc" else "<"
    cid = int(cursor["id"])
    if sort == "StartedAt":
        return (
            f"(StartedAt {op} ? OR (StartedAt = ? AND CliInvocationId < ?))",
            [cursor["v"], cursor["v"], cid],
        )
    if sort == "CliName":
        return (
            f"(CliName {op} ? OR (CliName = ? AND CliInvocationId < ?))",
            [cursor["v"], cursor["v"], cid],
        )
    if sort == "Status":
        rank = (
            "(CASE WHEN EndedAt IS NULL THEN 0 "
            "WHEN IsSuccess = 1 THEN 1 ELSE 2 END)"
        )
        return (
            f"({rank} {op} ? OR ({rank} = ? AND CliInvocationId < ?))",
            [cursor["v"], cursor["v"], cid],
        )
    # DurationMs: bucket-aware. bucket 0 = ended (has duration), bucket 1 = active (NULL).
    # ORDER BY forces bucket ASC first, so any row in bucket 1 comes strictly
    # after every row in bucket 0.
    bucket_expr = "(CASE WHEN EndedAt IS NULL THEN 1 ELSE 0 END)"
    dur_expr = "(EndedAt - StartedAt)"
    if cursor["b"] == 0:
        # More rows may exist in bucket 0 (further along direction) or in bucket 1.
        return (
            f"({bucket_expr} = 1 OR ({bucket_expr} = 0 AND "
            f"({dur_expr} {op} ? OR ({dur_expr} = ? AND CliInvocationId < ?))))",
            [cursor["v"], cursor["v"], cid],
        )
    # bucket == 1 (active): only remaining rows are further-tiebroken actives.
    return (
        f"({bucket_expr} = 1 AND CliInvocationId < ?)",
        [cid],
    )


def _next_cursor_from_row(row: sqlite3.Row, sort: SortKey) -> str:
    cid = int(row["CliInvocationId"])
    if sort == "StartedAt":
        return _encode_cursor({"v": int(row["StartedAt"]), "id": cid})
    if sort == "CliName":
        return _encode_cursor({"v": row["CliName"], "id": cid})
    if sort == "Status":
        if row["EndedAt"] is None:
            rank = 0
        elif int(row["IsSuccess"]) == 1:
            rank = 1
        else:
            rank = 2
        return _encode_cursor({"v": rank, "id": cid})
    # DurationMs
    if row["EndedAt"] is None:
        return _encode_cursor({"v": None, "id": cid, "b": 1})
    dur = int(row["EndedAt"]) - int(row["StartedAt"])
    return _encode_cursor({"v": dur, "id": cid, "b": 0})


def _build_query(
    cli: str | None,
    status: StatusFilter | None,
    limit: int,
    sort: SortKey,
    direction: SortDir,
    cursor: dict[str, Any] | None,
) -> tuple[str, list[Any]]:
    where: list[str] = []
    params: list[Any] = []
    if cli is not None:
        where.append("CliName = ?")
        params.append(cli)
    if status == "active":
        where.append("EndedAt IS NULL")
    elif status == "success":
        where.append("IsSuccess = 1")
    elif status == "failure":
        where.append("EndedAt IS NOT NULL AND IsSuccess = 0")
    if cursor is not None:
        pred, pred_params = _cursor_predicate(sort, direction, cursor)
        where.append(pred)
        params.extend(pred_params)
    clause = f" WHERE {' AND '.join(where)}" if where else ""
    order = _order_clause(sort, direction)
    sql = (
        "SELECT CliInvocationId, RunId, CliName, Subcommand, HostName, Pid, "
        "StartedAt, EndedAt, ExitCode, IsSuccess, LogPath "
        "FROM CliInvocation"
        f"{clause} "
        f"{order} "
        "LIMIT ?"
    )
    params.append(limit)
    return sql, params




def _row_to_wire(row: sqlite3.Row) -> dict[str, Any]:
    started = int(row["StartedAt"])
    ended = row["EndedAt"]
    duration_ms: int | None
    duration_ms = None if ended is None else int((int(ended) - started) * 1000)
    return {
        "CliInvocationId": int(row["CliInvocationId"]),
        "RunId": row["RunId"],
        "CliName": row["CliName"],
        "Subcommand": row["Subcommand"],
        "HostName": row["HostName"],
        "Pid": int(row["Pid"]),
        "StartedAt": started,
        "EndedAt": None if ended is None else int(ended),
        "ExitCode": None if row["ExitCode"] is None else int(row["ExitCode"]),
        "IsSuccess": bool(int(row["IsSuccess"])),
        "LogPath": row["LogPath"],
        "DurationMs": duration_ms,
    }


@router.get("/sessions")
async def list_sessions(
    request: Request,
    limit: int = Query(_DEFAULT_LIMIT, description="1..500, default 50"),
    cli: str | None = Query(None, description="worker-cli | processing-cli"),
    status: str | None = Query(None, description="active | success | failure"),
    sort: str | None = Query(None, description="StartedAt | CliName | Status | DurationMs"),
    dir: str | None = Query(None, description="asc | desc (default desc)"),
    cursor: str | None = Query(None, description="opaque cursor from nextCursor"),
) -> JSONResponse:
    """List recent CLI invocations from Root-DB, ordered per ``sort``/``dir``.

    Pagination
    ----------
    Response includes ``nextCursor`` (opaque string or ``null``). When
    non-null, pass it back verbatim as ``?cursor=<token>`` to fetch the
    next page under the same ``sort``/``dir``/filters. Do not decode or
    fabricate cursors; the server treats invalid tokens as bad input.
    """
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    limit_v = _validate_limit(limit)
    cli_v = _validate_cli(cli)
    status_v = _validate_status(status)
    sort_v = _validate_sort(sort)
    dir_v = _validate_dir(dir)
    cursor_v = _decode_cursor(cursor, sort_v) if cursor else None

    sql, params = _build_query(cli_v, status_v, limit_v, sort_v, dir_v, cursor_v)


    try:
        conn = get_root_conn()
    except AppError:
        # `E_LOG_ROOT_UNWRITABLE` from resolve_root() bubbles up unchanged.
        logger.exception(
            "sessions_root_conn_failed",
            extra={
                "CorrelationId": correlation_id,
                "operation": "GET /observability/sessions",
                "code": None,
                "subject_id": None,
            },
        )
        raise

    try:
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute(sql, params).fetchall()
        except sqlite3.OperationalError as exc:
            # Most common cause: `bin/db-bootstrap.py` never ran on this
            # host. Surface loudly (never a silent empty list).
            logger.error(
                "sessions_query_failed",
                extra={
                    "CorrelationId": correlation_id,
                    "operation": "GET /observability/sessions",
                    "code": ErrorCode.E_BE_INTERNAL.value,
                    "subject_id": None,
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

    items = [_row_to_wire(r) for r in rows]
    # Emit nextCursor only when we filled the page; a partial page is EOF.
    next_cursor = _next_cursor_from_row(rows[-1], sort_v) if len(rows) == limit_v else None
    logger.info(
        "sessions_listed",
        extra={
            "CorrelationId": correlation_id,
            "operation": "GET /observability/sessions",
            "code": None,
            "subject_id": None,
            "count": len(items),
            "filter_cli": cli_v,
            "filter_status": status_v,
            "sort": sort_v,
            "dir": dir_v,
            "limit": limit_v,
            "cursor_in": cursor_v is not None,
            "cursor_out": next_cursor is not None,
        },
    )
    payload = {
        "items": items,
        "total": len(items),
        "limit": limit_v,
        "sort": sort_v,
        "dir": dir_v,
        "nextCursor": next_cursor,
    }

    envelope = success(payload, requested_at=str(request.url))
    return JSONResponse(
        content=envelope.to_wire(),
        headers={CORRELATION_HEADER: correlation_id},
    )



__all__ = ["router"]
