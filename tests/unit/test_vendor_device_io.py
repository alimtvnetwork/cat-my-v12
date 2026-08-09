"""Unit tests for `VendorDeviceIO`.

Covers the error-mapping contract: vendor SDK exceptions must translate
into typed `hardware_bridge` errors, never swallowed and never leaked
as raw vendor classes.
"""
from __future__ import annotations

import pytest

from app.capture.hardware_bridge import HardwareTimeoutError
from app.capture.reference_driver import (
    DeviceDisconnectedError,
    ReferenceCaptureDriver,
)
from app.capture.vendor_device_io import (
    CaptureAdapterError,
    E_CAP_UNKNOWN,
    VendorDeviceIO,
)


class _PylonTimeout(Exception):
    pass


class _PylonRuntime(Exception):
    pass


class _FakeCamera:
    def __init__(self, script: list) -> None:
        self.script = script
        self.opened = False
        self.grabs = 0

    def open(self) -> None:
        self.opened = True

    def close(self) -> None:
        self.opened = False

    def is_open(self) -> bool:
        return self.opened

    def grab_one(self, timeout_ms: int) -> bytes:
        self.grabs += 1
        step = self.script.pop(0)
        if isinstance(step, BaseException):
            raise step
        return step


def _make(cam: _FakeCamera) -> VendorDeviceIO:
    return VendorDeviceIO(
        handle=cam,
        open_fn=lambda h: h.open(),
        close_fn=lambda h: h.close(),
        grab_fn=lambda h, ms: h.grab_one(ms),
        is_connected_fn=lambda h: h.is_open(),
        is_timeout=lambda e: isinstance(e, _PylonTimeout),
        is_disconnect=lambda e: isinstance(e, _PylonRuntime),
        vendor="pylon-test",
    )


def test_open_grab_close_roundtrip() -> None:
    cam = _FakeCamera([b"\x01\x02\x03"])
    io = _make(cam)
    io.open()
    assert io.connected is True
    assert io.grab(50) == b"\x01\x02\x03"
    io.close()
    assert io.connected is False


def test_vendor_timeout_maps_to_hardware_timeout() -> None:
    cam = _FakeCamera([_PylonTimeout("frame timed out")])
    io = _make(cam)
    io.open()
    with pytest.raises(HardwareTimeoutError):
        io.grab(10)


def test_vendor_disconnect_maps_to_disconnected() -> None:
    cam = _FakeCamera([_PylonRuntime("USB reset")])
    io = _make(cam)
    io.open()
    with pytest.raises(DeviceDisconnectedError):
        io.grab(50)
    # after disconnect the adapter must report not connected
    assert io.connected is False


def test_unknown_vendor_error_wrapped_as_capture_adapter_error() -> None:
    class _Oddball(Exception):
        pass

    cam = _FakeCamera([_Oddball("mystery")])
    io = _make(cam)
    io.open()
    with pytest.raises(CaptureAdapterError) as ei:
        io.grab(50)
    assert ei.value.code == E_CAP_UNKNOWN
    assert isinstance(ei.value.__cause__, _Oddball)


def test_grab_before_open_raises_disconnected() -> None:
    cam = _FakeCamera([])
    io = _make(cam)
    with pytest.raises(DeviceDisconnectedError):
        io.grab(50)


def test_non_bytes_payload_rejected() -> None:
    cam = _FakeCamera(["not bytes"])  # type: ignore[list-item]
    io = _make(cam)
    io.open()
    with pytest.raises(TypeError):
        io.grab(50)


def test_binding_drives_reference_driver_end_to_end() -> None:
    cam = _FakeCamera([b"\x00" * 4, _PylonTimeout("t"), b"\xff" * 4])
    io = _make(cam)
    driver = ReferenceCaptureDriver(io=io, retry_budget=1)
    driver.arm()
    frame1 = driver.trigger(20)
    assert frame1.payload == b"\x00" * 4
    # timeout on first attempt, success on retry
    frame2 = driver.trigger(20)
    assert frame2.payload == b"\xff" * 4
    driver.disarm()
