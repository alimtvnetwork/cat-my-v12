"""Discovery aggregator tests (Plan 25 SS-05)."""
from __future__ import annotations

import pytest

from app.capture.vendor_device_io import (
    CaptureAdapterError,
    E_CFG_UNKNOWN_DEVICE,
    VendorDeviceDescriptor,
)
from app.capture.vendor_discovery import discover_all_devices, resolve_selection


def _d(vendor: str, serial: str, model: str = "m") -> VendorDeviceDescriptor:
    return VendorDeviceDescriptor(vendor, serial, model, "USB3", serial)


def test_aggregates_all_vendors_and_dedupes() -> None:
    listers = {
        "pylon": lambda: [_d("pylon", "P-01"), _d("pylon", "P-01")],  # dup
        "spinnaker": lambda: [_d("spinnaker", "S-01")],
        "vimba": lambda: [_d("vimba", "V-01")],
    }
    rows = discover_all_devices(listers)
    keys = sorted((r.vendor, r.serial) for r in rows)
    assert keys == [("pylon", "P-01"), ("spinnaker", "S-01"), ("vimba", "V-01")]


def test_partial_failure_logs_warning_and_continues(caplog) -> None:
    def boom() -> list[VendorDeviceDescriptor]:
        raise RuntimeError("SDK not installed")

    listers = {
        "pylon": boom,
        "spinnaker": lambda: [_d("spinnaker", "S-01")],
        "vimba": lambda: [],
    }
    with caplog.at_level("WARNING"):
        rows = discover_all_devices(listers)
    assert [(r.vendor, r.serial) for r in rows] == [("spinnaker", "S-01")]
    assert any("W_DISCOVERY_PARTIAL" in rec.message for rec in caplog.records)


def test_resolve_selection_unknown_raises_e_cfg_unknown_device() -> None:
    listers = {"pylon": lambda: [_d("pylon", "P-01")]}
    with pytest.raises(CaptureAdapterError) as ei:
        resolve_selection("pylon", "does-not-exist", listers)
    assert ei.value.code == E_CFG_UNKNOWN_DEVICE
    assert ei.value.vendor == "pylon"


def test_resolve_selection_hit_returns_descriptor() -> None:
    listers = {"spinnaker": lambda: [_d("spinnaker", "S-01", "Blackfly")]}
    row = resolve_selection("spinnaker", "S-01", listers)
    assert row.model == "Blackfly"
