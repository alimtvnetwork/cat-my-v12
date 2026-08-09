"""Fault-mode tests for the Spinnaker adapter (spec/21-app/64-v2-vendor-spinnaker.md).

Uses a `FakeSpinCamera` shaped like `PySpin.CameraPtr` (no real SDK import)
so CI can prove errorcode mapping, TriggerMode sequence, and re-arm
behavior without hardware.
"""
from __future__ import annotations

import pytest

from app.capture.hardware_bridge import HardwareTimeoutError
from app.capture.reference_driver import DeviceDisconnectedError
from app.capture.spinnaker_device_io import (
    GENICAM_ERR_ACCESS_DENIED,
    SPINNAKER_ERR_NOT_INITIALIZED,
    SPINNAKER_ERR_RESOURCE_IN_USE,
    SPINNAKER_ERR_TIMEOUT,
    HardwareBusyError,
    SpinnakerConfig,
    _is_busy,
    _is_disconnect,
    _is_timeout,
    _translate,
    make_spinnaker_device_io,
)


class SpinnakerException(Exception):
    def __init__(self, msg: str, errorcode: int) -> None:
        super().__init__(msg)
        self.errorcode = errorcode


class _Node:
    def __init__(self) -> None:
        self.value: str | None = None
        self.calls: list[str] = []

    def SetValue(self, v: str) -> None:
        self.value = v
        self.calls.append(v)


class _Trigger:
    def __init__(self) -> None:
        self.count = 0

    def Execute(self) -> None:
        self.count += 1


class _Image:
    def __init__(self, payload: bytes) -> None:
        self._payload = payload
        self.released = False

    def GetData(self) -> bytes:
        return self._payload

    def Release(self) -> None:
        self.released = True


class FakeSpinCamera:
    """Shaped like `PySpin.CameraPtr`."""

    def __init__(self, script: list) -> None:
        self.script = list(script)
        self._init = False
        self._streaming = False
        self.init_count = 0
        self.deinit_count = 0
        self.begin_count = 0
        self.end_count = 0
        self.TriggerMode = _Node()
        self.TriggerSource = _Node()
        self.AcquisitionMode = _Node()
        self.TriggerSoftware = _Trigger()
        self.last_images: list[_Image] = []

    def Init(self) -> None:
        self._init = True
        self.init_count += 1

    def DeInit(self) -> None:
        self._init = False
        self._streaming = False
        self.deinit_count += 1

    def IsInitialized(self) -> bool:
        return self._init

    def IsStreaming(self) -> bool:
        return self._streaming

    def BeginAcquisition(self) -> None:
        self._streaming = True
        self.begin_count += 1

    def EndAcquisition(self) -> None:
        self._streaming = False
        self.end_count += 1

    def GetNextImage(self, timeout_ms: int) -> _Image:
        if not self.script:
            raise SpinnakerException("script exhausted", SPINNAKER_ERR_TIMEOUT)
        step = self.script.pop(0)
        if isinstance(step, Exception):
            raise step
        img = _Image(step)
        self.last_images.append(img)
        return img


# --- Predicate tests ------------------------------------------------------


def test_predicates_classify_by_errorcode() -> None:
    assert _is_timeout(SpinnakerException("t", SPINNAKER_ERR_TIMEOUT))
    assert _is_disconnect(SpinnakerException("d", SPINNAKER_ERR_NOT_INITIALIZED))
    assert _is_disconnect(SpinnakerException("a", GENICAM_ERR_ACCESS_DENIED))
    assert _is_busy(SpinnakerException("b", SPINNAKER_ERR_RESOURCE_IN_USE))
    # busy is also disconnect-class at the VendorDeviceIO seam (auto-disarm).
    assert _is_disconnect(SpinnakerException("b", SPINNAKER_ERR_RESOURCE_IN_USE))
    # unrelated errorcodes stay unmapped.
    unknown = SpinnakerException("?", -9999)
    assert not _is_timeout(unknown) and not _is_disconnect(unknown)


