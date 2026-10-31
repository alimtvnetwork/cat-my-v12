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
from BE.db.connections import get_task_conn, get_root_conn
import sqlite3
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
    list_parser.add_argument("--tier", choices=("all", "task", "root"), default="all", help="Split-DB tier: all | task | root (default: all).")
    list_parser.add_argument("--trace", action="store_true", help="Format and print complete stack traces directly in the terminal.")
    _add_filter_args(list_parser)

    show_parser = sub.add_parser("show", help="Show one error with its full stack trace.")
    show_parser.add_argument("correlation_id", help="CorrelationId or ErrorId of the error to show.")

    export_parser = sub.add_parser("export", help="Headless JSON/CSV export of errors.")
    export_parser.add_argument("--format", choices=("json", "csv"), default="json")
    export_parser.add_argument("--limit", type=int, default=200, help="1..200, default 200.")
    export_parser.add_argument("--tier", choices=("all", "task", "root"), default="all", help="Split-DB tier: all | task | root (default: all).")
    _add_filter_args(export_parser)


def _open_conn(ns: argparse.Namespace):
    db_root = Path(ns.db_root) if ns.db_root else None
    return get_task_conn(db_root=db_root)


def _open_root_conn(ns: argparse.Namespace):
    db_root = Path(ns.db_root) if ns.db_root else None
    return get_root_conn(db_root=db_root)


def _list_root_errors(
    conn: sqlite3.Connection,
    *,
    limit: int = 50,
    code: str | None = None,
    level: str | None = None,
    correlation_id: str | None = None,
) -> list[dict[str, Any]]:
    query = """
        SELECT ErrorId, CorrelationId, ErrorCode, Severity, Subsystem, Message, StackTrace, ContextJson, IsResolved, CreatedAt
        FROM SystemError
    """
    conditions: list[str] = []
    params: list[Any] = []
    if code:
        conditions.append("ErrorCode = ?")
        params.append(code)
    if level:
        conditions.append("LOWER(Severity) = LOWER(?)")
        params.append(level)
    if correlation_id:
        conditions.append("(CorrelationId = ? OR ErrorId = ?)")
        params.append(correlation_id)
        params.append(correlation_id)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY CreatedAt DESC LIMIT ?"
    params.append(limit)

    cursor = conn.execute(query, tuple(params))
    rows = cursor.fetchall()
    results: list[dict[str, Any]] = []
    for r in rows:
        context_dict = {}
        if r[7]:
            try:
                context_dict = json.loads(r[7])
            except Exception:
                pass
        results.append({
            "ErrorId": r[0],
            "CorrelationId": r[1],
            "Code": r[2],
            "Level": (r[3] or "ERROR").lower(),
            "Message": r[5],
            "StackTrace": r[6],
            "Endpoint": None,
            "TriggerComponent": r[4] or "BACKEND",
            "SessionId": None,
            "Details": context_dict,
            "CreatedAt": r[9],
            "PersistedAt": r[9],
            "Tier": "root",
        })
    return results


def _get_root_error_by_id(conn: sqlite3.Connection, correlation_or_error_id: str) -> dict[str, Any] | None:
    query = """
        SELECT ErrorId, CorrelationId, ErrorCode, Severity, Subsystem, Message, StackTrace, ContextJson, IsResolved, CreatedAt
        FROM SystemError
        WHERE CorrelationId = ? OR ErrorId = ?
        LIMIT 1
    """
    cursor = conn.execute(query, (correlation_or_error_id, correlation_or_error_id))
    r = cursor.fetchone()
    if not r:
        return None
    context_dict = {}
    if r[7]:
        try:
            context_dict = json.loads(r[7])
        except Exception:
            pass
    return {
        "ErrorId": r[0],
        "CorrelationId": r[1],
        "Code": r[2],
        "Level": (r[3] or "ERROR").lower(),
        "Message": r[5],
        "StackTrace": r[6],
        "Endpoint": None,
        "TriggerComponent": r[4] or "BACKEND",
        "SessionId": None,
        "Details": context_dict,
        "CreatedAt": r[9],
        "PersistedAt": r[9],
        "Tier": "root",
    }


