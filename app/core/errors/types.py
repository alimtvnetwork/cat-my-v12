"""Three-tier typed error base classes.

Anchor: spec/21-app/40-error-manage.md §1–§3, §7.

- `DomainError` — expected, user-actionable (e.g. bad input, no matching rule).
- `InfraError`  — transient/retryable per §4 (only tier that retries).
- `BugError`    — programmer error; surfaced via modal in UI per §6.

Every error carries `{Code, Message, Context, CausedBy?}`. `CausedBy` is
one level deep — deeper chains raise `E_BUG_ERROR_CHAIN_TOO_DEEP`.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping, Optional

from .codes import ALL_CODES, ErrorCode


def _validate_code(code: str) -> str:
    if code not in ALL_CODES:
        # Explicit surface — not a symptom patch. Missing enum entry is the bug.
        raise BugError(
            code=ErrorCode.E_BUG_UNKNOWN_CODE.value,
            message=f"Unknown error code {code!r}; add it to app.core.errors.codes.ErrorCode.",
            context={"AttemptedCode": code},
        )
    return code


@dataclass(frozen=True)
class _CausedBy:
    Code: str
    Message: str


@dataclass
class TypedError(Exception):
    """Base class — never raised directly; use one of the three tiers."""

    code: str
    message: str
    context: Mapping[str, Any] = field(default_factory=dict)
    caused_by: Optional[_CausedBy] = None

    def __post_init__(self) -> None:
        _validate_code(self.code)
        if isinstance(self.caused_by, TypedError):
            # Enforce the one-level rule from §2.
            raise BugError(
                code=ErrorCode.E_BUG_ERROR_CHAIN_TOO_DEEP.value,
                message="CausedBy must be a flat {Code, Message}, not a nested TypedError.",
                context={"OuterCode": self.code},
            )
        super().__init__(f"{self.code}: {self.message}")

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "Code": self.code,
            "Message": self.message,
            "Context": dict(self.context),
        }
        if self.caused_by is not None:
            out["CausedBy"] = {"Code": self.caused_by.Code, "Message": self.caused_by.Message}
        return out


class DomainError(TypedError):
    """Expected failure — do NOT retry."""


class InfraError(TypedError):
    """Transient/retryable failure — the only tier eligible for retry policy (§4)."""


class BugError(TypedError):
    """Programmer error — surfaced via UI modal with `Copy diagnostics` (§6)."""