def test_translate_maps_each_errorcode() -> None:
    assert _translate(SpinnakerException("t", SPINNAKER_ERR_TIMEOUT)) is HardwareTimeoutError
    assert _translate(SpinnakerException("b", SPINNAKER_ERR_RESOURCE_IN_USE)) is HardwareBusyError
    assert _translate(SpinnakerException("d", SPINNAKER_ERR_NOT_INITIALIZED)) is DeviceDisconnectedError
    assert _translate(SpinnakerException("a", GENICAM_ERR_ACCESS_DENIED)) is DeviceDisconnectedError
    assert _translate(ValueError("other")) is None


# --- Adapter fault-mode tests --------------------------------------------


def _mk(script: list) -> tuple[FakeSpinCamera, "VendorDeviceIO"]:  # noqa: F821
    cam = FakeSpinCamera(script)
    io = make_spinnaker_device_io(
        SpinnakerConfig(timeout_ms=100), camera_factory=lambda _c: cam
    )
    io.open()
    return cam, io


def test_open_runs_trigger_mode_sequence_and_begins_acquisition() -> None:
    cam, io = _mk([b"frame"])
    # Off -> configure source -> On (per Spinnaker requirement).
    assert cam.TriggerMode.calls == ["Off", "On"]
    assert cam.TriggerSource.value == "Software"
    assert cam.AcquisitionMode.value == "Continuous"
    assert cam.begin_count == 1 and cam.IsStreaming()
    assert io.connected


def test_grab_success_returns_bytes_and_releases_image() -> None:
    cam, io = _mk([b"pixels"])
    assert io.grab(100) == b"pixels"
    assert cam.TriggerSoftware.count == 1
    assert cam.last_images[-1].released is True


def test_timeout_errorcode_maps_to_hardware_timeout_error() -> None:
    _, io = _mk([SpinnakerException("no frame", SPINNAKER_ERR_TIMEOUT)])
    with pytest.raises(HardwareTimeoutError):
        io.grab(100)
    assert io.connected  # retryable within caller budget


def test_access_denied_maps_to_disconnect_and_auto_disarms() -> None:
    cam, io = _mk([SpinnakerException("denied", GENICAM_ERR_ACCESS_DENIED)])
    with pytest.raises(DeviceDisconnectedError):
        io.grab(100)
    assert not io.connected
    io.close()
    assert cam.deinit_count == 1


def test_resource_in_use_auto_disarms_at_vendor_seam() -> None:
    _, io = _mk([SpinnakerException("busy", SPINNAKER_ERR_RESOURCE_IN_USE)])
    # VendorDeviceIO raises its DeviceDisconnectedError (busy classified as
    # disconnect at the seam); adapter still exposes HardwareBusyError via
    # `_translate` for spec-compliant direct callers.
    with pytest.raises(DeviceDisconnectedError):
        io.grab(100)
    assert not io.connected


def test_rearm_after_disconnect_recovers() -> None:
    cam = FakeSpinCamera(
        [SpinnakerException("bus", SPINNAKER_ERR_NOT_INITIALIZED), b"frame2"]
    )
    io = make_spinnaker_device_io(
        SpinnakerConfig(timeout_ms=100), camera_factory=lambda _c: cam
    )
    io.open()
    with pytest.raises(DeviceDisconnectedError):
        io.grab(100)
    io.open()  # supervisor re-arm
    assert io.grab(100) == b"frame2"
    assert cam.begin_count == 2


def test_transient_timeout_then_success() -> None:
    _, io = _mk([SpinnakerException("blip", SPINNAKER_ERR_TIMEOUT), b"ok"])
    with pytest.raises(HardwareTimeoutError):
        io.grab(100)
    assert io.grab(100) == b"ok"


def test_unknown_errorcode_wrapped_as_capture_adapter_error() -> None:
    # Per SS-02 contract lock (spec/21-app/50 §VendorDeviceIO contract lock),
    # unmapped vendor exceptions are wrapped as CaptureAdapterError(E_CAP_UNKNOWN)
    # so callers never see a raw vendor class.
    from app.capture.vendor_device_io import CaptureAdapterError, E_CAP_UNKNOWN
    _, io = _mk([SpinnakerException("weird", -9999)])
    with pytest.raises(CaptureAdapterError) as ei:
        io.grab(100)
    assert ei.value.code == E_CAP_UNKNOWN
    assert ei.value.vendor == "spinnaker"

