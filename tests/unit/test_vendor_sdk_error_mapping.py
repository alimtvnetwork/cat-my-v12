"""Plan 17 Step 9a: per-vendor SDK error mapping.

Anchor: spec/21-app/68-v2-vendor-sdk-contract.md. Each vendor adapter's
`_translate` and `_is_*` predicates MUST map SDK-native exceptions into
the shared `E_CAP_*` taxonomy (`HardwareTimeoutError`,
`DeviceDisconnectedError`, `HardwareBusyError`) without leaking raw
vendor classes and without swallowing unknowns.
"""
from __future__ import annotations

import pytest

from app.capture.hardware_bridge import HardwareTimeoutError
from app.capture.reference_driver import DeviceDisconnectedError
from app.capture import pylon_device_io as pylon
from app.capture import spinnaker_device_io as spin
from app.capture import vimba_device_io as vimba
from app.capture.spinnaker_device_io import HardwareBusyError
from app.capture.vendor_device_io import (
    CaptureAdapterError,
    E_CAP_SDK_ABSENT,
)


# -- Pylon ------------------------------------------------------------

class TimeoutException(Exception):
    pass


class LogicalErrorException(Exception):
    pass


class RuntimeException(Exception):
    pass


def test_pylon_translate_timeout_and_disconnect_and_unknown() -> None:
    assert pylon._translate(TimeoutException("t")) is HardwareTimeoutError
    # RuntimeException is classified as retryable-timeout per anchor.
    assert pylon._translate(RuntimeException("r")) is HardwareTimeoutError
    assert pylon._translate(LogicalErrorException("d")) is DeviceDisconnectedError
    assert pylon._translate(ValueError("mystery")) is None


def test_pylon_default_factories_raise_sdk_absent() -> None:
    with pytest.raises(CaptureAdapterError) as ei:
        pylon._default_tl_factory()
    assert ei.value.code == E_CAP_SDK_ABSENT
    assert ei.value.vendor == "pylon"
    with pytest.raises(CaptureAdapterError) as ei2:
        pylon._default_camera_factory(pylon.PylonConfig())
    assert ei2.value.code == E_CAP_SDK_ABSENT


# -- Spinnaker --------------------------------------------------------

class _SpinExc(Exception):
    def __init__(self, code: int) -> None:
        super().__init__(f"spin errorcode={code}")
        self.errorcode = code


def test_spinnaker_translate_by_errorcode() -> None:
    assert spin._translate(_SpinExc(spin.SPINNAKER_ERR_TIMEOUT)) is HardwareTimeoutError
    assert spin._translate(_SpinExc(spin.SPINNAKER_ERR_RESOURCE_IN_USE)) is HardwareBusyError
    assert spin._translate(_SpinExc(spin.SPINNAKER_ERR_NOT_INITIALIZED)) is DeviceDisconnectedError
    assert spin._translate(_SpinExc(spin.GENICAM_ERR_ACCESS_DENIED)) is DeviceDisconnectedError
    assert spin._translate(_SpinExc(-99999)) is None


def test_spinnaker_translate_by_class_name_fallback() -> None:
    class SpinnakerTimeoutException(Exception):
        pass

    class ResourceInUseException(Exception):
        pass

    class AccessDeniedException(Exception):
        pass

    assert spin._translate(SpinnakerTimeoutException()) is HardwareTimeoutError
    assert spin._translate(ResourceInUseException()) is HardwareBusyError
    assert spin._translate(AccessDeniedException()) is DeviceDisconnectedError


def test_spinnaker_default_factories_raise_sdk_absent() -> None:
    with pytest.raises(CaptureAdapterError) as ei:
        spin._default_system_factory()
    assert ei.value.code == E_CAP_SDK_ABSENT
    assert ei.value.vendor == "spinnaker"
    with pytest.raises(CaptureAdapterError):
        spin._default_camera_factory(spin.SpinnakerConfig())


# -- Vimba ------------------------------------------------------------

def test_vimba_translate_by_class_name() -> None:
    class VmbTimeout(Exception):
        pass

    class VmbCameraError(Exception):
        pass

    class VmbTransportLayerError(Exception):
        pass

    assert vimba._translate(VmbTimeout()) is HardwareTimeoutError
    assert vimba._translate(VmbTransportLayerError()) is HardwareBusyError
    assert vimba._translate(VmbCameraError()) is DeviceDisconnectedError
    assert vimba._translate(RuntimeError("mystery")) is None


def test_vimba_default_factories_raise_sdk_absent() -> None:
    with pytest.raises(CaptureAdapterError) as ei:
        vimba._default_system_factory()
    assert ei.value.code == E_CAP_SDK_ABSENT
    assert ei.value.vendor == "vimba"
    with pytest.raises(CaptureAdapterError):
        vimba._default_camera_factory(vimba.VimbaConfig())
