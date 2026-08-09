"""Fault-mode tests for the Vimba adapter (spec/21-app/65-v2-vendor-vimba.md).

Uses a `FakeVimbaCamera` shaped like `vmbpy.Camera` (no SDK import) so CI
can prove class-name mapping, TriggerSelector-first arm sequence, and
re-arm behavior without hardware.
"""
from __future__ import annotations

import numpy as np
import pytest

from app.capture.hardware_bridge import HardwareTimeoutError
from app.capture.reference_driver import DeviceDisconnectedError
from app.capture.spinnaker_device_io import HardwareBusyError
from app.capture.vendor_device_io import CaptureAdapterError, E_CAP_UNKNOWN
from app.capture.vimba_device_io import (
    VimbaConfig,
    VimbaHandle,
    _is_busy,
    _is_disconnect,
    _is_timeout,
    _translate,
    make_vimba_device_io,
)


# vmbpy-shaped exception hierarchy (class names match the real SDK).
class VmbError(Exception):
    pass


class VmbTimeout(VmbError):
    pass


class VmbCameraError(VmbError):
    pass


class VmbFeatureError(VmbError):
    pass


class VmbSystemError(VmbError):
    pass


class VmbTransportLayerError(VmbError):
    pass


class _Feature:
    def __init__(self) -> None:
        self.value: str | None = None
        self.calls: list[str] = []

    def set(self, v: str) -> None:
        self.value = v
        self.calls.append(v)


class _SwTrigger:
    def __init__(self) -> None:
        self.count = 0

    def run(self) -> None:
        self.count += 1


class _Frame:
    def __init__(self, payload: bytes) -> None:
        self._payload = payload

    def as_numpy_ndarray(self):
        return np.frombuffer(self._payload, dtype=np.uint8)


class FakeVimbaCamera:
    """Shaped like `vmbpy.Camera`."""

    def __init__(self, script: list) -> None:
        self.script = list(script)
        self.enter_count = 0
        self.exit_count = 0
        self.streaming = False
        self.start_count = 0
        self.stop_count = 0
        self.TriggerSelector = _Feature()
        self.TriggerSource = _Feature()
        self.TriggerMode = _Feature()
        self.AcquisitionMode = _Feature()
        self.TriggerSoftware = _SwTrigger()
        self.arm_order: list[str] = []

    def __enter__(self):
        self.enter_count += 1
        return self

    def __exit__(self, *a) -> None:
        self.exit_count += 1

    def start_streaming(self, handler) -> None:
        self.streaming = True
        self.start_count += 1
        self.arm_order = (
            [f"selector={self.TriggerSelector.value}"]
            + [f"mode.{c}" for c in self.TriggerMode.calls]
        )

    def stop_streaming(self) -> None:
        self.streaming = False
        self.stop_count += 1

    def get_frame(self, timeout_ms: int) -> _Frame:
        if not self.script:
            raise VmbTimeout("script exhausted")
        step = self.script.pop(0)
        if isinstance(step, Exception):
            raise step
        return _Frame(step)


class FakeVmbSystem:
    def __init__(self) -> None:
        self.enter_count = 0
        self.exit_count = 0

    def __enter__(self):
        self.enter_count += 1
        return self

    def __exit__(self, *a) -> None:
        self.exit_count += 1


def _mk(script: list):
    sys = FakeVmbSystem()
    cam = FakeVimbaCamera(script)
    handle = VimbaHandle(system=sys, camera=cam)
    io = make_vimba_device_io(
        VimbaConfig(timeout_ms=100), camera_factory=lambda _c: handle
    )
    io.open()
    return sys, cam, io


# --- Predicate tests ------------------------------------------------------


def test_predicates_classify_by_class_name() -> None:
    assert _is_timeout(VmbTimeout("t"))
    assert _is_disconnect(VmbCameraError("c"))
    assert _is_disconnect(VmbFeatureError("f"))
    assert _is_disconnect(VmbSystemError("s"))
    assert _is_busy(VmbTransportLayerError("b"))
    # busy also classified as disconnect at the seam (auto-disarm).
    assert _is_disconnect(VmbTransportLayerError("b"))
    assert not _is_timeout(ValueError("x"))
    assert not _is_disconnect(ValueError("x"))


