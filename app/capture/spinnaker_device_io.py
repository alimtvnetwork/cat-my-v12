"""FLIR Spinnaker (PySpin) adapter behind `VendorDeviceIO`.

Anchor: spec/21-app/64-v2-vendor-spinnaker.md. PySpin is imported lazily inside
the factory so unit tests stay hermetic; a `camera_factory` override lets
tests inject a fake `PySpin.CameraPtr`-shaped object without touching the
real SDK.

Exception mapping is centralized in `_translate` per the anchor. PySpin
raises a single `SpinnakerException` with a numeric `errorcode`; predicates
inspect `errorcode` first and fall back to class-name matching for wrapper
exceptions that PySpin may raise under different builds. Anything unmapped
is wrapped by `VendorDeviceIO._normalize` into
`CaptureAdapterError(E_CAP_UNKNOWN)` (SS-02 contract lock, spec 50) so no
raw vendor class escapes and unknown failures are never silently swallowed.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Callable, Optional

from app.capture.hardware_bridge import HardwareTimeoutError
from app.capture.reference_driver import DeviceDisconnectedError
from app.capture.vendor_device_io import (
    CaptureAdapterError,
    E_CAP_SDK_ABSENT,
    VendorDeviceDescriptor,
    VendorDeviceIO,
)

logger = logging.getLogger(__name__)

VENDOR = "spinnaker"
DEFAULT_TIMEOUT_MS = 5000

# Spinnaker errorcodes (spec anchor §Exception mapping).
SPINNAKER_ERR_TIMEOUT = -1011
SPINNAKER_ERR_NOT_INITIALIZED = -1002
SPINNAKER_ERR_RESOURCE_IN_USE = -1004
GENICAM_ERR_ACCESS_DENIED = -2006

_TIMEOUT_CODES = frozenset({SPINNAKER_ERR_TIMEOUT})
_DISCONNECT_CODES = frozenset({SPINNAKER_ERR_NOT_INITIALIZED, GENICAM_ERR_ACCESS_DENIED})
_BUSY_CODES = frozenset({SPINNAKER_ERR_RESOURCE_IN_USE})

# Fallback class-name predicates for wrapper exceptions.
_TIMEOUT_NAMES = {"SpinnakerTimeoutException"}
_DISCONNECT_NAMES = {"SpinnakerNotInitializedException", "AccessDeniedException"}
_BUSY_NAMES = {"ResourceInUseException"}


class HardwareBusyError(DeviceDisconnectedError):
    """`E_HW_BUSY`: camera reachable but claimed by another process.

    Subclasses `DeviceDisconnectedError` so `VendorDeviceIO.grab` treats it
    as a disconnect (auto-disarm), while `_translate` still returns the
    distinct type for spec-compliant callers.
    """

    code: str = "E_HW_BUSY"


def _errorcode(exc: BaseException) -> Optional[int]:
    code = getattr(exc, "errorcode", None)
    return int(code) if isinstance(code, int) else None


def _class_names(exc: BaseException) -> set[str]:
    return {c.__name__ for c in type(exc).__mro__}


def _is_timeout(exc: BaseException) -> bool:
    code = _errorcode(exc)
    if code is not None and code in _TIMEOUT_CODES:
        return True
    return bool(_class_names(exc) & _TIMEOUT_NAMES)


def _is_busy(exc: BaseException) -> bool:
    code = _errorcode(exc)
    if code is not None and code in _BUSY_CODES:
        return True
    return bool(_class_names(exc) & _BUSY_NAMES)


def _is_disconnect(exc: BaseException) -> bool:
    """Busy counts as disconnect for the VendorDeviceIO seam so the adapter
    auto-disarms; `_translate` preserves the distinct `HardwareBusyError`."""
    if _is_busy(exc):
        return True
    code = _errorcode(exc)
    if code is not None and code in _DISCONNECT_CODES:
        return True
    return bool(_class_names(exc) & _DISCONNECT_NAMES)


@dataclass(frozen=True)
class SpinnakerConfig:
    serial: Optional[str] = None
    timeout_ms: int = DEFAULT_TIMEOUT_MS


def _open(cam: Any) -> None:
    cam.Init()


def _close(cam: Any) -> None:
    try:
        if getattr(cam, "IsStreaming", lambda: False)():
            cam.EndAcquisition()
    finally:
        cam.DeInit()


def _arm(cam: Any) -> None:
    # Spinnaker requires TriggerMode Off before reconfiguring source, then On.
    cam.TriggerMode.SetValue("Off")
    cam.TriggerSource.SetValue("Software")
    cam.TriggerMode.SetValue("On")
    cam.AcquisitionMode.SetValue("Continuous")
    cam.BeginAcquisition()


def _grab(cam: Any, deadline_ms: int) -> bytes:
    """Software-trigger + retrieve. Buffer ownership (spec/21-app/68):
    copy the SDK-owned bytes BEFORE `image.Release()` so no vendor-thread
    reference escapes.
    """
    cam.TriggerSoftware.Execute()
    image = cam.GetNextImage(deadline_ms)
    try:
        payload = getattr(image, "GetData", lambda: image)()
        if isinstance(payload, (bytes, bytearray)):
            payload = bytes(payload)
        elif isinstance(payload, memoryview):
            payload = bytes(payload)
        else:
            # numpy ndarray or similar SDK-backed buffer: force a copy.
            tobytes = getattr(payload, "tobytes", None)
            payload = tobytes() if callable(tobytes) else bytes(payload)
        return payload
    finally:
        release = getattr(image, "Release", None)
        if callable(release):
            release()


def _is_connected(cam: Any) -> bool:
    try:
        # `IsInitialized` in real PySpin; some wrappers expose `IsValid`.
        probe = getattr(cam, "IsInitialized", None) or getattr(cam, "IsValid", None)
        return bool(probe()) if callable(probe) else False
    except BaseException:
        return False


def _node_text(root: Any, node: str, fallback: str = "") -> str:
    value = getattr(getattr(root, "TLDevice", root), node, None)
    getter = getattr(value, "GetValue", None)
    raw = getter() if callable(getter) else value
    return str(raw) if raw is not None else fallback


def list_spinnaker_devices(
    config: SpinnakerConfig | None = None,
    *,
    system_factory: Callable[[], Any] | None = None,
) -> list[VendorDeviceDescriptor]:
    system = (system_factory or _default_system_factory)()
    cameras = system.GetCameras()
    return _read_spinnaker_cameras(cameras, system)


def _read_spinnaker_cameras(cameras: Any, system: Any) -> list[VendorDeviceDescriptor]:
    try:
        return [_spin_descriptor(cameras.GetByIndex(i)) for i in range(cameras.GetSize())]
    finally:
        getattr(cameras, "Clear", lambda: None)()
        getattr(system, "ReleaseInstance", lambda: None)()


def _spin_descriptor(cam: Any) -> VendorDeviceDescriptor:
    serial = _node_text(cam, "DeviceSerialNumber")
    model = _node_text(cam, "DeviceModelName")
    return VendorDeviceDescriptor(VENDOR, serial, model, _node_text(cam, "DeviceType"), serial)


def make_spinnaker_device_io(
    config: SpinnakerConfig | None = None,
    *,
    camera_factory: Callable[[SpinnakerConfig], Any] | None = None,
) -> VendorDeviceIO:
    """Build a `VendorDeviceIO` for FLIR Spinnaker.

    `camera_factory` overrides real-SDK instantiation for tests. Production
    default resolves `System.GetInstance().GetCameras().GetByIndex(0)` (or
    pinned serial) and returns the `CameraPtr`.
    """
    cfg = config or SpinnakerConfig()
    cam = (camera_factory or _default_camera_factory)(cfg)
    logger.info(
        "spinnaker.factory.built serial=%s timeout_ms=%d", cfg.serial, cfg.timeout_ms
    )

    def _open_and_arm(c: Any) -> None:
        _open(c)
        _arm(c)

    return VendorDeviceIO(
        handle=cam,
        open_fn=_open_and_arm,
        close_fn=_close,
        grab_fn=_grab,
        is_connected_fn=_is_connected,
        is_timeout=_is_timeout,
        is_disconnect=_is_disconnect,
        vendor=VENDOR,
        list_devices_fn=lambda: list_spinnaker_devices(cfg),
    )


def _default_system_factory() -> Any:  # pragma: no cover - SDK-only
    try:
        import PySpin  # type: ignore
    except ImportError as exc:
        raise CaptureAdapterError(
            E_CAP_SDK_ABSENT, VENDOR, "PySpin not importable"
        ) from exc
    return PySpin.System.GetInstance()


def _default_camera_factory(cfg: SpinnakerConfig) -> Any:  # pragma: no cover - SDK-only
    try:
        import PySpin  # type: ignore  # noqa: F401
    except ImportError as exc:
        raise CaptureAdapterError(
            E_CAP_SDK_ABSENT, VENDOR, "PySpin not importable"
        ) from exc

    system = _default_system_factory()
    cameras = system.GetCameras()
    if cfg.serial:
        cam = cameras.GetBySerial(cfg.serial)
    else:
        cam = cameras.GetByIndex(0)
    return cam


def _translate(exc: BaseException) -> type[BaseException] | None:
    """Public per spec/21-app/64-v2-vendor-spinnaker.md §Exception mapping.

    Returns the typed error class for a Spinnaker exception, or `None` when
    the exception is not one we recognize (caller must re-raise untyped).
    """
    if _is_timeout(exc):
        return HardwareTimeoutError
    if _is_busy(exc):
        return HardwareBusyError
    if _is_disconnect(exc):
        return DeviceDisconnectedError
    return None
