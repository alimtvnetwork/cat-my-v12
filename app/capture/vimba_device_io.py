"""Allied Vision Vimba (`vmbpy`) adapter behind `VendorDeviceIO`.

Anchor: spec/21-app/65-v2-vendor-vimba.md. `vmbpy` is imported lazily inside
the factory so unit tests stay hermetic; a `camera_factory` override lets
tests inject a fake `vmbpy.Camera`-shaped object without touching the SDK.

Vimba exposes both `VmbSystem` and `Camera` as context managers, so the
handle bundles both and `_close` exits them in reverse order. Exception
classes from `vmbpy.error` are matched by class-name MRO (predicate style)
because we cannot import the SDK in this sandbox and future `vmbpy`
builds may add wrapper classes. Per SS-02 contract lock
(spec/21-app/50-capture-modules.md), unmapped exceptions from `grab` are
wrapped by `VendorDeviceIO._normalize` as `CaptureAdapterError(E_CAP_UNKNOWN)`;
no untyped exception ever crosses the seam.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

from app.capture.hardware_bridge import HardwareTimeoutError
from app.capture.reference_driver import DeviceDisconnectedError
from app.capture.spinnaker_device_io import HardwareBusyError  # reused per anchor
from app.capture.vendor_device_io import (
    CaptureAdapterError,
    E_CAP_SDK_ABSENT,
    VendorDeviceDescriptor,
    VendorDeviceIO,
)

logger = logging.getLogger(__name__)

VENDOR = "vimba"
DEFAULT_TIMEOUT_MS = 5000

# `vmbpy.error` class names (spec anchor §Exception mapping).
_TIMEOUT_NAMES = {"VmbTimeout"}
_DISCONNECT_NAMES = {"VmbCameraError", "VmbFeatureError", "VmbSystemError"}
_BUSY_NAMES = {"VmbTransportLayerError"}


def _class_names(exc: BaseException) -> set[str]:
    return {c.__name__ for c in type(exc).__mro__}


def _is_timeout(exc: BaseException) -> bool:
    return bool(_class_names(exc) & _TIMEOUT_NAMES)


def _is_busy(exc: BaseException) -> bool:
    return bool(_class_names(exc) & _BUSY_NAMES)


def _is_disconnect(exc: BaseException) -> bool:
    """Busy counts as disconnect at the VendorDeviceIO seam so the adapter
    auto-disarms; `_translate` preserves the distinct `HardwareBusyError`."""
    if _is_busy(exc):
        return True
    return bool(_class_names(exc) & _DISCONNECT_NAMES)


@dataclass(frozen=True)
class VimbaConfig:
    serial: Optional[str] = None
    timeout_ms: int = DEFAULT_TIMEOUT_MS


@dataclass
class VimbaHandle:
    """Bundles the `VmbSystem` context and its opened `Camera`."""

    system: Any
    camera: Any
    _system_entered: bool = field(default=False)
    _camera_entered: bool = field(default=False)


def _open(h: VimbaHandle) -> None:
    # Enter VmbSystem first, then the Camera; order is enforced by vmbpy.
    h.system.__enter__()
    h._system_entered = True
    h.camera.__enter__()
    h._camera_entered = True
    _arm(h.camera)


def _close(h: VimbaHandle) -> None:
    # Reverse-order teardown; both exits are best-effort but the second must
    # still run even if the first raises, otherwise the transport-layer
    # handle stays locked and a second `open()` deadlocks.
    try:
        if h._camera_entered:
            try:
                h.camera.stop_streaming()
            except BaseException:  # streaming may already be stopped
                pass
            try:
                h.camera.TriggerMode.set("Off")
            except BaseException:
                pass
            h.camera.__exit__(None, None, None)
            h._camera_entered = False
    finally:
        if h._system_entered:
            h.system.__exit__(None, None, None)
            h._system_entered = False


def _arm(cam: Any) -> None:
    # TriggerSelector MUST be written before TriggerMode; some models default
    # to `AcquisitionStart` and silently drop frames when TriggerMode=On.
    cam.TriggerSelector.set("FrameStart")
    cam.TriggerSource.set("Software")
    cam.TriggerMode.set("On")
    cam.AcquisitionMode.set("Continuous")
    cam.start_streaming(_noop_handler)


def _noop_handler(cam: Any, stream: Any, frame: Any) -> None:  # pragma: no cover
    """Streaming callback placeholder; polled path uses `get_frame` instead."""


def _grab(h: VimbaHandle, deadline_ms: int) -> bytes:
    """Software-trigger + retrieve. Buffer ownership (spec/21-app/68):
    copy the SDK-owned frame BEFORE returning it to the queue so no
    vendor-thread reference escapes.
    """
    cam = h.camera
    cam.TriggerSoftware.run()
    frame = cam.get_frame(deadline_ms)
    try:
        arr = frame.as_numpy_ndarray()
        payload = arr.tobytes() if hasattr(arr, "tobytes") else bytes(arr)
        return payload
    finally:
        queue_frame = getattr(cam, "queue_frame", None)
        if callable(queue_frame):
            try:
                queue_frame(frame)
            except BaseException:
                # queueing after single-shot capture is best-effort; the
                # frame is dropped either way and the outer close() will
                # reclaim the transport layer.
                pass


def _is_connected(h: VimbaHandle) -> bool:
    try:
        return bool(h._camera_entered and h._system_entered)
    except BaseException:
        return False


def _call_text(obj: Any, name: str, fallback: str = "") -> str:
    attr = getattr(obj, name, None)
    value = attr() if callable(attr) else attr
    return str(value) if value is not None else fallback


def list_vimba_devices(
    config: VimbaConfig | None = None,
    *,
    system_factory: Callable[[], Any] | None = None,
) -> list[VendorDeviceDescriptor]:
    system = (system_factory or _default_system_factory)()
    with system:
        return [_vimba_descriptor(cam) for cam in system.get_all_cameras()]


def _vimba_descriptor(cam: Any) -> VendorDeviceDescriptor:
    serial = _call_text(cam, "get_id")
    model = _call_text(cam, "get_model", _call_text(cam, "get_name"))
    return VendorDeviceDescriptor(VENDOR, serial, model, _call_text(cam, "get_interface_id"), serial)


def make_vimba_device_io(
    config: VimbaConfig | None = None,
    *,
    camera_factory: Callable[[VimbaConfig], VimbaHandle] | None = None,
) -> VendorDeviceIO:
    """Build a `VendorDeviceIO` for Allied Vision Vimba.

    `camera_factory` overrides real-SDK instantiation for tests. Production
    default resolves `VmbSystem.get_instance().get_all_cameras()[0]` (or
    `get_camera_by_id(serial)`) and returns a `VimbaHandle`.
    """
    cfg = config or VimbaConfig()
    handle = (camera_factory or _default_camera_factory)(cfg)
    logger.info(
        "vimba.factory.built serial=%s timeout_ms=%d", cfg.serial, cfg.timeout_ms
    )

    return VendorDeviceIO(
        handle=handle,
        open_fn=_open,
        close_fn=_close,
        grab_fn=_grab,
        is_connected_fn=_is_connected,
        is_timeout=_is_timeout,
        is_disconnect=_is_disconnect,
        vendor=VENDOR,
        list_devices_fn=lambda: list_vimba_devices(cfg),
    )


def _default_system_factory() -> Any:  # pragma: no cover - SDK-only
    try:
        import vmbpy  # type: ignore
    except ImportError as exc:
        raise CaptureAdapterError(
            E_CAP_SDK_ABSENT, VENDOR, "vmbpy not importable"
        ) from exc
    return vmbpy.VmbSystem.get_instance()


def _default_camera_factory(cfg: VimbaConfig) -> VimbaHandle:  # pragma: no cover - SDK-only
    try:
        import vmbpy  # type: ignore  # noqa: F401
    except ImportError as exc:
        raise CaptureAdapterError(
            E_CAP_SDK_ABSENT, VENDOR, "vmbpy not importable"
        ) from exc

    system = _default_system_factory()
    # System must be entered to enumerate cameras; entry happens in _open, so
    # we return a not-yet-entered handle. Resolving the camera reference does
    # not require the context to be active in vmbpy >= 1.0.
    if cfg.serial:
        cam = system.get_camera_by_id(cfg.serial)
    else:
        with system:
            cams = system.get_all_cameras()
            if not cams:
                raise DeviceDisconnectedError("vimba: no cameras enumerated")
            cam = cams[0]
    return VimbaHandle(system=system, camera=cam)


def _translate(exc: BaseException) -> type[BaseException] | None:
    """Public per spec/21-app/65-v2-vendor-vimba.md §Exception mapping.

    Returns the typed error class for a `vmbpy` exception, or `None` when
    the exception is not one we recognize. Direct callers get `None`; the
    `VendorDeviceIO` seam wraps such cases as `CaptureAdapterError(E_CAP_UNKNOWN)`.
    """
    if _is_timeout(exc):
        return HardwareTimeoutError
    if _is_busy(exc):
        return HardwareBusyError
    if _is_disconnect(exc):
        return DeviceDisconnectedError
    return None
