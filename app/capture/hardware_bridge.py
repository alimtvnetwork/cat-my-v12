"""Hardware capture bridge (stub).

Provides a stable seam between the dispatcher/capture pipeline and any real
camera/frame-grabber driver. The stub is deterministic, raises typed errors,
and NEVER swallows failures — callers must handle `HardwareBridgeError`.

Real drivers (GigE Vision, USB3 Vision, vendor SDKs) implement
`HardwareBridge` and register via `set_bridge()`. Until a real driver is
wired, `StubHardwareBridge` returns synthetic frames so the rest of the
pipeline (perf harness, dispatcher, rules engine) can exercise the seam.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Protocol

logger = logging.getLogger(__name__)


class HardwareBridgeError(RuntimeError):
    """Base class for all hardware bridge failures. Never caught silently."""


class HardwareNotReadyError(HardwareBridgeError):
    """Bridge exists but the device is not armed/connected."""


class HardwareTimeoutError(HardwareBridgeError):
    """Trigger fired but no frame arrived within the deadline."""


@dataclass(frozen=True)
class Frame:
    frame_id: int
    ts_ns: int
    width: int
    height: int
    payload: bytes  # opaque; real drivers return raw pixels


class HardwareBridge(Protocol):
    def arm(self) -> None: ...
    def trigger(self, deadline_ms: int = 50) -> Frame: ...
    def disarm(self) -> None: ...
    @property
    def is_armed(self) -> bool: ...


class StubHardwareBridge:
    """Deterministic in-process stub. Safe for tests and dev preview."""

    def __init__(self, width: int = 640, height: int = 480) -> None:
        self._armed = False
        self._counter = 0
        self._w = width
        self._h = height

    @property
    def is_armed(self) -> bool:
        return self._armed

    def arm(self) -> None:
        self._armed = True
        logger.info("hardware_bridge.arm status=armed backend=stub")

    def disarm(self) -> None:
        self._armed = False
        logger.info("hardware_bridge.disarm status=disarmed backend=stub")

    def trigger(self, deadline_ms: int = 50) -> Frame:
        if not self._armed:
            logger.error("hardware_bridge.trigger error=not_ready")
            raise HardwareNotReadyError("bridge must be armed before trigger()")
        if deadline_ms <= 0:
            logger.error("hardware_bridge.trigger error=timeout deadline_ms=%d", deadline_ms)
            raise HardwareTimeoutError(f"non-positive deadline_ms={deadline_ms}")
        self._counter += 1
        frame = Frame(
            frame_id=self._counter,
            ts_ns=time.monotonic_ns(),
            width=self._w,
            height=self._h,
            payload=b"",
        )
        logger.debug("hardware_bridge.trigger frame_id=%d", frame.frame_id)
        return frame


_bridge: HardwareBridge = StubHardwareBridge()


def get_bridge() -> HardwareBridge:
    return _bridge


def set_bridge(bridge: HardwareBridge) -> None:
    """Register a real driver. Call once at boot."""
    global _bridge
    _bridge = bridge
    logger.info("hardware_bridge.set_bridge backend=%s", type(bridge).__name__)