def _list_kwargs(ns: argparse.Namespace) -> dict[str, Any]:
    return {
        "limit": ns.limit,
        "code": ns.code,
        "level": ns.level,
        "session_id": ns.session_id,
        "correlation_id": ns.correlation_id,
    }


def _handle_list(ns: argparse.Namespace, context: SessionCtx) -> dict[str, Any]:
    tier = getattr(ns, "tier", "all")
    items: list[dict[str, Any]] = []

    if tier in ("all", "task"):
        task_conn = _open_conn(ns)
        try:
            task_items = error_writer.list_errors(task_conn, **_list_kwargs(ns))
            for t in task_items:
                t["Tier"] = "task"
            items.extend(task_items)
        finally:
            task_conn.close()

    if tier in ("all", "root"):
        try:
            root_conn = _open_root_conn(ns)
            try:
                root_items = _list_root_errors(
                    root_conn,
                    limit=ns.limit,
                    code=ns.code,
                    level=ns.level,
                    correlation_id=ns.correlation_id,
                )
                items.extend(root_items)
            finally:
                root_conn.close()
        except sqlite3.OperationalError:
            pass

    items.sort(key=lambda x: x.get("CreatedAt") or 0, reverse=True)
    if len(items) > ns.limit:
        items = items[:ns.limit]

    # If --trace flag was provided, print an executive formatted stack trace dump
    if getattr(ns, "trace", False):
        import sys
        print(f"\n--- Split-DB Error Trace Log (total {len(items)}) ---", file=sys.stderr)
        for idx, item in enumerate(items, 1):
            created_iso = datetime.fromtimestamp(item.get("CreatedAt") or 0, tz=UTC).strftime("%Y-%m-%d %H:%M:%SZ") if item.get("CreatedAt") else "N/A"
            print(f"[{idx}] {item.get('Code')} | Tier: {item.get('Tier', 'unknown')} | Level: {item.get('Level')} | CreatedAt: {created_iso}", file=sys.stderr)
            print(f"    CorrelationId: {item.get('CorrelationId')}", file=sys.stderr)
            print(f"    Component:     {item.get('TriggerComponent') or 'N/A'}", file=sys.stderr)
            print(f"    Message:       {item.get('Message')}", file=sys.stderr)
            if item.get("StackTrace"):
                print("    Stack Trace:", file=sys.stderr)
                for line in str(item.get("StackTrace")).splitlines():
                    print(f"      {line}", file=sys.stderr)
            else:
                print("    Stack Trace:   [None recorded]", file=sys.stderr)
            print("", file=sys.stderr)

    context.logger.log(
        "INFO", "errors.listed",
        f"errors list: count={len(items)} tier={tier}",
        ctx={"Count": len(items), "Limit": ns.limit, "Tier": tier},
    )
    return {"items": items, "total": len(items), "limit": ns.limit, "tier": tier}


def _handle_show(ns: argparse.Namespace, context: SessionCtx) -> dict[str, Any]:
    item = None
    # 1. Look in task.db
    task_conn = _open_conn(ns)
    try:
        item = error_writer.get_error_by_correlation(task_conn, ns.correlation_id)
        if item:
            item["Tier"] = "task"
    finally:
        task_conn.close()

    # 2. Look in root.db if not found
    if item is None:
        try:
            root_conn = _open_root_conn(ns)
            try:
                item = _get_root_error_by_id(root_conn, ns.correlation_id)
            finally:
                root_conn.close()
        except sqlite3.OperationalError:
            pass

    if item is None:
        raise AppError(
            ErrorCode.E_BE_NOT_FOUND,
            f"Error {ns.correlation_id} not found across Split-DB tiers",
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
