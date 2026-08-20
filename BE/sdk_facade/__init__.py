"""SDK facade package: the ONLY BE surface that may touch raw vendor SDKs.

Per `spec/21-app/52-sdk-facade-pattern.md`: routes, workers, and repos import
`SdkFacade` from here, never `sdk/**` directly (violations raise
`E_BUG_SDK_LEAK`). Vendor handles (device pointers, file descriptors,
stream objects) MUST NOT escape this package; facades return plain
dataclasses / bytes / typed value objects.

Protocol surface (Plan 88 Step 21, expanded to match `sdk/daheng-galaxy-sdk-manual.md`):

    SdkFacade      - top-level container: .camera, .storage, .version
    CameraFacade   - Daheng MERCURY2-shaped surface: enumerate, open/close,
                     stream on/off, grab, exposure/gain/ROI/pixel-format/
                     trigger, opto-isolated I/O read/write. See manual §2.
    StorageFacade  - blob put/get. Impl: `BE.sdk_facade.storage.InMemoryStorageFacade`.

Guideline conflict note: `sdk/daheng-galaxy-sdk-manual.md` §8 suggests mapping
camera errors to `E_BE_*` (including a non-existent `E_BE_TIMEOUT`). The
folder spec `spec/21-app/40-error-manage.md` + `BE/errors/codes.py` reserves
the `E_CAM_*` family for facade errors and is authoritative. Manual guidance
was adapted: NOT_FOUND -> E_CAM_NOT_CONNECTED, TIMEOUT -> E_CAM_TIMEOUT,
CAPTURE/BANDWIDTH/USB -> E_CAM_CAPTURE_FAILED, param out-of-range ->
E_BE_BAD_REQUEST.

`SDK_FACADE_VERSION` is the wire value returned by `GET /meta.sdkFacadeVersion`;
FE (Step 30-33) uses it to gate features on the running facade contract. Bump
on any Protocol signature change so old clients fail fast.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum, StrEnum
from typing import Any, Literal, Protocol, runtime_checkable

# Bumped from 0.2.0-protocol: CameraFacade signature expanded to full manual §2 surface.
SDK_FACADE_VERSION = "0.3.0-protocol"


class PixelFormat(StrEnum):
    """Normalized pixel formats. Adapter translates to vendor `PixelFormat` node."""

    Mono8 = "Mono8"
    Mono10 = "Mono10"
    Mono12 = "Mono12"
    BayerRg8 = "BayerRg8"
    Rgb8 = "Rgb8"


class TriggerMode(StrEnum):
    Off = "Off"  # continuous free-run
    On = "On"


class TriggerSource(StrEnum):
    Software = "Software"
    Line0 = "Line0"
    Line2 = "Line2"
    Line3 = "Line3"
    Counter = "Counter"


class TriggerActivation(StrEnum):
    RisingEdge = "RisingEdge"
    FallingEdge = "FallingEdge"
    AnyEdge = "AnyEdge"


@dataclass(frozen=True)
class DeviceInfo:
    """Enumeration entry. Manual §2: `{serial, model, vendor, interface}`."""

    serial: str
    model: str
    vendor: str
    interface: str
    status: str = "ready"


@dataclass(frozen=True)
class Roi:
    x: int
    y: int
    width: int
    height: int


@dataclass(frozen=True)
class Frame:
    """One captured frame. Bytes are raw pixel buffer in `pixel_format`."""

    data: bytes
    width: int
    height: int
    pixel_format: PixelFormat
    timestamp_ns: int
    frame_id: int


@runtime_checkable
class CameraFacade(Protocol):
    """Vendor-agnostic camera surface, mirroring `sdk/daheng-galaxy-sdk-manual.md` §2.

    Concrete adapter today: `BE.sdk_facade.camera.InMemoryCameraFacade`.
    Real Daheng adapter lands post-Plan-88 (see Step 130+).
    """

    # --- enumeration & lifecycle ---
    def list_devices(self) -> list[DeviceInfo]: ...
    def open(self, serial: str) -> None: ...
    def close(self) -> None: ...

    # --- streaming & capture ---
    def start_stream(self) -> None: ...
    def stop_stream(self) -> None: ...
    def grab(self, timeout_ms: int) -> Frame: ...

    # --- sensor config ---
    def set_exposure(self, microseconds: int) -> None: ...
    def set_gain(self, decibels: float) -> None: ...
    def set_roi(self, roi: Roi) -> None: ...
    def set_pixel_format(self, fmt: PixelFormat) -> None: ...

    # --- trigger model ---
    def set_trigger(
        self,
        mode: TriggerMode,
        source: TriggerSource = TriggerSource.Software,
        activation: TriggerActivation = TriggerActivation.RisingEdge,
    ) -> None: ...
    def execute_software_trigger(self) -> None: ...

    # --- opto-isolated I/O ---
    def read_line_status(self, line: str) -> bool: ...
    def set_line_output(self, line: str, on: bool) -> None: ...


@runtime_checkable
class StorageFacade(Protocol):
    """Vendor-agnostic storage surface. Real impl lands in Step 22."""

    def put(self, key: str, data: bytes) -> None: ...
    def get(self, key: str) -> bytes: ...


@runtime_checkable
class SdkFacade(Protocol):
    """Top-level facade container. Routes/workers depend on THIS, not vendors."""

    version: str
    camera: CameraFacade
    storage: StorageFacade


__all__ = [
    "SDK_FACADE_VERSION",
    "SdkFacade",
    "CameraFacade",
    "StorageFacade",
    "PixelFormat",
    "TriggerMode",
    "TriggerSource",
    "TriggerActivation",
    "DeviceInfo",
    "Roi",
    "Frame",
    "get_camera_facade",
]

def get_camera_facade(provider: Literal["inmemory", "daheng", "replay"] = "inmemory") -> CameraFacade:
    """
    Factory returning the requested CameraFacade implementation.
    """
    if provider == "daheng":
        from BE.sdk_facade.vendors.daheng.facade import DahengCameraFacade
        return DahengCameraFacade()
    if provider == "replay":
        from BE.sdk_facade.vendors.replay.facade import ReplayCameraFacade
        return ReplayCameraFacade()
    from BE.sdk_facade.camera import InMemoryCameraFacade
    return InMemoryCameraFacade()


# Back-compat: prior consumers imported dict-shaped devices. Adapters should
# migrate to `DeviceInfo`; no dict alias is exported to force the type check.


def _placeholder_prevent_unused(_: Any) -> None:  # pragma: no cover
    """Silences unused-import checks in downstream tooling if needed."""
