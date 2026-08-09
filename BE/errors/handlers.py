"""FastAPI exception handlers -> Universal Response Envelope.

Spec: `spec/03-error-manage/02-error-architecture/05-response-envelope/`

Three handlers so no error path escapes the envelope:
    AppError                 -> handler_app_error   (registry-driven status)
    RequestValidationError   -> handler_validation  (E_BE_BAD_REQUEST, 400)
    Exception (fallback)     -> handler_unhandled   (E_BE_INTERNAL, 500)

All handlers propagate `X-Correlation-Id`, log once with subject id + code, and
build the envelope through `BE.envelope.failure(...)` so the wire shape is
identical whether the failure was typed, validation, or unhandled.
"""

from __future__ import annotations

import logging
import traceback

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from BE.config import get_settings
from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, failure
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode, default_http_status

logger = logging.getLogger("BE.errors")


def _correlation_id(request: Request) -> str:
    return ensure_correlation_id(request.headers.get(CORRELATION_HEADER))


def _requested_at(request: Request) -> str:
    """Full URL the BE handled — matches spec `Attributes.RequestedAt`."""
    return str(request.url)


def _operation(request: Request) -> str:
    return f"{request.method} {request.url.path}"


def _json(body: dict, status: int, correlation_id: str) -> JSONResponse:
    return JSONResponse(
        content=body,
        status_code=status,
        headers={CORRELATION_HEADER: correlation_id},
    )


def _stack_frames(exc: BaseException) -> list[str]:
    """Compact `file:line function` frames for `Errors.Backend`."""
    return [
        f"{f.filename}:{f.lineno} {f.name}"
        for f in traceback.extract_tb(exc.__traceback__)
    ]


async def handler_app_error(request: Request, exc: AppError) -> JSONResponse:
    correlation_id = _correlation_id(request)
    logger.warning(
        "app_error",
        extra={
            "CorrelationId": correlation_id,
            "operation": _operation(request),
            "code": exc.code.value,
            "subject_id": exc.details.get("subject_id") or exc.details.get("id"),
            "cheat_sheet": "spec/03-error-manage/01-error-resolution/02-debugging-cheat-sheet.md" if not get_settings().is_prod and exc.http_status.value >= 500 else None,
        },
    )
    envelope = exc.to_envelope(
        requested_at=_requested_at(request),
        backend_frames=_stack_frames(exc) if not get_settings().is_prod else None,
    )
    return _json(envelope.to_wire(), exc.http_status.value, correlation_id)


async def handler_validation(request: Request, exc: RequestValidationError) -> JSONResponse:
    correlation_id = _correlation_id(request)
    code = ErrorCode.E_BE_BAD_REQUEST
    logger.warning(
        "validation_error",
        extra={
            "CorrelationId": correlation_id,
            "operation": _operation(request),
            "code": code.value,
            "subject_id": None,
        },
    )
    envelope = failure(
        code=code.value,
        message="request validation failed",
        requested_at=_requested_at(request),
        http_status=default_http_status(code).value,
    )
    return _json(envelope.to_wire(), default_http_status(code).value, correlation_id)


async def handler_unhandled(request: Request, exc: Exception) -> JSONResponse:
    correlation_id = _correlation_id(request)
    code = ErrorCode.E_BE_INTERNAL
    logger.exception(
        "unhandled_exception",
        extra={
            "CorrelationId": correlation_id,
            "operation": _operation(request),
            "code": code.value,
            "subject_id": None,
            "cheat_sheet": "spec/03-error-manage/01-error-resolution/02-debugging-cheat-sheet.md" if not get_settings().is_prod else None,
        },
    )
    envelope = failure(
        code=code.value,
        message=_safe_message(exc),
        requested_at=_requested_at(request),
        http_status=default_http_status(code).value,
        backend_frames=_stack_frames(exc) if not get_settings().is_prod else None,
    )
    return _json(envelope.to_wire(), default_http_status(code).value, correlation_id)


def _safe_message(exc: Exception) -> str:
    if get_settings().is_prod:
        return "internal error"
    return f"{type(exc).__name__}: {exc}"


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, handler_app_error)
    app.add_exception_handler(RequestValidationError, handler_validation)
    app.add_exception_handler(Exception, handler_unhandled)


__all__ = [
    "handler_app_error",
    "handler_unhandled",
    "handler_validation",
    "register_exception_handlers",
]
