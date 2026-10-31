"""Bug-report composition + delivery (spec 54).

A report is the wave-1 error SplitDB record (CorrelationId, Code,
Message, StackTrace, Endpoint, TriggerComponent, SessionId, CreatedAt)
plus reporter context plus optional attachments. Delivery audit is a
JSONL trail outside the repo tree (mirrors the ui_remote audit), so
tests can prove what was sent even when a channel is down. Audit
failure never masks a delivery result.

Attachments: local file paths are accepted ONLY from the CLI (the
operator's own machine). The HTTP route never accepts local paths —
it carries attachment metadata as references. Supabase Storage byte
upload is attempted when a bucket is configured; otherwise the
attachment is recorded as a reference row noting bytes traveled via
email. Neither path ever fakes an upload.
"""

from __future__ import annotations

import json
import os
import tempfile
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from BE.bug_reports import email_sender
from BE.bug_reports.supabase_client import SupabaseClient, SupabaseError

_AUDIT_FILE = "cat-my-bug-reports-audit.jsonl"


def audit_path() -> str:
    """Durable audit trail location (outside the repo tree)."""
    return os.path.join(tempfile.gettempdir(), _AUDIT_FILE)


def _append_audit(record: dict[str, Any]) -> None:
    """Append one audit line; audit failure never masks the result."""
    try:
        with open(audit_path(), "a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
    except OSError:
        pass


def compose_from_error_row(
    row: dict[str, Any], reporter_context: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Build a report from one Task-DB Error wire row."""
    code = row.get("Code") or "unknown"
    message = row.get("Message") or ""
    title = f"{code}: {message[:80]}" if message else str(code)
    return {
        "correlation_id": row.get("CorrelationId"),
        "title": title,
        "code": code,
        "message": message,
        "stack_trace": row.get("StackTrace"),
        "endpoint": row.get("Endpoint"),
        "trigger_component": row.get("TriggerComponent"),
        "session_id": row.get("SessionId"),
        "created_at": row.get("CreatedAt"),
        "reporter_context": reporter_context or {},
        "details": row.get("Details") or {},
        "attachments": [],
    }


def build_email_body(report: dict[str, Any]) -> str:
    """Plain-text email body: fields first, full stack trace last."""
    lines = [
        f"Bug report: {report.get('title')}",
        "",
        f"CorrelationId: {report.get('correlation_id')}",
        f"Code: {report.get('code')}",
        f"Endpoint: {report.get('endpoint')}",
        f"TriggerComponent: {report.get('trigger_component')}",
        f"SessionId: {report.get('session_id')}",
        f"ReporterContext: {json.dumps(report.get('reporter_context') or {})}",
        "",
        "Message:",
        str(report.get("message") or ""),
        "",
        "StackTrace:",
        str(report.get("stack_trace") or "(none)"),
    ]
    return "\n".join(lines)


def deliver_email(
    report: dict[str, Any],
    *,
    sender: str | None = None,
    recipient: str | None = None,
    attachments: list[Path] | None = None,
) -> dict[str, Any]:
    """Send the report by email; audit + return the delivery record."""
    subject = f"[CAT iVISION bug] {report.get('title')}"
    body = build_email_body(report)
    result = email_sender.send_bug_report_email(
        subject, body, sender=sender, recipient=recipient, attachments=attachments
    )
    record = {"channel": "email", "correlation_id": report.get("correlation_id"), **result}
    _append_audit(record)
    return record


def _storage_upload(
    client: SupabaseClient, bucket: str, path: str, data: bytes, mime: str
) -> str | None:
    """Upload bytes to Supabase Storage; None when it cannot upload."""
    url = f"{client._base}/storage/v1/object/{bucket}/{path}"
    request = urllib.request.Request(
        url,
        data=data,
        headers={
            "apikey": client._api_key,
            "Authorization": f"Bearer {client._api_key}",
            "Content-Type": mime or "application/octet-stream",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=client._timeout) as response:
            response.read()
    except Exception:  # noqa: BLE001 - degraded to reference row below
        return None

    return f"{bucket}/{path}"


def deliver_supabase(
    report: dict[str, Any],
    client: SupabaseClient,
    *,
    attachments: list[Path] | None = None,
    bucket: str | None = None,
) -> dict[str, Any]:
    """Insert the report row, then one row per attachment."""
    row = client.insert(
        "bug_reports",
        {
            "node_id": (report.get("reporter_context") or {}).get("node_id"),
            "title": report.get("title"),
            "code": report.get("code"),
            "correlation_id": report.get("correlation_id"),
            "message": report.get("message"),
            "stack_trace": report.get("stack_trace"),
            "endpoint": report.get("endpoint"),
            "trigger_component": report.get("trigger_component"),
            "session_id": report.get("session_id"),
            "status": "pending",
            "reporter_context": report.get("reporter_context") or {},
            "details": report.get("details") or {},
        },
    )
    report_id = row.get("id")
    attachment_results: list[dict[str, Any]] = []

    for attachment in attachments or []:
        storage_path: str | None = None
        note = "bytes delivered via email; Supabase row is a reference"

        if bucket and report_id and attachment.exists():
            uploaded = _storage_upload(
                client,
                bucket,
                f"{report_id}/{attachment.name}",
                attachment.read_bytes(),
                "application/octet-stream",
            )

            if uploaded is not None:
                storage_path = uploaded
                note = "bytes uploaded to Supabase Storage"

        try:
            size = attachment.stat().st_size if attachment.exists() else None
        except OSError:
            size = None

        client.insert(
            "bug_attachments",
            {
                "report_id": report_id,
                "file_name": attachment.name,
                "mime_type": "application/octet-stream",
                "size_bytes": size,
                "storage_path": storage_path,
                "delivery_note": note,
            },
        )
        attachment_results.append({"file_name": attachment.name, "storage_path": storage_path, "note": note})

    record = {
        "channel": "supabase",
        "correlation_id": report.get("correlation_id"),
        "report_id": report_id,
        "attachment_count": len(attachment_results),
        "attachments": attachment_results,
    }
    _append_audit(record)
    return record


def mark_downloaded(client: SupabaseClient, report_id: str) -> dict[str, Any]:
    """Mark a Supabase report downloaded (developer pull path)."""
    return client.upsert("bug_reports", {"id": report_id, "status": "downloaded"}, "id")


def audit(limit: int = 50) -> list[dict[str, Any]]:
    """Most recent delivery audit lines, newest first."""
    try:
        with open(audit_path(), encoding="utf-8") as handle:
            lines = handle.read().splitlines()
    except OSError:
        return []

    records: list[dict[str, Any]] = []

    for line in reversed(lines[-limit:]):
        try:
            records.append(json.loads(line))
        except ValueError:
            continue

    return records


__all__ = [
    "audit",
    "build_email_body",
    "compose_from_error_row",
    "deliver_email",
    "deliver_supabase",
    "mark_downloaded",
]
