"""Plan 26 SS-03: lock `resolve_selection` raise contract.

Anchors:
  - spec/21-app/66-v2-vendor-discovery.md §Operator selection contract
  - app/capture/vendor_discovery.py:74-90

Asserts that `resolve_selection` returns the matching descriptor on a hit
and raises `CaptureAdapterError(code=E_CFG_UNKNOWN_DEVICE)` on a miss,
with the ERROR log line fired so operators can see the denial.
"""
from __future__ import annotations

import logging

import pytest

from app.capture.vendor_device_io import (
    CaptureAdapterError,
    E_CFG_UNKNOWN_DEVICE,
    VendorDeviceDescriptor,
)
from app.capture.vendor_discovery import resolve_selection


def _fake_listers() -> dict:
    return {
        "pylon": lambda: [
            VendorDeviceDescriptor(vendor="pylon", serial="SN-A", model="acA1"),
            VendorDeviceDescriptor(vendor="pylon", serial="SN-B", model="acA2"),
        ],
        "vimba": lambda: [
            VendorDeviceDescriptor(vendor="vimba", serial="SN-V", model="Mako"),
        ],
    }


def test_resolve_selection_returns_descriptor_on_match():
    row = resolve_selection("pylon", "SN-B", listers=_fake_listers())
    assert row.vendor == "pylon"
    assert row.serial == "SN-B"
    assert row.model == "acA2"


def test_resolve_selection_unknown_vendor_raises(caplog):
    caplog.set_level(logging.ERROR, logger="app.capture.vendor_discovery")
    with pytest.raises(CaptureAdapterError) as exc:
        resolve_selection("hikvision", "SN-B", listers=_fake_listers())
    assert exc.value.code == E_CFG_UNKNOWN_DEVICE
    assert exc.value.vendor == "hikvision"
    assert any(E_CFG_UNKNOWN_DEVICE in r.getMessage() for r in caplog.records)


def test_resolve_selection_unknown_serial_raises(caplog):
    caplog.set_level(logging.ERROR, logger="app.capture.vendor_discovery")
    with pytest.raises(CaptureAdapterError) as exc:
        resolve_selection("pylon", "SN-missing", listers=_fake_listers())
    assert exc.value.code == E_CFG_UNKNOWN_DEVICE
    assert "SN-missing" in exc.value.detail
    assert any(E_CFG_UNKNOWN_DEVICE in r.getMessage() for r in caplog.records)
