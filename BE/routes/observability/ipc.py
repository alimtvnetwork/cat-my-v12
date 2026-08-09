"""GET /observability/sessions/{cli_invocation_id}/ipc - Plan 90 Step 74.

Read-only tail of the IPC mailbox associated with a CLI invocation. Mirrors
`spec/21-app/76-cli-log-and-ipc.md` §"IPC protocol" (one JSON message per
file at ``<APP_IPC_ROOT>/<mailbox>/<ulid>.msg.json`` or ``.msg.ack.json``).

Contract
--------

Request::

    GET /observability/sessions/{cli_invocation_id}/ipc
        ?mailbox=<worker-out|processing-in|processing-out|main-in>   optional
        ?limit=<1..500>                                              default 100
        ?include_acked=<bool>                                        default false
        ?after_msg_id=<str>                                          optional cursor

Mailbox default is derived from ``CliInvocation.CliName``:

* ``worker-cli``     -> ``worker-out``
* ``processing-cli`` -> ``processing-out``

Messages are filtered to those whose ``RunId`` matches the session's ``RunId``
so a shared mailbox never leaks another session's traffic. Sorted ascending
by filename (ULID is monotonic-ish per ``ipc.py::_ulid``). Without
``after_msg_id`` the last ``limit`` are returned (tail). With
``after_msg_id`` the first ``limit`` messages after that cursor are returned
(paging forward).

Response ``Results[0]``::

    {
      "CliInvocationId": <int>,
      "RunId": "...",
      "Mailbox": "worker-out",
      "MailboxPath": "<abs path>",
      "Count": <int>,
      "IsTruncated": <bool>,
      "NextAfterMsgId": "<last MsgId returned>" | null,
      "Items": [
        { "MsgId","Kind","From","To","RunId","Seq","Ts",
          "Payload","Envelope","IsAcked","Path" },
        ...
      ]
    }

Poison messages (unreadable file, invalid JSON, non-object top-level) are
surfaced as ``{"_Raw": "<path>", "_ParseError": "..."}`` items rather than
silently dropped (loud-failure per spec 03).

Failure surface
---------------

* Bad ``limit`` / bad ``mailbox`` / non-boolean coercion -> ``E_BE_BAD_REQUEST``.
* Unknown ``cli_invocation_id`` -> ``E_BE_NOT_FOUND``.
* Mailbox directory missing on disk -> ``E_BE_NOT_FOUND`` with bootstrap hint.
* Mailbox path resolves outside ``APP_IPC_ROOT`` -> ``E_BE_BAD_REQUEST``
  (defense in depth; the mailbox allowlist already blocks traversal).
* Root-DB missing ``CliInvocation`` -> ``E_BE_INTERNAL`` with bootstrap hint.

Never queries Task or Rules tiers. Never mutates the mailbox (no ack, no
prune) - reads only.
"""

from __future__ import annotations

import json
import logging
import sqlite3
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Path as PathParam, Query, Request
from fastapi.responses import JSONResponse

from BE.cli.common.paths import resolve_root
from BE.db.connections import get_root_conn
from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

logger = logging.getLogger("BE.routes.observability.ipc")

router = APIRouter(prefix="/observability")

_MAX_LIMIT = 500
_DEFAULT_LIMIT = 100
_ALLOWED_MAILBOXES: frozenset[str] = frozenset(
    {"worker-out", "processing-in", "processing-out", "main-in"}
)
_DEFAULT_MAILBOX_BY_CLI: dict[str, str] = {
    "worker-cli": "worker-out",
    "processing-cli": "processing-out",
}


def _validate_limit(raw: int) -> int:
    if raw < 1 or raw > _MAX_LIMIT:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"limit must be between 1 and {_MAX_LIMIT}",
            details={"Received": raw, "Min": 1, "Max": _MAX_LIMIT},
        )
    return raw


def _validate_mailbox(raw: str | None, cli_name: str) -> str:
    if raw is None:
        default = _DEFAULT_MAILBOX_BY_CLI.get(cli_name)
        if default is None:
            raise AppError(
                ErrorCode.E_BE_INTERNAL,
                f"no default mailbox for CliName={cli_name!r}",
                details={"CliName": cli_name, "Allowed": sorted(_ALLOWED_MAILBOXES)},
            )
        return default
    if raw not in _ALLOWED_MAILBOXES:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "unknown mailbox",
            details={"Received": raw, "Allowed": sorted(_ALLOWED_MAILBOXES)},
        )
    return raw


