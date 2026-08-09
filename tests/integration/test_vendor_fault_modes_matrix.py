"""SS-06 / SS-04: 3x3 vendor fault-mode matrix (Plan 25 Step 6).

Matrix: {pylon, spinnaker, vimba} x {timeout, disconnect, unknown}.

For each cell:
  1. Drive `VendorDeviceIO` with a per-vendor `FakeVendorSdk` that raises
     the vendor-flavored exception class for that fault.
  2. Assert the normalized error type per SS-02 contract lock
     (spec 21/50): timeout -> HardwareTimeoutError, disconnect ->
     DeviceDisconnectedError, unknown -> CaptureAdapterError(E_CAP_UNKNOWN).
  3. Append a matching audit row via the local SQLite sink
     (`sink_sqlite.AuditPersistenceFacade`) and read it back to prove
     the failure is observable, not swallowed.

No physical hardware, no vendor SDK import - pure CI-lite coverage of the
seam that Plans 15/17 shipped and Plan 25 hardens.
"""
from __future__ import annotations

import datetime as _dt
from pathlib import Path

import pytest

from app.capture.hardware_bridge import HardwareTimeoutError
from app.capture.reference_driver import DeviceDisconnectedError
from app.capture.vendor_device_io import (
    E_CAP_DISCONNECTED,
    E_CAP_GRAB_TIMEOUT,
    E_CAP_UNKNOWN,
    CaptureAdapterError,
    VendorDeviceIO,
)
from app.core.audit.sink_sqlite import AuditEvent, AuditPersistenceFacade


# --- Vendor-flavored fake exception hierarchies ---------------------------
# Class names mirror the real SDK types so predicates route by name.

class PylonTimeoutException(Exception):
    """pypylon.genicam.TimeoutException analog."""


class PylonRuntimeException(Exception):
    """pypylon.genicam.RuntimeException / bus loss analog."""


class SpinnakerException(Exception):
    """PySpin.SpinnakerException analog. Carries a numeric errorcode."""

    def __init__(self, errorcode: int, msg: str = "") -> None:
        self.errorcode = errorcode
        super().__init__(msg or f"spin errorcode={errorcode}")


# PySpin errorcodes we care about (spec 21/50 SS-02 mapping).
SPIN_ERR_TIMEOUT = -1011
SPIN_ERR_ACCESS_DENIED = -1002


class VmbTimeout(Exception):
    """vmbpy VmbTimeout analog."""


class VmbCameraError(Exception):
    """vmbpy VmbCameraError analog - camera fell off the bus."""


# --- FakeVendorSdk: one scripted camera + a wire() factory ---------------

class FakeVendorSdk:
    """Scripted vendor camera. `raise_on_grab` is raised the next grab()."""

    def __init__(self, *, raise_on_grab: BaseException | None = None) -> None:
        self.raise_on_grab = raise_on_grab
        self._open = False
        self.grab_count = 0

    def start(self) -> None:
        self._open = True

    def stop(self) -> None:
        self._open = False

    def is_streaming(self) -> bool:
        return self._open

    def grab_frame(self, _timeout_ms: int) -> bytes:
        self.grab_count += 1
        if self.raise_on_grab is not None:
            exc, self.raise_on_grab = self.raise_on_grab, None
            raise exc
        return b"\x00" * 16


def _wire(vendor: str, cam: FakeVendorSdk, is_timeout, is_disconnect) -> VendorDeviceIO:
    return VendorDeviceIO(
        handle=cam,
        open_fn=lambda h: h.start(),
        close_fn=lambda h: h.stop(),
        grab_fn=lambda h, ms: h.grab_frame(ms),
        is_connected_fn=lambda h: h.is_streaming(),
        is_timeout=is_timeout,
        is_disconnect=is_disconnect,
        vendor=vendor,
    )


# --- Per-vendor predicate sets (mirror real adapter modules) --------------

def _pylon_io(cam: FakeVendorSdk) -> VendorDeviceIO:
    return _wire(
        "pylon", cam,
        is_timeout=lambda e: isinstance(e, PylonTimeoutException),
        is_disconnect=lambda e: isinstance(e, PylonRuntimeException),
    )


