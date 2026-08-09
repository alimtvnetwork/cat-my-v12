"""Typed error hierarchy for Control Automation backend.

Anchor: spec/21-app/40-error-manage.md (three-tier model, typed-code contract).
"""
from .codes import ErrorCode, ALL_CODES
from .types import DomainError, InfraError, BugError, TypedError

__all__ = [
    "ErrorCode",
    "ALL_CODES",
    "DomainError",
    "InfraError",
    "BugError",
    "TypedError",
]
