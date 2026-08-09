"""Boot-time wiring for settings-driven denial-burst thresholds (v1.28.0)."""
from __future__ import annotations

import sqlite3

import pytest

from app.core.config.settings_store import SettingsStore
from app.core.security.audit_sink import AuditSink, CODE_THRESHOLDS_LOADED
from app.core.security.remediation import DenialRateLimiter
from app.supervisor.boot import apply_security_settings_at_boot


class _FakeAuth:
    class _S:
        def __init__(self, uid: str) -> None:
            self.user_id = uid

    def current(self, token):
        from app.core.security.auth_surface import NotAuthenticatedError
        if not token:
            raise NotAuthenticatedError("no token")
        return self._S("admin-1")

    def role_of(self, uid: str) -> str:
        return "admin"

    def has_role(self, session, role: str) -> bool:
        return role == "admin"


@pytest.fixture
def store(monkeypatch):
    import app.core.config.settings_store as m
    import app.core.security.auth_surface as a
    auth = _FakeAuth()
    monkeypatch.setattr(m, "get_auth_surface", lambda: auth)
    monkeypatch.setattr(a, "get_auth_surface", lambda: auth)
    conn = sqlite3.connect(":memory:")
    return SettingsStore(conn=conn, audit=AuditSink(conn=conn))


def _limiter(store):
    return DenialRateLimiter(sink=store.audit)


def test_applies_written_thresholds(store):
    store.write("t", "security",
                {"denial_threshold": 2, "denial_window_seconds": 9})
    lim = _limiter(store)
    cfg = apply_security_settings_at_boot(store, "t", lim)
    assert cfg == {"denial_threshold": 2, "denial_window_seconds": 9}
    assert (lim.threshold, lim.window_seconds) == (2, 9)


def test_defaults_when_section_missing(store):
    lim = _limiter(store)
    cfg = apply_security_settings_at_boot(store, "t", lim)
    assert cfg == {"denial_threshold": 5, "denial_window_seconds": 60}
    assert (lim.threshold, lim.window_seconds) == (5, 60)


def test_failure_keeps_existing_thresholds_and_returns_none(store):
    # v2.0.3 spec 69 §1: bad payloads are rejected at write time with
    # E_CFG_INVALID_SECURITY, so we seed the invalid row directly to keep
    # exercising boot-time defensive behaviour when persisted data pre-dates
    # the write-path validation.
    import json, time
    store.conn.execute(
        "INSERT INTO settings(section, value_json, updated_at, updated_by) "
        "VALUES (?, ?, ?, ?)",
        ("security", json.dumps({"denial_threshold": -1}), int(time.time()), "seed"),
    )
    store.conn.commit()
    lim = _limiter(store)
    before = (lim.threshold, lim.window_seconds)
    assert apply_security_settings_at_boot(store, "t", lim) is None
    assert (lim.threshold, lim.window_seconds) == before


def test_boot_records_thresholds_loaded(store):
    """`I_SEC_BURST_THRESHOLDS_LOADED` is recorded on successful boot retune."""
    store.write("t", "security",
                {"denial_threshold": 4, "denial_window_seconds": 30})
    lim = _limiter(store)
    apply_security_settings_at_boot(store, "t", lim)
    rows = store.audit.query(code=CODE_THRESHOLDS_LOADED)
    assert len(rows) == 1
    assert rows[0].subject == "security.settings"
    assert "threshold=4" in rows[0].detail
    assert "window=30s" in rows[0].detail


def test_boot_no_thresholds_loaded_on_failure(store):
    """Failure path skips the `I_SEC_BURST_THRESHOLDS_LOADED` emit."""
    import json, time
    store.conn.execute(
        "INSERT INTO settings(section, value_json, updated_at, updated_by) "
        "VALUES (?, ?, ?, ?)",
        ("security", json.dumps({"denial_threshold": -1}), int(time.time()), "seed"),
    )
    store.conn.commit()
    lim = _limiter(store)
    apply_security_settings_at_boot(store, "t", lim)
    assert store.audit.query(code=CODE_THRESHOLDS_LOADED) == []