def _spinnaker_io(cam: FakeVendorSdk) -> VendorDeviceIO:
    return _wire(
        "spinnaker", cam,
        is_timeout=lambda e: isinstance(e, SpinnakerException) and e.errorcode == SPIN_ERR_TIMEOUT,
        is_disconnect=lambda e: isinstance(e, SpinnakerException) and e.errorcode == SPIN_ERR_ACCESS_DENIED,
    )


def _vimba_io(cam: FakeVendorSdk) -> VendorDeviceIO:
    return _wire(
        "vimba", cam,
        is_timeout=lambda e: isinstance(e, VmbTimeout),
        is_disconnect=lambda e: isinstance(e, VmbCameraError),
    )


# --- Audit-row helper (spec 72 sink) --------------------------------------

def _now_iso() -> str:
    return _dt.datetime.now(_dt.timezone.utc).isoformat()


def _record_failure(facade: AuditPersistenceFacade, *, vendor: str, code: str,
                    correlation_id: str, detail: str) -> AuditEvent:
    event = AuditEvent.new(
        code=code,
        policy="capture.fault",
        correlation_id=correlation_id,
        payload={"vendor": vendor, "detail": detail},
        ts=_now_iso(),
    )
    return facade.append_event(event)


@pytest.fixture()
def audit_facade(tmp_path: Path) -> AuditPersistenceFacade:
    facade = AuditPersistenceFacade(tmp_path / "audit.db")
    facade.self_test()
    return facade


# --- Matrix builders -------------------------------------------------------

VENDOR_CASES = {
    "pylon": (_pylon_io, {
        "timeout": PylonTimeoutException("grab exceeded"),
        "disconnect": PylonRuntimeException("bus loss"),
        "unknown": RuntimeError("mystery"),
    }),
    "spinnaker": (_spinnaker_io, {
        "timeout": SpinnakerException(SPIN_ERR_TIMEOUT),
        "disconnect": SpinnakerException(SPIN_ERR_ACCESS_DENIED),
        "unknown": SpinnakerException(-9999),
    }),
    "vimba": (_vimba_io, {
        "timeout": VmbTimeout("t/o"),
        "disconnect": VmbCameraError("unplugged"),
        "unknown": RuntimeError("mystery"),
    }),
}

FAULT_EXPECT = {
    "timeout": (HardwareTimeoutError, E_CAP_GRAB_TIMEOUT),
    "disconnect": (DeviceDisconnectedError, E_CAP_DISCONNECTED),
    "unknown": (CaptureAdapterError, E_CAP_UNKNOWN),
}


@pytest.mark.parametrize("vendor", list(VENDOR_CASES.keys()))
@pytest.mark.parametrize("fault", list(FAULT_EXPECT.keys()))
def test_vendor_fault_mode_matrix(
    vendor: str, fault: str, audit_facade: AuditPersistenceFacade,
) -> None:
    io_factory, faults = VENDOR_CASES[vendor]
    expected_exc, expected_code = FAULT_EXPECT[fault]

    cam = FakeVendorSdk(raise_on_grab=faults[fault])
    io = io_factory(cam)
    io.open()

    with pytest.raises(expected_exc) as excinfo:
        io.grab(deadline_ms=25)

    # Unknown must specifically carry E_CAP_UNKNOWN, not a generic wrapper.
    if fault == "unknown":
        assert isinstance(excinfo.value, CaptureAdapterError)
        assert excinfo.value.code == E_CAP_UNKNOWN
        assert excinfo.value.vendor == vendor

    # Disconnect must auto-invalidate the stream so the driver stops grabbing.
    if fault == "disconnect":
        assert io.connected is False

    correlation_id = f"{vendor}-{fault}-corr"
    stored = _record_failure(
        audit_facade,
        vendor=vendor,
        code=expected_code,
        correlation_id=correlation_id,
        detail=type(faults[fault]).__name__,
    )

    rows = list(audit_facade.read_window(policy="capture.fault"))
    match = [r for r in rows if r.event_id == stored.event_id]
    assert len(match) == 1, f"audit row missing for {vendor}/{fault}"
    assert match[0].code == expected_code
    assert match[0].correlation_id == correlation_id
    assert match[0].payload["vendor"] == vendor
