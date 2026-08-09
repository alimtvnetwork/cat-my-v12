"""Lovable Cloud auth surface — typed seam for operator/admin sessions.

Stub implementation. Real Lovable Cloud integration swaps `StubAuthSurface`
via `set_auth_surface()` without changing callers.

Errors are typed so callers never swallow silently:
  - `NotAuthenticatedError` when no session is bound to the request.
  - `RoleDeniedError` when the session lacks the required role.

Roles are stored in a dedicated mapping (never on the user record) per
project security rule against privilege-escalation via profile edits.
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from typing import Literal, Protocol

log = logging.getLogger("ca.security.auth")

Role = Literal["operator", "admin"]


def new_correlation_id() -> str:
    """Return an opaque, uniformly-random correlation id.

    Short (12 hex chars) so it lands cleanly in log lines and error
    messages, wide enough to make collisions across a single support
    window statistically negligible.
    """
    return uuid.uuid4().hex[:12]


class AuthError(Exception):
    """Base auth error. Always carries a stable `code` for log correlation."""

    code: str = "E_SEC_AUTH"

    def __init__(self, message: str, *, correlation_id: str | None = None) -> None:
        super().__init__(message)
        self.correlation_id = correlation_id or new_correlation_id()


class NotAuthenticatedError(AuthError):
    code = "E_SEC_NOAUTH"


class RoleDeniedError(AuthError):
    code = "E_SEC_ROLE_DENIED"


@dataclass(frozen=True)
class Session:
    user_id: str
    roles: tuple[Role, ...]


class AuthSurface(Protocol):
    def current(self, token: str | None) -> Session: ...
    def has_role(self, session: Session, role: Role) -> bool: ...


@dataclass
class StubAuthSurface:
    """Deterministic in-memory surface for tests and local dev."""

    sessions: dict[str, Session] = field(default_factory=dict)

    def grant(self, token: str, user_id: str, roles: tuple[Role, ...]) -> None:
        self.sessions[token] = Session(user_id=user_id, roles=roles)

    def current(self, token: str | None) -> Session:
        if not token or token not in self.sessions:
            cid = new_correlation_id()
            # Structured log line at the exact CODE_NOT_AUTHENTICATED emit site.
            # Fields are key=value so log scrapers can join on correlation_id.
            log.warning(
                "auth.not_authenticated code=%s correlation_id=%s token_present=%s",
                NotAuthenticatedError.code, cid, bool(token),
            )
            raise NotAuthenticatedError("no active session", correlation_id=cid)
        return self.sessions[token]

    def has_role(self, session: Session, role: Role) -> bool:
        return role in session.roles


_surface: AuthSurface = StubAuthSurface()


def get_auth_surface() -> AuthSurface:
    return _surface


def set_auth_surface(surface: AuthSurface) -> None:
    global _surface
    _surface = surface


def require_role(token: str | None, role: Role, *, correlation_id: str | None = None) -> Session:
    """Gate an operation on a role. Logs and raises on failure.

    `correlation_id` propagates the caller's request id when the surrounding
    IPC/HTTP layer already has one. When omitted a fresh id is minted so
    every denial is still traceable end-to-end.
    """
    cid = correlation_id or new_correlation_id()
    surface = get_auth_surface()
    try:
        session = surface.current(token)
    except NotAuthenticatedError as exc:
        # Bubble the caller's correlation id when it was explicit, otherwise
        # keep the id the surface minted so the log line and the raised
        # error agree.
        if correlation_id is not None:
            raise NotAuthenticatedError(str(exc), correlation_id=cid) from exc
        raise
    if not surface.has_role(session, role):
        # Structured log line at the exact CODE_ROLE_DENIED emit site.
        log.warning(
            "auth.role_denied code=%s correlation_id=%s user=%s required=%s have=%s",
            RoleDeniedError.code, cid, session.user_id, role, ",".join(session.roles),
        )
        raise RoleDeniedError(f"role {role!r} required", correlation_id=cid)
    return session
