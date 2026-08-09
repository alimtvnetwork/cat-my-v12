"""Fault-mode tests for the Pylon adapter (spec/21-app/63-v2-vendor-pylon.md).

Uses a `FakePylonCamera` shaped like `pypylon.pylon.InstantCamera` — no
real SDK import — so CI can prove exception mapping and re-arm behavior
without hardware.
"""
from __future__ import annotations

import pytest

from app.capture.hardware_bridge import HardwareTimeoutError
from app.capture.pylon_device_io import (
    PylonConfig,
    _is_disconnect,
    _is_timeout,
    _translate,
    make_pylon_device_io,
)
from app.capture.reference_driver import DeviceDisconnectedError


# --- Fake pypylon exception classes (name-matched by the adapter) ----------


class TimeoutException(Exception):
    pass


class RuntimeException(Exception):
    pass


class LogicalErrorException(Exception):
    pass


class _GrabResult:
    def __init__(self, payload: bytes) -> None:
        self.Array = payload


class FakePylonCamera:
    """Shaped like `pypylon.pylon.InstantCamera`. Each `RetrieveResult`
    pops one script step: bytes → success, Exception → raised."""

    def __init__(self, script: list) -> None:
        self.script = list(script)
        self._open = False
        self._grabbing = False
        self.open_count = 0
        self.close_count = 0
        self.trigger_count = 0

    def Open(self) -> None:
        self._open = True
        self.open_count += 1

    def Close(self) -> None:
        self._open = False
        self._grabbing = False
        self.close_count += 1

    def IsOpen(self) -> bool:
        return self._open

    def IsGrabbing(self) -> bool:
        return self._grabbing

    def StartGrabbing(self) -> None:
        self._grabbing = True

    def StopGrabbing(self) -> None:
        self._grabbing = False

    def ExecuteSoftwareTrigger(self) -> None:
        self.trigger_count += 1

    def RetrieveResult(self, timeout_ms: int) -> _GrabResult:
        if not self.script:
            raise TimeoutException("script exhausted")
        step = self.script.pop(0)
        if isinstance(step, Exception):
            raise step
        return _GrabResult(step)


# --- Predicate tests -------------------------------------------------------


def test_predicates_match_pylon_class_names() -> None:
    assert _is_timeout(TimeoutException("x"))
    assert _is_timeout(RuntimeException("grab"))  # retry class
    assert _is_disconnect(LogicalErrorException("bus"))
    assert not _is_timeout(LogicalErrorException("bus"))
    assert not _is_disconnect(TimeoutException("x"))


def test_translate_maps_to_typed_errors() -> None:
    assert _translate(TimeoutException("x")) is HardwareTimeoutError
    assert _translate(LogicalErrorException("bus")) is DeviceDisconnectedError
    assert _translate(ValueError("other")) is None


# --- Adapter fault-mode tests ---------------------------------------------


def _mk(script: list) -> tuple[FakePylonCamera, "VendorDeviceIO"]:  # noqa: F821
    cam = FakePylonCamera(script)
    io = make_pylon_device_io(PylonConfig(timeout_ms=100), camera_factory=lambda _c: cam)
    io.open()
    return cam, io


def test_open_arms_grabbing() -> None:
    cam, io = _mk([b"frame"])
    assert cam.open_count == 1 and cam.IsGrabbing()
    assert io.connected


def test_grab_success_returns_bytes() -> None:
    _, io = _mk([b"pixels"])
    assert io.grab(100) == b"pixels"


def test_timeout_maps_to_hardware_timeout_error() -> None:
    _, io = _mk([TimeoutException("no frame")])
    with pytest.raises(HardwareTimeoutError):
        io.grab(100)
    # Adapter stays open so caller can retry within its budget.
    assert io.connected


def test_runtime_exception_is_retry_class_timeout() -> None:
    _, io = _mk([RuntimeException("grab fail")])
    with pytest.raises(HardwareTimeoutError):
        io.grab(100)


def test_bus_loss_maps_to_disconnect_and_auto_disarms() -> None:
    cam, io = _mk([LogicalErrorException("bus")])
    with pytest.raises(DeviceDisconnectedError):
        io.grab(100)
    # VendorDeviceIO drops `_open` on disconnect; `connected` must be False.
    assert not io.connected
    # Close is still safe after disconnect.
    io.close()
    assert cam.close_count == 1


def test_rearm_after_disconnect_recovers() -> None:
    cam = FakePylonCamera([LogicalErrorException("bus"), b"frame2"])
    io = make_pylon_device_io(PylonConfig(timeout_ms=100), camera_factory=lambda _c: cam)
    io.open()
    with pytest.raises(DeviceDisconnectedError):
        io.grab(100)
    # Re-arm: re-open the adapter (production supervisor calls open() again).
    io.open()
    assert io.grab(100) == b"frame2"


def test_transient_timeout_then_success() -> None:
    _, io = _mk([TimeoutException("blip"), b"ok"])
    with pytest.raises(HardwareTimeoutError):
        io.grab(100)
    assert io.grab(100) == b"ok"
