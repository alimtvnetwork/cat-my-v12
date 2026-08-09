"""Tests for settings-driven denial-burst thresholds (v1.27.0)."""
from __future__ import annotations

import sqlite3

import pytest

from app.core.config.settings_store import (
    SECURITY_DEFAULTS,
    SettingsStore,
    apply_security_settings,
    load_security_thresholds,
)
from app.core.security.audit_sink import AuditSink
from app.core.security.remediation import DenialRateLimiter


class _FakeAuth:
    def __init__(self, uid: str, role: str) -> None:
        self.uid, self.role = uid, role

    class _S:
        def __init__(self, uid: str) -> None:
            self.user_id = uid

    def current(self, token):  # noqa: D401
        from app.core.security.auth_surface import NotAuthenticatedError
        if not token:
            raise NotAuthenticatedError("no token")
        return self._S(self.uid)

    def role_of(self, uid: str) -> str:
        return self.role

    def has_role(self, session, role: str) -> bool:
        return self.role == role



@pytest.fixture
def store(monkeypatch):
    import app.core.config.settings_store as m
    import app.core.security.auth_surface as a
    auth = _FakeAuth("admin-1", "admin")
    monkeypatch.setattr(m, "get_auth_surface", lambda: auth)
    monkeypatch.setattr(a, "get_auth_surface", lambda: auth)
    conn = sqlite3.connect(":memory:")
    return SettingsStore(conn=conn, audit=AuditSink(conn=conn))


def test_defaults_when_section_missing(store):
    assert load_security_thresholds(store, "t") == SECURITY_DEFAULTS


def test_write_then_apply_retunes_limiter(store):
    store.write("t", "security",
                {"denial_threshold": 3, "denial_window_seconds": 15})
    limiter = DenialRateLimiter(sink=store.audit)  # defaults 5/60
    cfg = apply_security_settings(store, "t", limiter)
    assert cfg == {"denial_threshold": 3, "denial_window_seconds": 15}
    assert limiter.threshold == 3
    assert limiter.window_seconds == 15


def test_invalid_value_rejected(store):
    # v2.0.3 spec 69 §1: write-time validation rejects non-positive ints
    # with E_CFG_INVALID_SECURITY BEFORE persistence.
    from app.core.config.settings_store import InvalidSecurityError
    with pytest.raises(InvalidSecurityError) as ei:
        store.write("t", "security", {"denial_threshold": -1})
    assert ei.value.code == "E_CFG_INVALID_SECURITY"


def test_reload_validates_and_clears_emitted():
    from app.core.security.audit_sink import AuditSink
    conn = sqlite3.connect(":memory:")
    limiter = DenialRateLimiter(sink=AuditSink(conn=conn))
    limiter._emitted.add(("u", 0, 5))
    limiter.reload(threshold=2, window_seconds=10)
    assert limiter.threshold == 2 and limiter.window_seconds == 10
    assert limiter._emitted == set()
    with pytest.raises(ValueError):
        limiter.reload(threshold=0, window_seconds=10)
