"""Tests for DenialRateLimiter wired into SettingsStore.write."""
from __future__ import annotations

import sqlite3

import pytest

from app.core.config.settings_store import (
    CODE_RATE_LIMITED,
    RateLimitedError,
    SettingsStore,
)
from app.core.security.audit_sink import AuditSink, CODE_ROLE_DENIED
from app.core.security.auth_surface import StubAuthSurface, set_auth_surface
from app.core.security.remediation import DenialRateLimiter


@pytest.fixture
def wiring():
    conn = sqlite3.connect(":memory:")
    audit = AuditSink(conn)
    # Low threshold so tests are fast + deterministic.
    rl = DenialRateLimiter(sink=audit, threshold=3, window_seconds=60)
    store = SettingsStore(conn=conn, audit=audit, rate_limiter=rl)

    auth = StubAuthSurface()
    auth.grant("tok-admin", "u-admin", ("admin",))
    auth.grant("tok-op", "u-op", ("operator",))
    set_auth_surface(auth)
    try:
        yield store, audit, rl
    finally:
        set_auth_surface(StubAuthSurface())


def test_bursting_user_rate_limited_before_role_check(wiring):
    store, audit, _ = wiring
    # Seed 3 role denials for u-op (operator lacks admin).
    for _ in range(3):
        with pytest.raises(Exception):
            store.write("tok-op", "camera", {"exposure": 10})
    # 4th write hits the rate limiter, not RoleDeniedError.
    with pytest.raises(RateLimitedError):
        store.write("tok-op", "camera", {"exposure": 11})
    codes = [e.code for e in audit.query(limit=50)]
    assert CODE_RATE_LIMITED in codes
    assert codes.count(CODE_ROLE_DENIED) == 3  # 4th did NOT record another denial


def test_admin_never_rate_limited(wiring):
    store, _, _ = wiring
    for i in range(5):
        store.write("tok-admin", "camera", {"exposure": i})
    assert store.read("tok-admin", "camera") == {"exposure": 4}
