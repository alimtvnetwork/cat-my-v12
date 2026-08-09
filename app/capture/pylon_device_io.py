"""Basler Pylon adapter behind `VendorDeviceIO`.

Anchor: spec/21-app/63-v2-vendor-pylon.md. Vendor SDK (`pypylon`) is imported
lazily inside the factory so unit tests stay hermetic; a `camera_factory`
override lets tests inject a fake InstantCamera-shaped object without
touching the real SDK.

Exception mapping is centralized in `_translate` per the anchor: pylon
timeout → `HardwareTimeoutError` (`E_HW_TIMEOUT`), logical/bus loss →
`DeviceDisconnectedError` (`E_HW_DISCONNECTED`), grab RuntimeException →
`HardwareTimeoutError` (retry class). Anything else is re-raised untyped
so unknown failures are NEVER silently swallowed.
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

VENDOR = "pylon"
DEFAULT_TIMEOUT_MS = 5000


# Exception-class predicates are looked up by name so we don't have to
# import pypylon at module scope. Real pypylon exception class names:
_TIMEOUT_NAMES = {"TimeoutException"}
_DISCONNECT_NAMES = {"LogicalErrorException", "DeviceNotFoundException"}
_RETRY_NAMES = {"RuntimeException"}


def _class_names(exc: BaseException) -> set[str]:
    return {c.__name__ for c in type(exc).__mro__}


def _is_timeout(exc: BaseException) -> bool:
    return bool(_class_names(exc) & (_TIMEOUT_NAMES | _RETRY_NAMES))


def _is_disconnect(exc: BaseException) -> bool:
    return bool(_class_names(exc) & _DISCONNECT_NAMES)


@dataclass(frozen=True)
class PylonConfig:
    serial: Optional[str] = None
    timeout_ms: int = DEFAULT_TIMEOUT_MS


def _open(cam: Any) -> None:
    cam.Open()


def _close(cam: Any) -> None:
    try:
        if getattr(cam, "IsGrabbing", lambda: False)():
            cam.StopGrabbing()
    finally:
        cam.Close()


def _arm(cam: Any) -> None:
    # After Open(); StartGrabbing sets acquisition running.
    cam.StartGrabbing()


class RuntimeException(RuntimeError):
    """Local shim named to match pypylon's `RuntimeException` so
    `_is_timeout` treats synthetic grab failures as retryable."""


def _grab(cam: Any, deadline_ms: int) -> bytes:
    """Software-trigger + retrieve. Raises vendor exceptions unchanged;
    `VendorDeviceIO` translates them via the injected predicates.

    Buffer ownership (spec/21-app/68): copy the SDK-owned bytes BEFORE
    releasing the grab result so no vendor-thread reference escapes.
    Any failed / empty / None result raises a retryable exception rather
    than returning a stale or partial frame.
    """
    cam.ExecuteSoftwareTrigger()
    result = cam.RetrieveResult(deadline_ms)
    if result is None:
        raise RuntimeException(f"pylon: RetrieveResult returned None after {deadline_ms}ms")
    try:
        succeeded = getattr(result, "GrabSucceeded", None)
        if callable(succeeded) and not succeeded():
            desc = _call_text(result, "GetErrorDescription", fallback="grab failed")
            raise RuntimeException(f"pylon: {desc}")
        payload = getattr(result, "Array", None)
        if payload is None:
            payload = getattr(result, "GetBuffer", lambda: b"")()
        # Force a caller-owned copy in every branch - never hand back a view
        # that aliases SDK-owned memory (freed by Release() below).
        if isinstance(payload, memoryview):
            copied = payload.tobytes()
        elif isinstance(payload, (bytes, bytearray)):
            copied = bytes(payload)
        else:
            tobytes = getattr(payload, "tobytes", None)
            copied = tobytes() if callable(tobytes) else bytes(payload)
        if not copied:
            raise RuntimeException("pylon: empty payload")
        return copied
    finally:
        release = getattr(result, "Release", None)
        if callable(release):
            try:
                release()
            except BaseException:
                logger.warning("pylon.grab release failed", exc_info=True)


def _is_connected(cam: Any) -> bool:
    try:
        return bool(cam.IsOpen())
    except BaseException:
        return False


def _call_text(obj: Any, name: str, fallback: str = "") -> str:
    attr = getattr(obj, name, None)
    value = attr() if callable(attr) else attr
    return str(value) if value is not None else fallback


def list_pylon_devices(
    config: PylonConfig | None = None,
    *,
    tl_factory: Callable[[], Any] | None = None,
) -> list[VendorDeviceDescriptor]:
    tl = (tl_factory or _default_tl_factory)()
    rows = []
    for info in tl.EnumerateDevices():
        serial = _call_text(info, "GetSerialNumber")
        rows.append(VendorDeviceDescriptor(VENDOR, serial, _call_text(info, "GetModelName"), _call_text(info, "GetDeviceClass"), serial))
    return rows


def make_pylon_device_io(
    config: PylonConfig | None = None,
    *,
    camera_factory: Callable[[PylonConfig], Any] | None = None,
) -> VendorDeviceIO:
    """Build a `VendorDeviceIO` for Basler Pylon.

    `camera_factory` overrides real-SDK instantiation for tests. In
    production it defaults to `pypylon.pylon.InstantCamera` created from
    `TlFactory.GetInstance().CreateFirstDevice()` (or the pinned serial).
    """
    cfg = config or PylonConfig()
    cam = (camera_factory or _default_camera_factory)(cfg)
    logger.info("pylon.factory.built serial=%s timeout_ms=%d", cfg.serial, cfg.timeout_ms)

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
        list_devices_fn=lambda: list_pylon_devices(cfg),
    )


def _default_tl_factory() -> Any:  # pragma: no cover - SDK-only
    try:
        from pypylon import pylon  # type: ignore
    except ImportError as exc:
        raise CaptureAdapterError(
            E_CAP_SDK_ABSENT, VENDOR, "pypylon not importable"
        ) from exc
    return pylon.TlFactory.GetInstance()


def _default_camera_factory(cfg: PylonConfig) -> Any:  # pragma: no cover - SDK-only
    try:
        from pypylon import pylon  # type: ignore
    except ImportError as exc:
        raise CaptureAdapterError(
            E_CAP_SDK_ABSENT, VENDOR, "pypylon not importable"
        ) from exc

    tl = _default_tl_factory()
    if cfg.serial:
        info = pylon.DeviceInfo()
        info.SetSerialNumber(cfg.serial)
        device = tl.CreateDevice(info)
    else:
        device = tl.CreateFirstDevice()
    return pylon.InstantCamera(device)


# Public alias for `_translate` referenced by the anchor.
def _translate(exc: BaseException) -> type[BaseException] | None:
    if _is_timeout(exc):
        return HardwareTimeoutError
    if _is_disconnect(exc):
        return DeviceDisconnectedError
    return None
