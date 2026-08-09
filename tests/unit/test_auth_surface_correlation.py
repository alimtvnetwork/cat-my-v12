"""Structured-logging contract at the denial emit sites.

Guards the exact code path emitting `E_SEC_ROLE_DENIED` and
`E_SEC_NOAUTH` so each denial carries a correlation id in both the log
line and the raised error.
"""
from __future__ import annotations

import logging

import pytest

from app.core.security.auth_surface import (
    NotAuthenticatedError,
    RoleDeniedError,
    StubAuthSurface,
    set_auth_surface,
    require_role,
)


@pytest.fixture(autouse=True)
def _reset_surface():
    surface = StubAuthSurface()
    set_auth_surface(surface)
    yield surface
    set_auth_surface(StubAuthSurface())


def test_noauth_logs_correlation_id(_reset_surface, caplog):
    caplog.set_level(logging.WARNING, logger="ca.security.auth")
    with pytest.raises(NotAuthenticatedError) as exc:
        require_role(None, "admin")
    cid = exc.value.correlation_id
    assert cid and len(cid) == 12
    joined = "\n".join(r.getMessage() for r in caplog.records)
    assert "code=E_SEC_NOAUTH" in joined
    assert f"correlation_id={cid}" in joined


def test_role_denied_logs_correlation_id(_reset_surface, caplog):
    _reset_surface.grant("tok", "op-1", ("operator",))
    caplog.set_level(logging.WARNING, logger="ca.security.auth")
    with pytest.raises(RoleDeniedError) as exc:
        require_role("tok", "admin", correlation_id="fixed-cid-01")
    assert exc.value.correlation_id == "fixed-cid-01"
    joined = "\n".join(r.getMessage() for r in caplog.records)
    assert "code=E_SEC_ROLE_DENIED" in joined
    assert "correlation_id=fixed-cid-01" in joined
    assert "user=op-1" in joined
