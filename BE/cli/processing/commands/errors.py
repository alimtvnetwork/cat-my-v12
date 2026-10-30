"""Spec 54 - `processing-cli errors` (list / show / export).

Reads the Task-tier `Error` table (migration 0029) so an AI can list
errors with stack traces step by step, without the browser. One SQL
owner: `BE/app/db/writers/error.py` — this module only parses args,
opens the connection, and shapes the dispatcher payload.

Contract:
    Args (common):
        --db-root  override APP_DB_ROOT (tests).

    Subcommands:
        errors list [--limit N] [--code CODE] [--level LEVEL]
                    [--session-id ID] [--correlation-id CID]
            List errors newest first. Limit defaults to 50, ceiling 200.
            Records carry the full stack trace.
        errors show <correlation-id>
            One error with the full stack trace. Unknown id ->
            `E_BE_NOT_FOUND` (dispatcher exit 3 / HTTP 404 equivalent).
        errors export [--format json|csv] [same filters as list]
            Headless export. JSON returns the wire records; CSV returns
            one CSV document as a string inside the envelope
            (`Results[0].csv`) so the stdout contract (single Universal
            Envelope per invocation) holds.

    A missing `Error` table (Task-DB never bootstrapped) surfaces as
    `E_BE_INTERNAL` with the `bin/db-bootstrap.py` hint via the shared
    reader, never a silent empty list.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from BE.app.db.writers import error as error_writer
from BE.cli.common.session import SessionCtx
from BE.db.connections import get_task_conn
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

# CSV shape mirrors the frontend serializer (`src/lib/errors/export.ts`
# `CSV_COLUMNS`) so CLI and browser exports stay comparable. The frontend
# `id` (browser uuid) is not stored server-side, so that column is empty;
# `CorrelationId` is the server-side identity. Nested Details values are
# JSON-encoded, exactly like the frontend's `safeJson`.
_CSV_COLUMNS: tuple[str, ...] = (
    "id",
    "correlationId",
    "createdAt",
    "code",
    "level",
    "message",
    "endpoint",
    "method",
    "responseStatus",
    "triggerComponent",
    "triggerAction",
    "sessionId",
    "stackTrace",
    "context",
    "requestBody",
    "invocationChain",
)


def _add_filter_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--code", default=None, help="Exact Code match.")
    parser.add_argument("--level", default=None, help="error | warn | info.")
    parser.add_argument("--session-id", default=None, help="Exact SessionId match.")
    parser.add_argument("--correlation-id", default=None, help="Exact CorrelationId match.")


def configure(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--db-root", default=None, help="Override APP_DB_ROOT (tests).")
    sub = parser.add_subparsers(dest="action", required=True)

    list_parser = sub.add_parser("list", help="List errors newest first.")
    list_parser.add_argument("--limit", type=int, default=50, help="1..200, default 50.")
    _add_filter_args(list_parser)

    show_parser = sub.add_parser("show", help="Show one error with its full stack trace.")
    show_parser.add_argument("correlation_id", help="CorrelationId of the error to show.")

    export_parser = sub.add_parser("export", help="Headless JSON/CSV export of errors.")
    export_parser.add_argument("--format", choices=("json", "csv"), default="json")
    export_parser.add_argument("--limit", type=int, default=200, help="1..200, default 200.")
    _add_filter_args(export_parser)


def _open_conn(ns: argparse.Namespace):
    db_root = Path(ns.db_root) if ns.db_root else None
    return get_task_conn(db_root=db_root)


def _list_kwargs(ns: argparse.Namespace) -> dict[str, Any]:
    return {
        "limit": ns.limit,
        "code": ns.code,
        "level": ns.level,
        "session_id": ns.session_id,
        "correlation_id": ns.correlation_id,
    }


def _handle_list(ns: argparse.Namespace, context: SessionCtx) -> dict[str, Any]:
    conn = _open_conn(ns)
    try:
        items = error_writer.list_errors(conn, **_list_kwargs(ns))
    finally:
        conn.close()
    context.logger.log(
        "INFO", "errors.listed",
        f"errors list: count={len(items)}",
        ctx={"Count": len(items), "Limit": ns.limit},
    )
    return {"items": items, "total": len(items), "limit": ns.limit}


def _handle_show(ns: argparse.Namespace, context: SessionCtx) -> dict[str, Any]:
    conn = _open_conn(ns)
    try:
        item = error_writer.get_error_by_correlation(conn, ns.correlation_id)
    finally:
        conn.close()
    if item is None:
        raise AppError(
            ErrorCode.E_BE_NOT_FOUND,
            f"Error {ns.correlation_id} not found",
            {"CorrelationId": ns.correlation_id},
        )
    context.logger.log(
        "INFO", "errors.shown",
        f"errors show: correlation_id={ns.correlation_id}",
        ctx={"CorrelationId": ns.correlation_id},
    )
    return item


def _csv_cell(item: dict[str, Any], col: str) -> str:
    """Map one wire record onto one frontend-shaped CSV cell."""
    details = item.get("Details")
    details_dict = details if isinstance(details, dict) else {}
    if col == "id":
        return ""
    if col == "createdAt":
        epoch = item.get("CreatedAt")
        if isinstance(epoch, int):
            return datetime.fromtimestamp(epoch, tz=UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
        return ""
    if col == "invocationChain":
        chain = details_dict.get("invocationChain")
        if isinstance(chain, list):
            return " > ".join(str(v) for v in chain)
        return ""
    if col in ("context", "requestBody"):
        value = details_dict.get(col)
        if value is None:
            return ""
        return value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
    if col in ("method", "responseStatus", "triggerAction"):
        value = details_dict.get(col)
        if value is None:
            return ""
        return value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
    value = item.get({
        "correlationId": "CorrelationId",
        "code": "Code",
        "level": "Level",
        "message": "Message",
        "endpoint": "Endpoint",
        "triggerComponent": "TriggerComponent",
        "sessionId": "SessionId",
        "stackTrace": "StackTrace",
    }[col])
    if value is None:
        return ""
    return value if isinstance(value, str) else str(value)


def _to_csv(items: list[dict[str, Any]]) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf, quoting=csv.QUOTE_MINIMAL, lineterminator="\r\n")
    writer.writerow(list(_CSV_COLUMNS))
    for item in items:
        writer.writerow([_csv_cell(item, col) for col in _CSV_COLUMNS])
    return buf.getvalue()


def _handle_export(ns: argparse.Namespace, context: SessionCtx) -> dict[str, Any]:
    conn = _open_conn(ns)
    try:
        items = error_writer.list_errors(conn, **_list_kwargs(ns))
    finally:
        conn.close()
    context.logger.log(
        "INFO", "errors.exported",
        f"errors export: format={ns.format} count={len(items)}",
        ctx={"Format": ns.format, "Count": len(items)},
    )
    if ns.format == "csv":
        return {"format": "csv", "csv": _to_csv(items), "total": len(items)}
    return {
        "format": "json",
        "exportedAt": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count": len(items),
        "errors": items,
    }


def handle(ns: argparse.Namespace, context: SessionCtx) -> dict[str, Any]:
    if ns.action == "list":
        return _handle_list(ns, context)
    if ns.action == "show":
        return _handle_show(ns, context)
    if ns.action == "export":
        return _handle_export(ns, context)
    raise AssertionError(f"unknown errors action {ns.action!r}")


__all__ = ["configure", "handle"]
