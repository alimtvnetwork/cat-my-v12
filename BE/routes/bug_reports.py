"""Bug-report routes (spec 54): email + Supabase delivery.

Endpoints (all loopback-only, like /shutdown — sending email and
reading/writing a Supabase key must never be remotely callable):

* ``POST /bug-reports``
    Compose a report from a Task-DB Error (by ``correlation_id``) or
    from freeform fields, then deliver via ``channels`` (``email``,
    ``supabase``, or both). Attachment bytes are NOT accepted here:
    the HTTP body carries attachment metadata as references only;
    local file bytes travel via the CLI ``--attach`` path.
* ``GET /bug-reports/pending?limit=``
    Pending reports from Supabase (developer download queue).
* ``GET /bug-reports/config``
    Sanitized settings: Supabase URL/enabled/key-presence + whether an
    email sender and notifier resolve. Never returns the API key.
* ``POST /bug-reports/config``
    Save Supabase settings (URL + key + role + enabled) to the
    app-data settings file (0600). Key never echoed back.
* ``POST /bug-reports/test``
    Endpoint reachability + table verification (schema.sql applied?).

Failures use registered codes only (see BE/errors/codes.py):
validation -> ``E_BE_BAD_REQUEST``, unconfigured downstream ->
``E_BE_UNAVAILABLE``, email failure -> ``E_BUG_EMAIL_FAILED``,
Supabase failure -> ``E_BUG_SUPABASE_FAILED``.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from BE.app.db.writers import error as error_writer
from BE.bug_reports import config as bug_config
from BE.bug_reports import reports as bug_reports
from BE.bug_reports.email_sender import EmailSendError
from BE.bug_reports.supabase_client import SupabaseError, client_from_config
from BE.db.connections import get_task_conn
from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

logger = logging.getLogger("BE.routes.bug_reports")

router = APIRouter(prefix="/bug-reports")

_LOOPBACK_HOSTS = ("127.0.0.1", "::1", "localhost")
_DEFAULT_LIMIT = 50
_MAX_LIMIT = 200


def _is_loopback_client(request: Request) -> bool:
    """True when the caller connects from this machine only."""
    client = request.client
    return client is not None and client.host in _LOOPBACK_HOSTS


def _reject_non_loopback(request: Request) -> JSONResponse | None:
    """403 response for non-loopback callers, else None to proceed."""
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))

    if _is_loopback_client(request):
        return None

    logger.warning("bug_reports_rejected_non_loopback", extra={"operation": "bug-reports"})
    return JSONResponse(
        status_code=403,
        content={"detail": "bug reporting is only available from this machine"},
        headers={CORRELATION_HEADER: correlation_id},
    )


def _compose_report(payload: dict[str, Any]) -> dict[str, Any]:
    """Report from a Task-DB Error row, or from freeform fields."""
    correlation_id = payload.get("correlation_id")

    if correlation_id:
        conn = get_task_conn()
        try:
            row = error_writer.get_error_by_correlation(conn, correlation_id)
        finally:
            conn.close()

        if row is None:
            raise AppError(
                ErrorCode.E_BE_NOT_FOUND,
                f"Error {correlation_id} not found",
                {"CorrelationId": correlation_id},
            )

        report = bug_reports.compose_from_error_row(row, payload.get("reporter_context"))

        if payload.get("title"):
            report["title"] = payload["title"]

        return report

    title = payload.get("title")
    message = payload.get("message")

    if not title and not message:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "Provide correlation_id or title/message for a freeform report",
            {"Field": "correlation_id|title"},
        )

    return {
        "correlation_id": None,
        "title": title or message[:80],
        "code": payload.get("code"),
        "message": message,
        "stack_trace": payload.get("stack_trace"),
        "endpoint": payload.get("endpoint"),
        "trigger_component": payload.get("trigger_component"),
        "session_id": payload.get("session_id"),
        "created_at": None,
        "reporter_context": payload.get("reporter_context") or {},
        "details": payload.get("details") or {},
        "attachments": payload.get("attachments") or [],
    }


@router.post("")
async def post_bug_report(request: Request) -> JSONResponse:
    """Compose + deliver a bug report via email and/or Supabase."""
    rejected = _reject_non_loopback(request)

    if rejected is not None:
        return rejected

    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    raw_payload = await request.json()
    payload = raw_payload if isinstance(raw_payload, dict) else {}
    report = _compose_report(payload)
    channels = payload.get("channels") or ["email", "supabase"]
    deliveries: dict[str, Any] = {}

    client = None
    if "supabase" in channels:
        client = client_from_config(bug_config.load_supabase_config())

        if client is None:
            raise AppError(
                ErrorCode.E_BE_UNAVAILABLE,
                "Supabase is not configured: save URL + key in Bug Reporting settings first.",
                {"Hint": "POST /bug-reports/config"},
            )

    if "email" in channels:
        try:
            deliveries["email"] = bug_reports.deliver_email(
                report,
                sender=payload.get("email_from"),
                recipient=payload.get("email_to"),
            )
        except EmailSendError as error:
            raise AppError(ErrorCode.E_BUG_EMAIL_FAILED, str(error), {}) from error

    if "supabase" in channels and client is not None:
        try:
            deliveries["supabase"] = bug_reports.deliver_supabase(report, client)
        except SupabaseError as error:
            raise AppError(ErrorCode.E_BUG_SUPABASE_FAILED, str(error), {}) from error

    envelope = success(
        {"report": report, "deliveries": deliveries},
        requested_at=str(request.url),
    )
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


@router.get("/pending")
async def get_pending_reports(
    request: Request, limit: int = Query(default=_DEFAULT_LIMIT, ge=1, le=_MAX_LIMIT)
) -> JSONResponse:
    """Pending Supabase reports (developer download queue)."""
    rejected = _reject_non_loopback(request)

    if rejected is not None:
        return rejected

    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    client = client_from_config(bug_config.load_supabase_config())

    if client is None:
        raise AppError(
            ErrorCode.E_BE_UNAVAILABLE,
            "Supabase is not configured.",
            {"Hint": "POST /bug-reports/config"},
        )

    try:
        rows = client.select(
            "bug_reports",
            f"?select=*&status=eq.pending&order=created_at.desc&limit={limit}",
        )
    except SupabaseError as error:
        raise AppError(ErrorCode.E_BUG_SUPABASE_FAILED, str(error), {}) from error

    envelope = success(rows, requested_at=str(request.url), total_records=len(rows))
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


@router.get("/config")
async def get_bug_report_config(request: Request) -> JSONResponse:
    """Sanitized settings (key never returned)."""
    rejected = _reject_non_loopback(request)

    if rejected is not None:
        return rejected

    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    payload = {
        "supabase": bug_config.sanitized_supabase_config(bug_config.load_supabase_config()),
        "email_sender_resolves": bug_config.resolve_email_sender() is not None,
        "email_notifier_resolves": bug_config.resolve_notifier() is not None,
        "go_email_reader_bin": bug_config.resolve_go_email_reader_bin(),
    }
    envelope = success(payload, requested_at=str(request.url))
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


@router.post("/config")
async def post_bug_report_config(request: Request) -> JSONResponse:
    """Save Supabase settings (URL + key + role + enabled), 0600 file."""
    rejected = _reject_non_loopback(request)

    if rejected is not None:
        return rejected

    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    payload = await request.json()

    if not isinstance(payload, dict):
        raise AppError(ErrorCode.E_BE_BAD_REQUEST, "Config body must be a JSON object", {})

    url = payload.get("url")
    api_key = payload.get("api_key")

    if not isinstance(url, str) or not url:
        raise AppError(ErrorCode.E_BE_BAD_REQUEST, "url is required", {"Field": "url"})

    if not isinstance(api_key, str) or not api_key:
        # Blank key keeps the stored key (settings UI placeholder flow);
        # a blank key with nothing stored is still a validation error.
        stored = bug_config.load_supabase_config()
        stored_key = stored.get("api_key") if stored else None

        if not isinstance(stored_key, str) or not stored_key:
            raise AppError(ErrorCode.E_BE_BAD_REQUEST, "api_key is required", {"Field": "api_key"})

        api_key = stored_key

    stored = {
        "url": url,
        "api_key": api_key,
        "role": payload.get("role", "secondary"),
        "is_enabled": bool(payload.get("is_enabled", True)),
    }
    bug_config.save_supabase_config(stored)
    envelope = success(
        bug_config.sanitized_supabase_config(stored), requested_at=str(request.url)
    )
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


@router.post("/test")
async def post_bug_report_test(request: Request) -> JSONResponse:
    """Endpoint reachability + table verification for stored settings."""
    rejected = _reject_non_loopback(request)

    if rejected is not None:
        return rejected

    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    client = client_from_config(bug_config.load_supabase_config())

    if client is None:
        raise AppError(
            ErrorCode.E_BE_UNAVAILABLE,
            "Supabase is not configured.",
            {"Hint": "POST /bug-reports/config"},
        )

    try:
        probe = client.test_endpoint()
        tables = client.verify_tables()
    except SupabaseError as error:
        raise AppError(ErrorCode.E_BUG_SUPABASE_FAILED, str(error), {}) from error

    payload = {"is_reachable": probe["is_reachable"], **tables}
    envelope = success(payload, requested_at=str(request.url))
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


__all__ = ["router"]
