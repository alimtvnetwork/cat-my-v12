"""Universal Response Envelope for BE.

Implements `spec/03-error-manage/02-error-architecture/05-response-envelope/`
04-response-envelope-reference.md exactly:

    {
      "Status":       {IsSuccess, IsFailed, Code, Message, Timestamp},
      "Attributes":   {RequestedAt, RequestDelegatedAt, HasAnyErrors,
                        IsSingle, IsMultiple, IsEmpty, TotalRecords,
                        PerPage, TotalPages, CurrentPage},
      "Results":      [ ... ],                         # ALWAYS an array
      "Navigation":   {NextPage, PrevPage, CloserLinks} | null (omitted),
      "Errors":       {Code, BackendMessage, DelegatedServiceErrorStack,
                        Backend, Frontend} | null (omitted),
      "MethodsStack": {Backend, Frontend} | null (omitted)
    }

PascalCase keys, `Results` always a list even for singles/errors, conditional
sections omitted (not null) when absent — enforced via
`model_dump(exclude_none=True)` in `to_wire()`.

Extension: `Errors.Code` carries the registered `E_*` wire code from
`BE/errors/codes.py` so FE (Tier 3 per `03-error-manage/00-overview.md` §4)
can route by code, not string-match on messages. The spec reference table
lists only stacks + messages; we add `Code` as a required extension because
`03-error-code-registry/` is authoritative on wire-level error identity.

Owning module: replaces the earlier `{ok, data, error}` shape (Plan 88 Step 10).
Consumers: `BE/errors/handlers.py`, every `BE/routes/*.py`, FE
`src/lib/backend/envelope.ts`.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

CORRELATION_HEADER = "X-Correlation-Id"


class Status(BaseModel):
    model_config = ConfigDict(frozen=True)
    IsSuccess: bool
    IsFailed: bool
    Code: int
    Message: str
    Timestamp: str


class Attributes(BaseModel):
    model_config = ConfigDict(frozen=True)
    RequestedAt: str
    RequestDelegatedAt: str = ""
    HasAnyErrors: bool
    IsSingle: bool
    IsMultiple: bool
    IsEmpty: bool
    TotalRecords: int = 0
    PerPage: int = 0
    TotalPages: int = 0
    CurrentPage: int = 0
    TraceId: str | None = None


class Navigation(BaseModel):
    model_config = ConfigDict(frozen=True)
    NextPage: str | None = None
    PrevPage: str | None = None
    CloserLinks: list[str] = Field(default_factory=list)


class Errors(BaseModel):
    model_config = ConfigDict(frozen=True)
    Code: str  # extension: registered E_* wire code (see module docstring)
    BackendMessage: str
    DelegatedServiceErrorStack: list[str] = Field(default_factory=list)
    Backend: list[str] = Field(default_factory=list)
    Frontend: list[str] = Field(default_factory=list)
    # Extension: structured problem payload mirroring `AppError.details`.
    # Consumers (FE Global Error Modal, rules-editor validator) parse this
    # for actionable per-problem info; None -> section omitted on the wire.
    Details: dict[str, Any] | None = None



class StackFrame(BaseModel):
    model_config = ConfigDict(frozen=True)
    Method: str
    File: str
    LineNumber: int


class MethodsStack(BaseModel):
    model_config = ConfigDict(frozen=True)
    Backend: list[StackFrame] = Field(default_factory=list)
    Frontend: list[StackFrame] = Field(default_factory=list)


class Envelope(BaseModel):
    """Universal Response Envelope. Conditional sections default to None -> omitted."""

    model_config = ConfigDict(frozen=True, populate_by_name=True)

    status: Status = Field(alias="Status")
    attributes: Attributes = Field(alias="Attributes")
    results: list[Any] = Field(alias="Results")
    navigation: Navigation | None = Field(default=None, alias="Navigation")
    errors: Errors | None = Field(default=None, alias="Errors")
    methods_stack: MethodsStack | None = Field(default=None, alias="MethodsStack")

    def to_wire(self) -> dict[str, Any]:
        """Serialize with PascalCase keys and conditional sections omitted (spec Rule 3)."""
        return self.model_dump(exclude_none=True, by_alias=True)


# --- Constructors ---------------------------------------------------------


def _now_iso() -> str:
    """ISO-8601 UTC timestamp with `Z` suffix (spec §Status.Timestamp)."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _attributes(
    requested_at: str,
    results: list[Any],
    has_errors: bool,
    total_records: int | None = None,
) -> Attributes:
    """Compute the derived Attributes booleans from `Results` length."""
    from BE.middleware.request_id import request_id_ctx

    count = len(results)
    total = total_records if total_records is not None else count
    return Attributes(
        RequestedAt=requested_at,
        HasAnyErrors=has_errors,
        IsSingle=count == 1,
        IsMultiple=count > 1,
        IsEmpty=count == 0,
        TotalRecords=total,
        TraceId=request_id_ctx.get(),
    )


def success(
    results: list[Any] | Any,
    *,
    requested_at: str,
    http_status: int = HTTPStatus.OK.value,
    message: str = "OK",
    total_records: int | None = None,
) -> Envelope:
    """Wrap a successful payload. `results` may be a list, a single item, or None.

    Single items are auto-wrapped into a 1-element list per spec Rule 1
    ("Results is ALWAYS an array"). `None` becomes `[]`.
    """
    items: list[Any]
    if results is None:
        items = []
    elif isinstance(results, list):
        items = results
    else:
        items = [results]
    return Envelope(
        status=Status(
            IsSuccess=True,
            IsFailed=False,
            Code=http_status,
            Message=message,
            Timestamp=_now_iso(),
        ),
        attributes=_attributes(requested_at, items, has_errors=False, total_records=total_records),
        results=items,
    )


def failure(
    *,
    code: str,
    message: str,
    requested_at: str,
    http_status: int,
    backend_frames: list[str] | None = None,
    delegated_stack: list[str] | None = None,
    details: dict[str, Any] | None = None,
) -> Envelope:
    """Wrap a typed failure. `code` MUST be a registered `E_*` (see `BE.errors.codes`).

    `Results` is `[]` (spec Rule 1). `Errors.Code` carries the wire code for
    FE routing. `details` mirrors `AppError.details` verbatim so structured
    problem payloads (e.g. `verify-bundle` Problems[]) reach the client.
    """
    return Envelope(
        status=Status(
            IsSuccess=False,
            IsFailed=True,
            Code=http_status,
            Message=message,
            Timestamp=_now_iso(),
        ),
        attributes=_attributes(requested_at, [], has_errors=True),
        results=[],
        errors=Errors(
            Code=code,
            BackendMessage=message,
            Backend=backend_frames or [],
            DelegatedServiceErrorStack=delegated_stack or [],
            Details=details,
        ),
    )



def ensure_correlation_id(incoming: str | None) -> str:
    """Return caller-provided correlation id or mint a fresh UUID4."""
    return incoming if incoming else str(uuid.uuid4())


__all__ = [
    "CORRELATION_HEADER",
    "Attributes",
    "Envelope",
    "Errors",
    "MethodsStack",
    "Navigation",
    "StackFrame",
    "Status",
    "ensure_correlation_id",
    "failure",
    "success",
]
