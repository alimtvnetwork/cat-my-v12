"""Vendor discovery tests for v2 Phase 3."""
from __future__ import annotations

from app.capture.pylon_device_io import list_pylon_devices
from app.capture.spinnaker_device_io import list_spinnaker_devices
from app.capture.vimba_device_io import list_vimba_devices


class _ValueNode:
    def __init__(self, value: str) -> None:
        self.value = value

    def GetValue(self) -> str:
        return self.value


class _PylonInfo:
    def GetSerialNumber(self) -> str: return "P-01"
    def GetModelName(self) -> str: return "ace2"
    def GetDeviceClass(self) -> str: return "GigE"


class _PylonTl:
    def EnumerateDevices(self) -> list[_PylonInfo]: return [_PylonInfo()]


def test_pylon_discovery_maps_device_info() -> None:
    rows = list_pylon_devices(tl_factory=lambda: _PylonTl())
    assert rows[0].vendor == "pylon"
    assert rows[0].serial == "P-01"
    assert rows[0].model == "ace2"


class _SpinDevice:
    DeviceSerialNumber = _ValueNode("S-01")
    DeviceModelName = _ValueNode("Blackfly S")
    DeviceType = _ValueNode("USB3")


class _SpinList:
    def GetSize(self) -> int: return 1
    def GetByIndex(self, index: int) -> _SpinDevice: return _SpinDevice()
    def Clear(self) -> None: self.cleared = True


class _SpinSystem:
    def GetCameras(self) -> _SpinList: return _SpinList()
    def ReleaseInstance(self) -> None: self.released = True


def test_spinnaker_discovery_maps_tl_device_nodes() -> None:
    rows = list_spinnaker_devices(system_factory=lambda: _SpinSystem())
    assert rows[0].vendor == "spinnaker"
    assert rows[0].serial == "S-01"
    assert rows[0].transport == "USB3"


class _VimbaCamera:
    def get_id(self) -> str: return "V-01"
    def get_model(self) -> str: return "Alvium"
    def get_interface_id(self) -> str: return "GigE"


class _VimbaSystem:
    def __enter__(self): return self
    def __exit__(self, *args) -> None: self.closed = True
    def get_all_cameras(self) -> list[_VimbaCamera]: return [_VimbaCamera()]


def test_vimba_discovery_maps_camera_methods() -> None:
    rows = list_vimba_devices(system_factory=lambda: _VimbaSystem())
    assert rows[0].vendor == "vimba"
    assert rows[0].serial == "V-01"
    assert rows[0].model == "Alvium"