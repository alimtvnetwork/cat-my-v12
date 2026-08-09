"""Plan 19 Steps 4-5: admin-write path for the `security` section.

Locks spec/21-app/69 §1-§2:
  - non-positive ints raise `E_CFG_INVALID_SECURITY` at write time,
  - non-admin callers raise `E_SEC_ROLE_DENIED` and NEVER touch the row,
  - admin success emits `I_SEC_ADMIN_WRITE` with
    `subject="settings.security.denial"` and a JSON `{"prior","next"}` detail,
  - the in-process limiter is hot-reloaded (no restart).
"""
from __future__ import annotations

import json
import sqlite3

import pytest

from app.core.config.settings_store import (
    InvalidSecurityError,
    SettingsStore,
)
from app.core.security.audit_sink import (
    AuditSink,
    CODE_ADMIN_WRITE,
    CODE_ROLE_DENIED,
)
from app.core.security.auth_surface import (
    NotAuthenticatedError,
    RoleDeniedError,
)
from app.core.security.remediation import DenialRateLimiter


class _Auth:
    def __init__(self, uid: str, role: str) -> None:
        self.uid, self.role = uid, role

    class _S:
        def __init__(self, uid: str, role: str) -> None:
            self.user_id = uid
            self.roles = (role,)

    def current(self, token):
        if not token:
            raise NotAuthenticatedError("no token")
        return self._S(self.uid, self.role)

    def role_of(self, uid: str) -> str:
        return self.role

    def has_role(self, session, role: str) -> bool:
        return self.role == role


def _mk(monkeypatch, role: str) -> tuple[SettingsStore, DenialRateLimiter]:
    import app.core.config.settings_store as m
    import app.core.security.auth_surface as a
    auth = _Auth("u-1", role)
    monkeypatch.setattr(m, "get_auth_surface", lambda: auth)
    monkeypatch.setattr(a, "get_auth_surface", lambda: auth)
    conn = sqlite3.connect(":memory:")
    sink = AuditSink(conn=conn)
    limiter = DenialRateLimiter(sink=sink)  # defaults 5/60
    store = SettingsStore(conn=conn, audit=sink, rate_limiter=limiter)
    return store, limiter


def _rows(store: SettingsStore, code: str) -> list[tuple[str, str, str]]:
    return list(store.conn.execute(
        "SELECT code, subject, detail FROM audit_log WHERE code=? ORDER BY id",
        (code,),
    ))


def test_admin_write_emits_prior_next_audit_and_hot_reloads(monkeypatch):
    store, limiter = _mk(monkeypatch, "admin")
    # First write: prior is None.
    store.write("t", "security", {"denial_threshold": 3, "denial_window_seconds": 15})
    assert (limiter.threshold, limiter.window_seconds) == (3, 15)
    # Second write: prior must reflect the first write, exactly.
    store.write("t", "security", {"denial_threshold": 7, "denial_window_seconds": 30})
    assert (limiter.threshold, limiter.window_seconds) == (7, 30)

    writes = _rows(store, CODE_ADMIN_WRITE)
    assert len(writes) == 2, writes
    for _code, subject, _detail in writes:
        assert subject == "settings.security.denial"
    prior1 = json.loads(writes[0][2])
    prior2 = json.loads(writes[1][2])
    assert prior1 == {"prior": None, "next": {"denial_threshold": 3, "denial_window_seconds": 15}}
    assert prior2 == {
        "prior": {"denial_threshold": 3, "denial_window_seconds": 15},
        "next": {"denial_threshold": 7, "denial_window_seconds": 30},
    }


def test_non_admin_denied_and_row_untouched(monkeypatch):
    store, limiter = _mk(monkeypatch, "operator")
    with pytest.raises(RoleDeniedError) as ei:
        store.write("t", "security", {"denial_threshold": 9})
    assert ei.value.code == "E_SEC_ROLE_DENIED"
    # No security row persisted.
    assert store.conn.execute(
        "SELECT COUNT(*) FROM settings WHERE section='security'"
    ).fetchone()[0] == 0
    # Role-denial audited, admin-write NOT audited.
    assert len(_rows(store, CODE_ROLE_DENIED)) == 1
    assert _rows(store, CODE_ADMIN_WRITE) == []
    # Limiter untouched.
    assert (limiter.threshold, limiter.window_seconds) == (5, 60)


@pytest.mark.parametrize("bad", [
    {"denial_threshold": 0},
    {"denial_threshold": -1},
    {"denial_window_seconds": 0},
    {"denial_threshold": True},   # bool is not a valid int here
    {"denial_threshold": "5"},
    {"unknown_key": 1},
])
def test_invalid_payload_rejected_before_persistence(monkeypatch, bad):
    store, limiter = _mk(monkeypatch, "admin")
    with pytest.raises(InvalidSecurityError) as ei:
        store.write("t", "security", bad)
    assert ei.value.code == "E_CFG_INVALID_SECURITY"
    # No row, no admin-write audit, no limiter change.
    assert store.conn.execute(
        "SELECT COUNT(*) FROM settings WHERE section='security'"
    ).fetchone()[0] == 0
    assert _rows(store, CODE_ADMIN_WRITE) == []
    assert (limiter.threshold, limiter.window_seconds) == (5, 60)
