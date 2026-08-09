"""Plan 25 SS-08: admin audit trail for `settings.capture.device`.

Locks the write path used by operator device selection:
  - success emits `I_SEC_ADMIN_WRITE` with subject `settings.capture.device`
    and prior/next JSON detail.
  - non-admin caller is refused with `E_SEC_ROLE_DENIED` audit row and
    NO persisted value change.
  - unauthenticated caller is refused with `E_SEC_NOAUTH`.
  - unsupported vendor is a hard `UnsupportedVendorError` before any audit row.

Anchors: spec/21-app/67-v2-discovery-contract.md §Select,
`.lovable/plans/pending/25-v2.0.7-vendor-sdk-hardening.md` SS-08.
"""
from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass

import pytest

from app.core.config.settings_store import (
    SettingsStore,
    UnsupportedVendorError,
    load_capture_settings,
)
from app.core.security.audit_sink import AuditSink
from app.core.security.auth_surface import (
    NotAuthenticatedError,
    RoleDeniedError,
)


@dataclass
class _Session:
    user_id: str
    roles: tuple[str, ...] = ("admin",)


class _FakeAuth:
    def __init__(self, session: _Session | None) -> None:
        self._session = session

    def current(self, _token):
        if self._session is None:
            raise NotAuthenticatedError("no session")
        return self._session

    def require_role(self, _token, role):
        if self._session is None:
            raise NotAuthenticatedError("no session")
        if role not in self._session.roles:
            raise RoleDeniedError(role)
        return self._session


def _wire(monkeypatch, auth: _FakeAuth) -> None:
    import app.core.security.auth_surface as a
    import app.core.config.settings_store as ss
    monkeypatch.setattr(a, "get_auth_surface", lambda: auth)
    monkeypatch.setattr(ss, "get_auth_surface", lambda: auth)
    monkeypatch.setattr(a, "require_role", auth.require_role)
    monkeypatch.setattr(ss, "require_role", auth.require_role)


def _patch_resolve(monkeypatch, known: set[tuple[str, str]] | None = None) -> None:
    """Replace vendor_discovery.resolve_selection so tests never touch SDKs."""
    from app.capture import vendor_discovery as vd
    from app.capture.vendor_device_io import (
        CaptureAdapterError,
        E_CFG_UNKNOWN_DEVICE,
        VendorDeviceDescriptor,
    )
    allow = known if known is not None else {("pylon", "SN-OLD"), ("vimba", "SN-NEW"), ("pylon", "SN-1")}

    def fake_resolve(vendor, serial, listers=None):
        if (vendor, serial) in allow:
            return VendorDeviceDescriptor(vendor=vendor, serial=serial, model="fake")
        raise CaptureAdapterError(E_CFG_UNKNOWN_DEVICE, vendor, f"serial={serial}")

    monkeypatch.setattr(vd, "resolve_selection", fake_resolve)


@pytest.fixture
def store_and_audit(monkeypatch):
    conn = sqlite3.connect(":memory:")
    audit_conn = sqlite3.connect(":memory:")
    sink = AuditSink(conn=audit_conn)
    _wire(monkeypatch, _FakeAuth(_Session("admin-1")))
    _patch_resolve(monkeypatch)
    return SettingsStore(conn=conn, audit=sink), sink, audit_conn


def _rows(audit_conn: sqlite3.Connection):
    return audit_conn.execute(
        "SELECT code, subject, user_id, detail FROM audit_log ORDER BY id"
    ).fetchall()


def test_admin_write_emits_dotted_subject_with_prior_next(store_and_audit):
    store, _sink, audit_conn = store_and_audit
    # Seed a prior binding so we lock the prior/next diff, not just a bare next.
    store.write_capture_device("tok", "pylon", "SN-OLD")
    store.write_capture_device("tok", "vimba", "SN-NEW")

    rows = _rows(audit_conn)
    assert len(rows) == 2
    codes = {r[0] for r in rows}
    subjects = {r[1] for r in rows}
    assert codes == {"I_SEC_ADMIN_WRITE"}
    assert subjects == {"settings.capture.device"}

    detail = json.loads(rows[1][3])
    assert detail == {
        "next": {"serial": "SN-NEW", "vendor": "vimba"},
        "prior": {"serial": "SN-OLD", "vendor": "pylon"},
    }
    # Persisted section value is queryable via the existing loader.
    assert load_capture_settings(store, "tok")["vendor"] == "vimba"


def test_non_admin_is_denied_and_audited(monkeypatch, store_and_audit):
    store, _sink, audit_conn = store_and_audit
    _wire(monkeypatch, _FakeAuth(_Session("op-1", roles=("operator",))))
    with pytest.raises(RoleDeniedError):
        store.write_capture_device("tok", "pylon", "SN-1")
    rows = _rows(audit_conn)
    assert rows and rows[-1][0] == "E_SEC_ROLE_DENIED"
    assert rows[-1][1] == "settings.capture.device"
    # No persisted row for capture.
    assert store.conn.execute(
        "SELECT COUNT(*) FROM settings WHERE section='capture'"
    ).fetchone()[0] == 0


def test_unauthenticated_is_denied_and_audited(monkeypatch, store_and_audit):
    store, _sink, audit_conn = store_and_audit
    _wire(monkeypatch, _FakeAuth(None))
    with pytest.raises(NotAuthenticatedError):
        store.write_capture_device(None, "pylon", "SN-1")
    rows = _rows(audit_conn)
    assert rows and rows[-1][0] == "E_SEC_NOAUTH"
    assert rows[-1][1] == "settings.capture.device"


def test_unsupported_vendor_is_hard_error_before_audit(store_and_audit):
    store, _sink, audit_conn = store_and_audit
    with pytest.raises(UnsupportedVendorError):
        store.write_capture_device("tok", "hikvision", "SN-1")
    # Validation happens before role check / audit emit.
    assert _rows(audit_conn) == []


def test_empty_serial_rejected(store_and_audit):
    store, _sink, _audit_conn = store_and_audit
    with pytest.raises(ValueError):
        store.write_capture_device("tok", "pylon", "   ")


def test_unknown_device_denied_and_audited(monkeypatch, store_and_audit):
    """Spec 66 §Operator selection contract: unknown (vendor, serial) must
    audit `E_CFG_UNKNOWN_DEVICE` on `settings.capture.device` and NOT persist."""
    from app.capture.vendor_device_io import CaptureAdapterError
    store, _sink, audit_conn = store_and_audit
    # Empty allow-set forces the resolver to raise.
    _patch_resolve(monkeypatch, known=set())
    with pytest.raises(CaptureAdapterError) as exc:
        store.write_capture_device("tok", "pylon", "SN-ghost")
    assert exc.value.code == "E_CFG_UNKNOWN_DEVICE"
    rows = _rows(audit_conn)
    assert rows and rows[-1][0] == "E_CFG_UNKNOWN_DEVICE"
    assert rows[-1][1] == "settings.capture.device"
    detail = json.loads(rows[-1][3])
    assert detail == {"serial": "SN-ghost", "vendor": "pylon"}
    # No I_SEC_ADMIN_WRITE emitted, no capture row persisted.
    assert "I_SEC_ADMIN_WRITE" not in {r[0] for r in rows}
    assert store.conn.execute(
        "SELECT COUNT(*) FROM settings WHERE section='capture'"
    ).fetchone()[0] == 0
