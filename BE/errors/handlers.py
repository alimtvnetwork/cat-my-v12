"""FastAPI exception handlers -> Universal Response Envelope.

Spec: `02-spec/03-error-manage/02-error-architecture/05-response-envelope/`

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


def _authentic_stack_frames(exc: BaseException) -> list[str]:
    """Extract clean, qualified module and function frames for backend errors.

    Filters out virtualenv and internal framework boilerplate while retaining
    exact project source lines formatted as: 'BE/package/module.py:line in func_name()'
    """
    frames: list[str] = []
    tb = traceback.extract_tb(exc.__traceback__)

    for frame in tb:
        filename = frame.filename.replace("\\", "/")

        # Isolate project-relative path
        if "/BE/" in filename:
            filename = "BE/" + filename.split("/BE/", 1)[1]
        elif filename.startswith("BE/"):
            pass
        elif "site-packages" in filename or ".venv" in filename or "lib/python" in filename:
            # Skip third-party framework frames unless it is the direct error origin
            continue

        frames.append(f"{filename}:{frame.lineno} in {frame.name}()")

    if not frames and tb:
        # Fallback to the final frame if all preceding were filtered
        last = tb[-1]
        last_filename = last.filename.replace("\\", "/")
        if "/BE/" in last_filename:
            last_filename = "BE/" + last_filename.split("/BE/", 1)[1]
        frames.append(f"{last_filename}:{last.lineno} in {last.name}()")

    return frames


_stack_frames = _authentic_stack_frames


async def handler_app_error(request: Request, exc: AppError) -> JSONResponse:
    correlation_id = _correlation_id(request)
    logger.warning(
        "app_error",
        extra={
            "CorrelationId": correlation_id,
            "operation": _operation(request),
            "code": exc.code.value,
            "subject_id": exc.details.get("subject_id") or exc.details.get("id"),
            "cheat_sheet": "02-spec/03-error-manage/01-error-resolution/02-debugging-cheat-sheet.md" if not get_settings().is_prod and exc.http_status.value >= 500 else None,
        },
    )
    try:
        from BE.repos.sqlite_error_repo import get_error_repo
        get_error_repo().record_error(
            correlation_id=correlation_id,
            error_code=exc.code.value,
            severity="WARNING" if exc.http_status.value < 500 else "ERROR",
            subsystem="BACKEND_APP_ERROR",
            message=exc.message,
            stack_trace="\n".join(_authentic_stack_frames(exc)),
            context={
                "operation": _operation(request),
                "url": _requested_at(request),
                "details": exc.details,
            },
        )
    except Exception as db_exc:
        logger.warning("Failed to record app error to SplitDB: %s", db_exc)

    envelope = exc.to_envelope(
        requested_at=_requested_at(request),
        backend_frames=_authentic_stack_frames(exc) if not get_settings().is_prod else None,
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
            "cheat_sheet": "02-spec/03-error-manage/01-error-resolution/02-debugging-cheat-sheet.md" if not get_settings().is_prod else None,
        },
    )
    try:
        from BE.repos.sqlite_error_repo import get_error_repo
        get_error_repo().record_error(
            correlation_id=correlation_id,
            error_code=code.value,
            severity="CRITICAL",
            subsystem="BACKEND_UNHANDLED",
            message=_safe_message(exc),
            stack_trace=traceback.format_exc(),
            context={
                "operation": _operation(request),
                "url": _requested_at(request),
                "exception_type": type(exc).__name__,
            },
        )
    except Exception as db_exc:
        logger.warning("Failed to record unhandled error to SplitDB: %s", db_exc)

    envelope = failure(
        code=code.value,
        message=_safe_message(exc),
        requested_at=_requested_at(request),
        http_status=default_http_status(code).value,
        backend_frames=_authentic_stack_frames(exc) if not get_settings().is_prod else None,
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
    "_authentic_stack_frames",
    "handler_app_error",
    "handler_unhandled",
    "handler_validation",
    "register_exception_handlers",
]