def _fetch_row(cli_invocation_id: int, correlation_id: str) -> sqlite3.Row:
    conn = get_root_conn()
    try:
        conn.row_factory = sqlite3.Row
        try:
            row = conn.execute(
                "SELECT CliInvocationId, RunId, CliName "
                "FROM CliInvocation WHERE CliInvocationId = ?",
                (cli_invocation_id,),
            ).fetchone()
        except sqlite3.OperationalError as exc:
            logger.error(
                "ipc_query_failed",
                extra={
                    "CorrelationId": correlation_id,
                    "operation": "GET /observability/sessions/{id}/ipc",
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


def _resolve_mailbox_dir(mailbox: str, correlation_id: str, cli_invocation_id: int) -> Path:
    ipc_root = resolve_root("ipc").resolve()
    path = (ipc_root / mailbox).resolve()
    try:
        path.relative_to(ipc_root)
    except ValueError as exc:
        logger.error(
            "ipc_path_escape",
            extra={
                "CorrelationId": correlation_id,
                "operation": "GET /observability/sessions/{id}/ipc",
                "code": ErrorCode.E_BE_BAD_REQUEST.value,
                "subject_id": cli_invocation_id,
                "mailbox_path": str(path),
                "ipc_root": str(ipc_root),
            },
        )
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "mailbox path escapes APP_IPC_ROOT",
            details={"MailboxPath": str(path), "IpcRoot": str(ipc_root)},
        ) from exc
    if not path.is_dir():
        raise AppError(
            ErrorCode.E_BE_NOT_FOUND,
            "mailbox directory missing on disk",
            details={
                "MailboxPath": str(path),
                "Hint": "run bootstrap_ipc_dirs() or check APP_IPC_ROOT",
            },
        )
    return path


def _parse_file(p: Path) -> dict[str, Any]:
    is_acked = p.name.endswith(".msg.ack.json")
    try:
        text = p.read_text(encoding="utf-8")
    except OSError as exc:
        return {"_Raw": str(p), "_ParseError": f"read: {exc}", "IsAcked": is_acked}
    try:
        obj = json.loads(text)
    except json.JSONDecodeError as exc:
        return {"_Raw": str(p), "_ParseError": f"json decode: {exc.msg}", "IsAcked": is_acked}
    if not isinstance(obj, dict):
        return {"_Raw": str(p), "_ParseError": "top-level not object", "IsAcked": is_acked}
    obj["IsAcked"] = is_acked
    obj["Path"] = str(p)
    return obj


def _list_files(mailbox_dir: Path, include_acked: bool) -> list[Path]:
    files = list(mailbox_dir.glob("*.msg.json"))
    if include_acked:
        files.extend(mailbox_dir.glob("*.msg.ack.json"))
    # Sort by MsgId prefix (filename before the first dot). ULID is
    # monotonic-ish so lexical order == time order within a run.
    return sorted(files, key=lambda p: p.name.split(".", 1)[0])


def _apply_cursor_and_limit(
    files: list[Path],
    after_msg_id: str | None,
    limit: int,
) -> tuple[list[Path], bool]:
    if after_msg_id is not None:
        files = [f for f in files if f.name.split(".", 1)[0] > after_msg_id]
        page = files[:limit]
        is_truncated = len(files) > limit
    else:
        page = files[-limit:]
        is_truncated = len(files) > limit
    return page, is_truncated


@router.get("/sessions/{cli_invocation_id}/ipc")
async def tail_session_ipc(
    request: Request,
    cli_invocation_id: int = PathParam(..., ge=1),
    mailbox: str | None = Query(None, description="worker-out|processing-in|processing-out|main-in"),
    limit: int = Query(_DEFAULT_LIMIT, description="1..500, default 100"),
    include_acked: bool = Query(False, description="include .msg.ack.json files"),
    after_msg_id: str | None = Query(None, description="return messages with MsgId > cursor"),
) -> JSONResponse:
    """Return a page of IPC messages for a CLI invocation's mailbox."""
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    limit_v = _validate_limit(limit)

    row = _fetch_row(cli_invocation_id, correlation_id)
    run_id = str(row["RunId"])
    mailbox_v = _validate_mailbox(mailbox, str(row["CliName"]))
    mailbox_dir = _resolve_mailbox_dir(mailbox_v, correlation_id, cli_invocation_id)

    all_files = _list_files(mailbox_dir, include_acked)
    page_paths, is_truncated = _apply_cursor_and_limit(all_files, after_msg_id, limit_v)

    items: list[dict[str, Any]] = []
    for p in page_paths:
        parsed = _parse_file(p)
        # Filter to this session's RunId. Poison items (no RunId) are kept
        # so operators still see them and can hunt corruption.
        if "_ParseError" in parsed or parsed.get("RunId") == run_id:
            items.append(parsed)

    next_after = None
    if page_paths:
        next_after = page_paths[-1].name.split(".", 1)[0]

    logger.info(
        "ipc_tailed",
        extra={
            "CorrelationId": correlation_id,
            "operation": "GET /observability/sessions/{id}/ipc",
            "code": None,
            "subject_id": cli_invocation_id,
            "mailbox": mailbox_v,
            "count": len(items),
            "is_truncated": is_truncated,
            "mode": "cursor" if after_msg_id is not None else "tail",
        },
    )
    payload = {
        "CliInvocationId": int(row["CliInvocationId"]),
        "RunId": run_id,
        "Mailbox": mailbox_v,
        "MailboxPath": str(mailbox_dir),
        "Count": len(items),
        "IsTruncated": is_truncated,
        "NextAfterMsgId": next_after,
        "Items": items,
    }
    envelope = success(payload, requested_at=str(request.url))
    return JSONResponse(
        content=envelope.to_wire(),
        headers={CORRELATION_HEADER: correlation_id},
    )


__all__ = ["router"]
