"""Reference capture driver adapter.

Concrete `HardwareBridge` that models the lifecycle a real GigE/USB3 Vision
SDK exposes: `connect` → `arm` → `trigger`* → `disarm` → `disconnect`, with
typed faults for device disconnects and grab-timeouts. It backs onto a
pluggable `DeviceIO` so vendor SDKs slot in without changing the adapter.

This is a *reference* driver — deterministic, no native deps — that proves
the contract. Wire a vendor `DeviceIO` (Pylon, Spinnaker, Vimba) to go live.

All faults raise typed errors from `hardware_bridge`; nothing is swallowed.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Callable, Protocol

from app.capture.hardware_bridge import (
    Frame,
    HardwareBridgeError,
    HardwareNotReadyError,
    HardwareTimeoutError,
)

logger = logging.getLogger(__name__)


class DeviceDisconnectedError(HardwareBridgeError):
    """Vendor SDK reported the device fell off the bus mid-session."""


class DeviceIO(Protocol):
    """Minimal surface a vendor SDK must implement for the reference driver."""

    def open(self) -> None: ...
    def close(self) -> None: ...
    def grab(self, deadline_ms: int) -> bytes: ...  # raw pixel payload
    @property
    def connected(self) -> bool: ...


@dataclass
class FakeDeviceIO:
    """Deterministic DeviceIO for tests: scripted grabs and fault injection."""

    width: int = 640
    height: int = 480
    connected_flag: bool = False
    # Each call to grab() pops one entry. str "timeout" or "disconnect" trip
    # the matching fault; bytes are returned verbatim. Empty → default bytes.
    scripted: list = field(default_factory=list)

    def open(self) -> None:
        self.connected_flag = True

    def close(self) -> None:
        self.connected_flag = False

    @property
    def connected(self) -> bool:
        return self.connected_flag

    def grab(self, deadline_ms: int) -> bytes:
        if not self.connected_flag:
            raise DeviceDisconnectedError("device closed")
        if not self.scripted:
            return b"\x00" * 8
        step = self.scripted.pop(0)
        if step == "timeout":
            raise HardwareTimeoutError(f"grab exceeded {deadline_ms}ms")
        if step == "disconnect":
            self.connected_flag = False
            raise DeviceDisconnectedError("device dropped mid-grab")
        assert isinstance(step, (bytes, bytearray))
        return bytes(step)


@dataclass
class ReferenceCaptureDriver:
    """Concrete `HardwareBridge` backed by a `DeviceIO`.

    Retries transient grab-timeouts up to `retry_budget` times; a disconnect
    is fatal for the current trigger (caller decides whether to reconnect).
    """

    io: DeviceIO
    width: int = 640
    height: int = 480
    retry_budget: int = 1
    clock_ns: Callable[[], int] = time.monotonic_ns
    _armed: bool = field(default=False, init=False)
    _counter: int = field(default=0, init=False)

    @property
    def is_armed(self) -> bool:
        return self._armed

    def arm(self) -> None:
        if not self.io.connected:
            self.io.open()
        self._armed = True
        logger.info("ref_driver.arm backend=%s", type(self.io).__name__)

    def disarm(self) -> None:
        self._armed = False
        if self.io.connected:
            self.io.close()
        logger.info("ref_driver.disarm backend=%s", type(self.io).__name__)

    def trigger(self, deadline_ms: int = 50) -> Frame:
        if not self._armed:
            logger.error("ref_driver.trigger error=not_ready")
            raise HardwareNotReadyError("driver must be armed before trigger()")
        if deadline_ms <= 0:
            logger.error("ref_driver.trigger error=timeout deadline_ms=%d", deadline_ms)
            raise HardwareTimeoutError(f"non-positive deadline_ms={deadline_ms}")

        attempts = self.retry_budget + 1
        last_exc: HardwareTimeoutError | None = None
        for attempt in range(1, attempts + 1):
            try:
                payload = self.io.grab(deadline_ms)
            except HardwareTimeoutError as exc:
                last_exc = exc
                logger.warning(
                    "ref_driver.trigger timeout attempt=%d/%d deadline_ms=%d",
                    attempt, attempts, deadline_ms,
                )
                continue
            except DeviceDisconnectedError:
                self._armed = False
                logger.error("ref_driver.trigger error=disconnect attempt=%d", attempt)
                raise
            self._counter += 1
            frame = Frame(
                frame_id=self._counter,
                ts_ns=self.clock_ns(),
                width=self.width,
                height=self.height,
                payload=payload,
            )
            logger.debug("ref_driver.trigger frame_id=%d attempt=%d", frame.frame_id, attempt)
            return frame

        assert last_exc is not None
        logger.error("ref_driver.trigger error=timeout_budget_exhausted attempts=%d", attempts)
        raise last_exc
