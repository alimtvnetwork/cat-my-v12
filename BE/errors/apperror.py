"""Typed application-level exception. Wire codes live in `BE.errors.codes`.

Every boundary error MUST raise `AppError` so the FastAPI handler in
`BE.errors.handlers` can build the Universal Response Envelope
(`spec/03-error-manage/02-error-architecture/05-response-envelope/`).
"""

from __future__ import annotations

from http import HTTPStatus
from typing import Any

from BE.envelope import Envelope, failure
from BE.errors.codes import ErrorCode, default_http_status


class AppError(Exception):
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        details: dict[str, Any] | None = None,
        *,
        cause: BaseException | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details: dict[str, Any] = details or {}
        self.cause = cause
        if cause is not None:
            self.__cause__ = cause

    @property
    def http_status(self) -> HTTPStatus:
        return default_http_status(self.code)

    def to_envelope(self, requested_at: str, backend_frames: list[str] | None = None) -> Envelope:
        """Serialize to the Universal Response Envelope failure shape.

        `self.details` is threaded into `Errors.Details` verbatim so
        structured problem payloads (e.g. `verify-bundle` Problems[])
        survive the CLI stdout / HTTP response boundary.
        """
        delegated = None
        if self.details and "path" in self.details and "operation" in self.details:
            prefix = f"{self.details.get('module', 'unknown')} {self.details.get('operation')} {self.details.get('path')}: {self.details.get('reason', 'unknown')}"
            delegated = [prefix]

        return failure(
            code=self.code.value,
            message=self.message,
            requested_at=requested_at,
            http_status=self.http_status.value,
            backend_frames=backend_frames,
            delegated_stack=delegated,
            details=self.details or None,
        )


    def __repr__(self) -> str:
        return f"AppError(code={self.code.value!r}, message={self.message!r}, details={self.details!r})"

    @classmethod
    def for_file(
        cls,
        reason: str,
        *,
        path: str,
        operation: str,
        module: str,
        message: str | None = None,
        code: ErrorCode = ErrorCode.E_BE_NOT_FOUND,
        cause: BaseException | None = None,
    ) -> AppError:
        """Create a file-path error satisfying the Code Red schema constraint."""
        msg = message or f"{operation} failed on {path}: {reason}"
        return cls(
            code=code,
            message=msg,
            details={
                "path": path,
                "operation": operation,
                "reason": reason,
                "module": module,
            },
            cause=cause,
        )

__all__ = ["AppError"]
