"""Plan 19 Step 7: hot-reload contract for `DenialRateLimiter`.

Locks spec/21-app/69 §2:
  - a fresh `security` write retunes the in-process limiter with NO restart,
  - the very next request over the new (lowered) threshold trips
    `RateLimitedError` carrying `code == "E_SEC_RATE_LIMITED"`,
  - exactly ONE `E_SEC_DENIAL_BURST` audit row is emitted for the burst
    (dedupe by (user_id, window_start, count) inside `DenialRateLimiter`).
"""
from __future__ import annotations

import sqlite3
import time

import pytest

from app.core.config.settings_store import (
    RateLimitedError,
    SettingsStore,
)
from app.core.security.audit_sink import (
    AuditSink,
    CODE_DENIAL_BURST,
    CODE_ROLE_DENIED,
)
from app.core.security.auth_surface import NotAuthenticatedError
from app.core.security.remediation import DenialRateLimiter


class _Auth:
    """Two-user auth surface: admin `u-admin`, non-admin `u-victim`."""

    def __init__(self) -> None:
        self._roles = {"u-admin": "admin", "u-victim": "operator"}

    class _S:
        def __init__(self, uid: str, role: str) -> None:
            self.user_id = uid
            self.roles = (role,)

    def current(self, token):
        if not token:
            raise NotAuthenticatedError("no token")
        role = self._roles.get(token, "operator")
        return self._S(token, role)

    def role_of(self, uid: str) -> str:
        return self._roles.get(uid, "operator")

    def has_role(self, session, role: str) -> bool:
        return session.roles[0] == role


def _mk(monkeypatch) -> tuple[SettingsStore, DenialRateLimiter, AuditSink]:
    import app.core.config.settings_store as m
    import app.core.security.auth_surface as a
    auth = _Auth()
    monkeypatch.setattr(m, "get_auth_surface", lambda: auth)
    monkeypatch.setattr(a, "get_auth_surface", lambda: auth)
    conn = sqlite3.connect(":memory:")
    sink = AuditSink(conn=conn)
    limiter = DenialRateLimiter(sink=sink)  # defaults 5 / 60s
    store = SettingsStore(conn=conn, audit=sink, rate_limiter=limiter)
    return store, limiter, sink


def _burst_rows(conn: sqlite3.Connection) -> list[tuple[int, str, str, str]]:
    return list(conn.execute(
        "SELECT ts, code, user_id, detail FROM audit_log WHERE code=? ORDER BY id",
        (CODE_DENIAL_BURST,),
    ))


def test_write_retunes_limiter_and_next_request_trips_exactly_one_burst(monkeypatch):
    store, limiter, sink = _mk(monkeypatch)

    # Baseline: default threshold is 5, so two denials do NOT trip a burst.
    now = int(time.time())
    for _ in range(2):
        sink.record(CODE_ROLE_DENIED, "settings:security",
                    user_id="u-victim", detail="baseline")
    assert limiter.scan(now=now) == [], "5-threshold must not trip on 2 denials"
    assert _burst_rows(store.conn) == []

    # Admin write lowers threshold to 2 within a 60s window. Hot-reload MUST
    # take effect in-process — no restart, no second call to `apply_*`.
    store.write("u-admin", "security",
                {"denial_threshold": 2, "denial_window_seconds": 60})
    assert (limiter.threshold, limiter.window_seconds) == (2, 60), \
        "spec 69 §2: limiter must retune on the same call as the write"

    # Next request evaluated against the NEW limit: the same 2 denials now
    # exceed threshold=2. Scan MUST emit exactly one E_SEC_DENIAL_BURST row.
    alerts = limiter.scan(now=now)
    assert len(alerts) == 1 and alerts[0].user_id == "u-victim"
    assert alerts[0].threshold == 2 and alerts[0].window_seconds == 60

    rows = _burst_rows(store.conn)
    assert len(rows) == 1, f"exactly one burst row expected, got {rows}"
    _ts, code, uid, detail = rows[0]
    assert code == "E_SEC_DENIAL_BURST"
    assert uid == "u-victim"
    assert "count=2" in detail and "threshold=2" in detail

    # A second scan in the same window MUST be idempotent (dedupe key).
    assert limiter.scan(now=now) == []
    assert len(_burst_rows(store.conn)) == 1

    # And the victim's next admin-write attempt is refused pre-role-check
    # with `E_SEC_RATE_LIMITED`, proving the closed loop reads the retuned
    # limiter, not a stale value.
    with pytest.raises(RateLimitedError) as ei:
        store.write("u-victim", "security", {"denial_threshold": 9})
    assert ei.value.code == "E_SEC_RATE_LIMITED"