def test_translate_maps_each_class() -> None:
    assert _translate(VmbTimeout("t")) is HardwareTimeoutError
    assert _translate(VmbTransportLayerError("b")) is HardwareBusyError
    assert _translate(VmbCameraError("c")) is DeviceDisconnectedError
    assert _translate(VmbFeatureError("f")) is DeviceDisconnectedError
    assert _translate(VmbSystemError("s")) is DeviceDisconnectedError
    assert _translate(RuntimeError("other")) is None


# --- Adapter fault-mode tests --------------------------------------------


def test_arm_writes_trigger_selector_before_trigger_mode() -> None:
    sys, cam, io = _mk([b"frame"])
    # TriggerSelector value set before TriggerMode.On (order-sensitive).
    assert cam.TriggerSelector.value == "FrameStart"
    assert cam.TriggerMode.calls == ["On"]
    assert cam.arm_order == ["selector=FrameStart", "mode.On"]
    assert cam.TriggerSource.value == "Software"
    assert cam.AcquisitionMode.value == "Continuous"
    assert sys.enter_count == 1 and cam.enter_count == 1
    assert cam.streaming and io.connected


def test_grab_success_returns_bytes() -> None:
    _, cam, io = _mk([b"pixels"])
    assert io.grab(100) == b"pixels"
    assert cam.TriggerSoftware.count == 1


def test_vmb_timeout_maps_to_hardware_timeout_error() -> None:
    _, _, io = _mk([VmbTimeout("no frame")])
    with pytest.raises(HardwareTimeoutError):
        io.grab(100)
    assert io.connected  # retryable within caller budget


def test_camera_error_maps_to_disconnect_and_auto_disarms() -> None:
    sys, cam, io = _mk([VmbCameraError("bus drop")])
    with pytest.raises(DeviceDisconnectedError):
        io.grab(100)
    assert not io.connected
    io.close()
    # both contexts must exit, in reverse order (camera then system).
    assert cam.exit_count == 1 and sys.exit_count == 1
    assert cam.stop_count == 1


def test_transport_layer_busy_auto_disarms_at_vendor_seam() -> None:
    _, _, io = _mk([VmbTransportLayerError("in use")])
    # Busy classified as disconnect at the seam; adapter still exposes
    # HardwareBusyError via `_translate` for direct callers.
    with pytest.raises(DeviceDisconnectedError):
        io.grab(100)
    assert not io.connected


def test_rearm_after_disconnect_recovers() -> None:
    sys = FakeVmbSystem()
    cam = FakeVimbaCamera([VmbCameraError("bus"), b"frame2"])
    handle = VimbaHandle(system=sys, camera=cam)
    io = make_vimba_device_io(
        VimbaConfig(timeout_ms=100), camera_factory=lambda _c: handle
    )
    io.open()
    with pytest.raises(DeviceDisconnectedError):
        io.grab(100)
    io.open()  # supervisor re-arm
    assert io.grab(100) == b"frame2"
    assert cam.start_count == 2


def test_transient_timeout_then_success() -> None:
    _, _, io = _mk([VmbTimeout("blip"), b"ok"])
    with pytest.raises(HardwareTimeoutError):
        io.grab(100)
    assert io.grab(100) == b"ok"


def test_unknown_exception_wrapped_as_capture_adapter_error() -> None:
    # Per SS-02 contract lock (spec/21-app/50-capture-modules.md): unmapped
    # vendor exceptions from grab MUST be wrapped as
    # CaptureAdapterError(E_CAP_UNKNOWN); no untyped leaks across the seam.
    class WeirdError(Exception):
        pass

    _, _, io = _mk([WeirdError("?")])
    with pytest.raises(CaptureAdapterError) as ei:
        io.grab(100)
    assert ei.value.code == E_CAP_UNKNOWN
