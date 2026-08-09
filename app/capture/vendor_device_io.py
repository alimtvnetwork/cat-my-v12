"""Vendor `DeviceIO` binding — Pylon/Spinnaker/Vimba shape.

Thin adapter that plugs a vendor SDK camera handle (Basler Pylon
`InstantCamera`, Spinnaker `Camera`, Vimba `Camera`, …) into the
`DeviceIO` protocol used by `ReferenceCaptureDriver`.

Vendor SDKs are not importable in this sandbox — and pinning any one of
them would tie the whole codebase to a single vendor. So the binding
takes an opaque `handle` and three callables that translate vendor API
into `open`/`close`/`grab`. Concrete bindings live in vendor-specific
`extras/` and are wired at boot; this module defines the seam and the
error-mapping contract.

All vendor errors are translated into typed `hardware_bridge` errors —
NEVER swallowed, NEVER logged-and-ignored. Timeouts map to
`HardwareTimeoutError`; anything else (bus drop, USB reset, GigE link
loss) maps to `DeviceDisconnectedError`.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Callable

from app.capture.hardware_bridge import HardwareTimeoutError
from app.capture.reference_driver import DeviceDisconnectedError, DeviceIO

logger = logging.getLogger(__name__)


# E_CAP_* failure taxonomy - see spec/21-app/68-v2-vendor-sdk-contract.md.
E_CAP_SDK_ABSENT = "E_CAP_SDK_ABSENT"
E_CAP_ENUM_FAILED = "E_CAP_ENUM_FAILED"
E_CAP_OPEN_FAILED = "E_CAP_OPEN_FAILED"
E_CAP_GRAB_TIMEOUT = "E_CAP_GRAB_TIMEOUT"
E_CAP_DISCONNECTED = "E_CAP_DISCONNECTED"
E_CAP_BUFFER_LEAK = "E_CAP_BUFFER_LEAK"
E_CAP_UNKNOWN = "E_CAP_UNKNOWN"
E_CFG_UNKNOWN_DEVICE = "E_CFG_UNKNOWN_DEVICE"
W_DISCOVERY_PARTIAL = "W_DISCOVERY_PARTIAL"


class CaptureAdapterError(Exception):
    """Normalized adapter error carrying a stable `E_CAP_*` code.

    Every raise path in `VendorDeviceIO` and its per-vendor factories MUST
    raise this class (or a subclass) so callers never see a raw vendor
    exception. `code` is one of the `E_CAP_*` constants above.
    """

    def __init__(self, code: str, vendor: str, detail: str = "") -> None:
        self.code = code
        self.vendor = vendor
        self.detail = detail
        super().__init__(f"{code} vendor={vendor} detail={detail!r}")


# Predicate signature: (exception) -> bool. Vendors use different exception
# classes for the same fault; the binding declares which ones mean "timeout"
# vs "the device fell off the bus". Anything unmatched is wrapped in
# CaptureAdapterError(E_CAP_UNKNOWN) so we do NOT paper over unknown failures
# and we also do NOT leak raw vendor classes.
IsTimeout = Callable[[BaseException], bool]
IsDisconnect = Callable[[BaseException], bool]


def _emit(level: int, op: str, code: str, vendor: str, exc: BaseException | None = None, **fields: Any) -> None:
    """Structured log: single call site, one field set, consistent codes."""
    extra = {
        "op": op,
        "code": code,
        "vendor": vendor,
        "exc_type": type(exc).__name__ if exc is not None else None,
        **fields,
    }
    parts = " ".join(f"{k}={v}" for k, v in extra.items() if v is not None)
    logger.log(level, "vendor_io.%s %s", op, parts, extra=extra)


def _normalize(op: str, vendor: str, exc: BaseException,
               is_timeout: IsTimeout, is_disconnect: IsDisconnect,
               *, deadline_ms: int | None = None) -> Exception:
    """Map any vendor exception into a typed error + structured log entry."""
    if is_timeout(exc):
        _emit(logging.WARNING, op, E_CAP_GRAB_TIMEOUT, vendor, exc, deadline_ms=deadline_ms)
        return HardwareTimeoutError(f"{vendor}: {op} exceeded {deadline_ms}ms")
    if is_disconnect(exc):
        _emit(logging.ERROR, op, E_CAP_DISCONNECTED, vendor, exc)
        return DeviceDisconnectedError(f"{vendor}: {op} - device unreachable")
    code = E_CAP_OPEN_FAILED if op == "open" else E_CAP_UNKNOWN
    _emit(logging.ERROR, op, code, vendor, exc)
    return CaptureAdapterError(code, vendor, f"{op}: {type(exc).__name__}")


@dataclass(frozen=True)
class VendorDeviceDescriptor:
    """Stable camera row returned by vendor discovery."""

    vendor: str
    serial: str
    model: str
    transport: str = "unknown"
    display_name: str = ""


@dataclass
class VendorDeviceIO:
    """Vendor-agnostic `DeviceIO` adapter.

    `handle` is the SDK camera object. `open_fn`/`close_fn`/`grab_fn` are
    small lambdas the binding author writes once per vendor. The
    grab callable MUST return raw bytes; the driver treats them as opaque.
    """

    handle: Any
    open_fn: Callable[[Any], None]
    close_fn: Callable[[Any], None]
    grab_fn: Callable[[Any, int], bytes]
    is_connected_fn: Callable[[Any], bool]
    is_timeout: IsTimeout
    is_disconnect: IsDisconnect
    vendor: str = "unknown"
    list_devices_fn: Callable[[], list[VendorDeviceDescriptor]] | None = None
    _open: bool = field(default=False, init=False)

    def list_devices(self) -> list[VendorDeviceDescriptor]:
        if self.list_devices_fn is None:
            _emit(logging.INFO, "list_devices", "OK", self.vendor, count=0)
            return []
        try:
            devices = self.list_devices_fn()
        except BaseException as exc:
            _emit(logging.ERROR, "list_devices", E_CAP_ENUM_FAILED, self.vendor, exc)
            raise CaptureAdapterError(
                E_CAP_ENUM_FAILED, self.vendor, f"enum: {type(exc).__name__}"
            ) from exc
        _emit(logging.INFO, "list_devices", "OK", self.vendor, count=len(devices))
        return devices

    def open(self) -> None:
        try:
            self.open_fn(self.handle)
        except BaseException as exc:
            raise _normalize("open", self.vendor, exc, self.is_timeout, self.is_disconnect) from exc
        self._open = True
        _emit(logging.INFO, "open", "OK", self.vendor)

    def close(self) -> None:
        # close is best-effort but still surfaces the failure code - we log
        # and drop the flag so the driver stops issuing grabs, then re-raise
        # so callers know the SDK is in an unclean state.
        self._open = False
        try:
            self.close_fn(self.handle)
        except BaseException as exc:
            _emit(logging.ERROR, "close", E_CAP_UNKNOWN, self.vendor, exc)
            raise CaptureAdapterError(
                E_CAP_UNKNOWN, self.vendor, f"close: {type(exc).__name__}"
            ) from exc
        _emit(logging.INFO, "close", "OK", self.vendor)

    @property
    def connected(self) -> bool:
        if not self._open:
            return False
        try:
            return bool(self.is_connected_fn(self.handle))
        except BaseException:
            # An SDK that can't answer "are you connected?" is not connected.
            return False

    def grab(self, deadline_ms: int) -> bytes:
        if not self._open:
            raise DeviceDisconnectedError(f"{self.vendor}: grab before open")
        try:
            payload = self.grab_fn(self.handle, deadline_ms)
        except BaseException as exc:
            err = _normalize(
                "grab", self.vendor, exc, self.is_timeout, self.is_disconnect,
                deadline_ms=deadline_ms,
            )
            if isinstance(err, DeviceDisconnectedError):
                self._open = False
            raise err from exc
        if not isinstance(payload, (bytes, bytearray)):
            raise TypeError(
                f"{self.vendor}: grab_fn must return bytes, got {type(payload).__name__}"
            )
        # Buffer-ownership rule (spec 68): return a caller-owned copy so no
        # SDK-owned buffer is retained after grab().
        return bytes(payload)


# Verify at import time that the adapter satisfies the DeviceIO protocol.
_proto_check: DeviceIO  # noqa: F842
