"""Crockford Base32 ULID validator (spec/21-app/20 §Identifier contract).

Length 26, alphabet [0-9A-HJKMNP-TV-Z]. No decoding — validation only.
Used by every boundary that accepts a jobId/taskId/ruleId route param
(F-20/F-21/F-29) so downstream code never sees a malformed identifier.
"""
from __future__ import annotations

import re

from app.core.errors.codes import ErrorCode

# Crockford Base32: excludes I, L, O, U to avoid transcription errors.
ULID_RE = re.compile(r"^[0-9A-HJKMNP-TV-Z]{26}$")


class UlidFormatError(ValueError):
    """Raised when a value is not a well-formed ULID."""

    code = ErrorCode.E_RULE_BAD_INPUT  # boundary reuse; caller may rewrap

    def __init__(self, value: object, field: str = "id") -> None:
        super().__init__(f"{field}={value!r} is not a valid ULID")
        self.field = field
        self.value = value


def is_ulid(value: object) -> bool:
    return isinstance(value, str) and ULID_RE.match(value) is not None


def assert_ulid(value: object, field: str = "id") -> str:
    if not is_ulid(value):
        raise UlidFormatError(value, field)
    return value  # type: ignore[return-value]
