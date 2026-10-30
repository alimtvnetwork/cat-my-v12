"""Spec 54 - `processing-cli bug-reports` (pending / download / send).

Developer download path for Supabase bug reports + the local email
path for Task-DB errors. No new SQL owner: the local read path reuses
`BE/app/db/writers/error.py`; the Supabase path reuses
`BE/bug_reports/supabase_client.py`.

Contract:
    Args (common):
        --db-root  override APP_DB_ROOT (tests).

    Subcommands:
        bug-reports pending [--limit N]
            Pending reports from Supabase, newest first.
        bug-reports download <id> [--out FILE]
            One Supabase report + its attachments, written as JSON to
            FILE (or returned in the envelope when --out is omitted),
            then marked `downloaded`.
        bug-reports send --correlation-id CID [--to EMAIL] [--from EMAIL]
                         [--attach FILE ...]
            Compose from the local Task-DB Error and email it via
            go-email-reader (credentials owned by go-email-reader).
"""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from BE.app.db.writers import error as error_writer
from BE.bug_reports import config as bug_config
from BE.bug_reports import reports as bug_reports
from BE.bug_reports.email_sender import EmailSendError
from BE.bug_reports.supabase_client import SupabaseError, client_from_config
from BE.cli.common.session import SessionCtx
from BE.db.connections import get_task_conn
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def configure(parser: argparse.ArgumentParser) -> None:
    """Register bug-reports subcommands."""
    parser.add_argument("--db-root", default=None, help="Override APP_DB_ROOT (tests).")

    sub = parser.add_subparsers(dest="action", required=True)

    pending_parser = sub.add_parser("pending", help="List pending Supabase bug reports.")
    pending_parser.add_argument("--limit", type=int, default=50, help="1..200, default 50.")

    download_parser = sub.add_parser("download", help="Download one Supabase report as JSON.")
    download_parser.add_argument("report_id", help="Supabase bug_reports.id.")
    download_parser.add_argument("--out", default=None, help="Write JSON to FILE.")

    send_parser = sub.add_parser("send", help="Email a local Task-DB error as a bug report.")
    send_parser.add_argument("--correlation-id", required=True, help="Error CorrelationId.")
    send_parser.add_argument("--to", default=None, help="Recipient (default: notifier).")
    send_parser.add_argument("--from", dest="sender", default=None, help="Sender (default: resolved account).")
    send_parser.add_argument("--attach", action="append", default=[], help="Local file to attach (repeatable).")


def _supabase_client() -> Any:
    """Configured client, or a setup error naming the settings path."""
    client = client_from_config(bug_config.load_supabase_config())

    if client is None:
        raise AppError(
            ErrorCode.E_BE_UNAVAILABLE,
            "Supabase is not configured: save URL + key in Bug Reporting settings first.",
            {"Hint": "POST /bug-reports/config"},
        )

    return client


def _handle_pending(ns: argparse.Namespace, context: SessionCtx) -> dict[str, Any]:
    if ns.limit < 1 or ns.limit > 200:
        raise AppError(ErrorCode.E_BE_BAD_REQUEST, "limit must be between 1 and 200", {"Received": ns.limit})

    client = _supabase_client()

    try:
        rows = client.select(
            "bug_reports",
            f"?select=*&status=eq.pending&order=created_at.desc&limit={ns.limit}",
        )
    except SupabaseError as error:
        raise AppError(ErrorCode.E_BUG_SUPABASE_FAILED, str(error), {}) from error

    context.logger.log("INFO", "bug_reports.pending", f"pending: count={len(rows)}", ctx={"Count": len(rows)})
    return {"items": rows, "total": len(rows), "limit": ns.limit}


def _handle_download(ns: argparse.Namespace, context: SessionCtx) -> dict[str, Any]:
    client = _supabase_client()

    try:
        rows = client.select("bug_reports", f"?select=*&id=eq.{ns.report_id}")
        attachments = client.select("bug_attachments", f"?select=*&report_id=eq.{ns.report_id}")
    except SupabaseError as error:
        raise AppError(ErrorCode.E_BUG_SUPABASE_FAILED, str(error), {}) from error

    if not rows:
        raise AppError(ErrorCode.E_BE_NOT_FOUND, f"Bug report {ns.report_id} not found", {"Id": ns.report_id})

    payload = {
        "downloadedAt": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "report": rows[0],
        "attachments": attachments,
    }

    try:
        bug_reports.mark_downloaded(client, ns.report_id)
    except SupabaseError:
        payload["mark_downloaded"] = False
    else:
        payload["mark_downloaded"] = True

    if ns.out:
        Path(ns.out).write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        context.logger.log("INFO", "bug_reports.downloaded", f"downloaded to {ns.out}", ctx={"Id": ns.report_id})
        return {"out": ns.out, "report_id": ns.report_id, "mark_downloaded": payload["mark_downloaded"]}

    return payload


def _handle_send(ns: argparse.Namespace, context: SessionCtx) -> dict[str, Any]:
    db_root = Path(ns.db_root) if ns.db_root else None
    conn = get_task_conn(db_root=db_root)

    try:
        row = error_writer.get_error_by_correlation(conn, ns.correlation_id)
    finally:
        conn.close()

    if row is None:
        raise AppError(
            ErrorCode.E_BE_NOT_FOUND,
            f"Error {ns.correlation_id} not found",
            {"CorrelationId": ns.correlation_id},
        )

    report = bug_reports.compose_from_error_row(row)
    attachments = [Path(p) for p in ns.attach]

    try:
        result = bug_reports.deliver_email(
            report, sender=ns.sender, recipient=ns.to, attachments=attachments
        )
    except EmailSendError as error:
        raise AppError(ErrorCode.E_BUG_EMAIL_FAILED, str(error), {}) from error

    context.logger.log(
        "INFO", "bug_reports.sent",
        f"emailed: correlation_id={ns.correlation_id}",
        ctx={"CorrelationId": ns.correlation_id},
    )
    return {"correlation_id": ns.correlation_id, **result}


def handle(ns: argparse.Namespace, context: SessionCtx) -> dict[str, Any]:
    """Dispatch bug-reports subcommands."""
    if ns.action == "pending":
        return _handle_pending(ns, context)
    if ns.action == "download":
        return _handle_download(ns, context)
    if ns.action == "send":
        return _handle_send(ns, context)
    raise AppError(ErrorCode.E_BE_BAD_REQUEST, f"Unknown action: {ns.action}", {})
