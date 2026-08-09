"""Hardware fault-mode integration tests.

CI-simulated end-to-end: drive `ReferenceCaptureDriver` through a
`VendorDeviceIO` bound to a scripted fake SDK that mimics real Basler
Pylon / FLIR Spinnaker / Allied Vision Vimba fault classes. Exercises
disconnect / timeout / recovery paths beyond unit-level mocks.

The fake SDK class hierarchy mirrors the shape a real vendor exposes:
- separate exception classes for timeout vs runtime bus loss
- open/close/grab methods on an opaque camera handle
- state that survives multiple driver.arm() cycles

If these tests pass, the seam is safe to bind to a real SDK by writing
one small `extras/vendors/<vendor>/binding.py` module — nothing else.
"""
from __future__ import annotations

import logging

import pytest

from app.capture.hardware_bridge import HardwareTimeoutError
from app.capture.reference_driver import (
    DeviceDisconnectedError,
    ReferenceCaptureDriver,
)
from app.capture.vendor_device_io import VendorDeviceIO


# --- Fake vendor SDK -------------------------------------------------------


class VendorTimeout(Exception):
    """Mimics pypylon.genicam.TimeoutException / PySpin.SpinnakerException(TIMEOUT)."""


class VendorBusLoss(Exception):
    """Mimics USB reset / GigE link loss surfaced by every vendor SDK."""


class FakeVendorCamera:
    """Scripted SDK camera. Each `grab_frame` pops one script step."""

    def __init__(self, script: list) -> None:
        self.script = list(script)
        self._open = False
        self.open_count = 0
        self.close_count = 0
        self.grab_count = 0

    def start(self) -> None:
        self._open = True
        self.open_count += 1

    def stop(self) -> None:
        self._open = False
        self.close_count += 1

    def is_streaming(self) -> bool:
        return self._open

    def grab_frame(self, timeout_ms: int) -> bytes:
        self.grab_count += 1
        if not self._open:
            raise VendorBusLoss("camera not streaming")
        step = self.script.pop(0)
        if isinstance(step, BaseException):
            # Vendor semantics: a bus-loss also invalidates the stream.
            if isinstance(step, VendorBusLoss):
                self._open = False
            raise step
        return step


def _wire(cam: FakeVendorCamera, vendor: str = "fake-vendor") -> VendorDeviceIO:
    return VendorDeviceIO(
        handle=cam,
        open_fn=lambda h: h.start(),
        close_fn=lambda h: h.stop(),
        grab_fn=lambda h, ms: h.grab_frame(ms),
        is_connected_fn=lambda h: h.is_streaming(),
        is_timeout=lambda e: isinstance(e, VendorTimeout),
        is_disconnect=lambda e: isinstance(e, VendorBusLoss),
        vendor=vendor,
    )


# --- Tests -----------------------------------------------------------------


def test_recovers_after_transient_timeout(caplog: pytest.LogCaptureFixture) -> None:
    """Timeout on attempt 1, success on attempt 2 (retry_budget=1)."""
    caplog.set_level(logging.WARNING)
    cam = FakeVendorCamera([VendorTimeout("t"), b"\xaa" * 8])
    driver = ReferenceCaptureDriver(io=_wire(cam), retry_budget=1)
    driver.arm()

    frame = driver.trigger(30)
    assert frame.payload == b"\xaa" * 8
    assert cam.grab_count == 2
    # Observability: warn line MUST appear — silent recovery is a bug.
    assert any("vendor_io.grab" in r.message and "E_CAP_GRAB_TIMEOUT" in r.message for r in caplog.records)
    driver.disarm()


def test_timeout_budget_exhausted_raises_typed_error() -> None:
    """Every attempt times out → HardwareTimeoutError bubbles up, never swallowed."""
    cam = FakeVendorCamera([VendorTimeout("t1"), VendorTimeout("t2")])
    driver = ReferenceCaptureDriver(io=_wire(cam), retry_budget=1)
    driver.arm()
    with pytest.raises(HardwareTimeoutError):
        driver.trigger(10)
    assert cam.grab_count == 2


def test_bus_loss_mid_stream_disarms_driver(caplog: pytest.LogCaptureFixture) -> None:
    """A vendor bus-loss during grab → DeviceDisconnectedError + driver disarmed."""
    caplog.set_level(logging.ERROR)
    cam = FakeVendorCamera([b"\x01" * 4, VendorBusLoss("USB reset")])
    driver = ReferenceCaptureDriver(io=_wire(cam), retry_budget=2)
    driver.arm()

    assert driver.trigger(20).payload == b"\x01" * 4
    with pytest.raises(DeviceDisconnectedError):
        driver.trigger(20)
    assert driver.is_armed is False, "driver must disarm on bus loss"
    assert any("vendor_io.grab" in r.message and "E_CAP_DISCONNECTED" in r.message for r in caplog.records)


def test_reconnect_cycle_after_bus_loss() -> None:
    """After bus loss, caller re-arms → driver reopens SDK stream and resumes."""
    cam = FakeVendorCamera([VendorBusLoss("drop"), b"\x02" * 4])
    driver = ReferenceCaptureDriver(io=_wire(cam), retry_budget=0)
    driver.arm()
    with pytest.raises(DeviceDisconnectedError):
        driver.trigger(20)
    # Recovery path — caller decides to re-arm; SDK stream must be reopened.
    driver.arm()
    assert cam.open_count == 2
    frame = driver.trigger(20)
    assert frame.payload == b"\x02" * 4


def test_trigger_before_arm_never_touches_sdk() -> None:
    """Not-ready guard fires before any vendor call — SDK sees zero grabs."""
    cam = FakeVendorCamera([b"never"])
    driver = ReferenceCaptureDriver(io=_wire(cam))
    with pytest.raises(Exception):
        driver.trigger(20)
    assert cam.grab_count == 0
    assert cam.open_count == 0


def test_unknown_vendor_exception_is_not_swallowed() -> None:
    """Unmapped SDK exception must surface untyped — never hidden."""

    class MysteryError(Exception):
        pass

    cam = FakeVendorCamera([MysteryError("wat")])
    driver = ReferenceCaptureDriver(io=_wire(cam), retry_budget=3)
    driver.arm()
    from app.capture.vendor_device_io import CaptureAdapterError
    with pytest.raises(CaptureAdapterError) as exc_info:
        driver.trigger(20)
    assert exc_info.value.code == "E_CAP_UNKNOWN"
