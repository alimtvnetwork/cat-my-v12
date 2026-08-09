"""Tests for `capture` settings section (vendor selector).

Anchors:
  - spec/21-app/63-v2-vendor-pylon.md
  - spec/21-app/64-v2-vendor-spinnaker.md
  - spec/21-app/65-v2-vendor-vimba.md
"""
from __future__ import annotations

import sqlite3
from dataclasses import dataclass

import pytest

from app.core.config.settings_store import (
    CAPTURE_DEFAULTS,
    SUPPORTED_VENDORS,
    SettingsStore,
    UnsupportedVendorError,
    load_capture_settings,
)
from app.supervisor.boot import apply_capture_settings_at_boot


# Minimal fake auth surface, mirroring test_settings_driven_thresholds.
@dataclass
class _Session:
    user_id: str
    roles: tuple[str, ...] = ("admin",)


class _FakeAuth:
    def __init__(self, session: _Session) -> None:
        self._session = session

    def current(self, _token):
        return self._session

    def require_role(self, _token, role):
        if role not in self._session.roles:
            from app.core.security.auth_surface import RoleDeniedError
            raise RoleDeniedError(role)
        return self._session


@pytest.fixture
def store(monkeypatch) -> SettingsStore:
    import app.core.security.auth_surface as auth
    import app.core.config.settings_store as ss

    fake = _FakeAuth(_Session("u1"))
    monkeypatch.setattr(auth, "get_auth_surface", lambda: fake)
    monkeypatch.setattr(ss, "get_auth_surface", lambda: fake)
    monkeypatch.setattr(auth, "require_role", fake.require_role)
    monkeypatch.setattr(ss, "require_role", fake.require_role)
    conn = sqlite3.connect(":memory:")
    return SettingsStore(conn=conn)


def test_default_vendor_when_section_missing(store) -> None:
    assert load_capture_settings(store, "t") == CAPTURE_DEFAULTS
    assert CAPTURE_DEFAULTS["vendor"] in SUPPORTED_VENDORS


@pytest.mark.parametrize("vendor", SUPPORTED_VENDORS)
def test_each_supported_vendor_round_trips(store, vendor) -> None:
    store.write("t", "capture", {"vendor": vendor})
    assert load_capture_settings(store, "t")["vendor"] == vendor


def test_unknown_vendor_is_hard_error(store) -> None:
    store.write("t", "capture", {"vendor": "hikvision"})
    with pytest.raises(UnsupportedVendorError) as ei:
        load_capture_settings(store, "t")
    assert ei.value.code == "E_CFG_UNSUPPORTED_VENDOR"


def test_non_string_vendor_is_hard_error(store) -> None:
    store.write("t", "capture", {"vendor": 42})
    with pytest.raises(UnsupportedVendorError):
        load_capture_settings(store, "t")


def test_boot_returns_vendor_on_success(store) -> None:
    store.write("t", "capture", {"vendor": "vimba"})
    assert apply_capture_settings_at_boot(store, "t") == "vimba"


def test_boot_returns_none_on_unknown_vendor(store) -> None:
    store.write("t", "capture", {"vendor": "bogus"})
    # Boot must not crash on tunables; keeps compile-time default upstream.
    assert apply_capture_settings_at_boot(store, "t") is None


def test_boot_returns_default_when_absent(store) -> None:
    assert apply_capture_settings_at_boot(store, "t") == CAPTURE_DEFAULTS["vendor"]
