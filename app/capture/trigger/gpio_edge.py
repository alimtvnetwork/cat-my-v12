"""GPIO_EDGE trigger source stub (spec 14 §Trigger Sources, Q-01).

Real GPIO driver is host-specific and ships behind a runtime import. Missing
driver at boot is `E_CAP_TRIGGER_HW_UNAVAILABLE` per spec 14. The stub owns
the interface + the debounce policy; the driver adapter plugs in via
`bind_driver()`.
"""
from __future__ import annotations

import logging
from typing import Callable, Protocol

from app.capture.trigger.base import EdgeCallback, TriggerMode

log = logging.getLogger(__name__)

DEBOUNCE_MS_MIN = 1


class GpioDriver(Protocol):
    def open(self, pin: int, debounce_ms: int, on_rising: Callable[[], None]) -> None: ...
    def close(self) -> None: ...


class TriggerHwUnavailable(RuntimeError):
    code = "E_CAP_TRIGGER_HW_UNAVAILABLE"


class GpioEdgeSource:
    mode = TriggerMode.GPIO_EDGE

    def __init__(self, pin: int, debounce_ms: int = DEBOUNCE_MS_MIN) -> None:
        if debounce_ms < DEBOUNCE_MS_MIN:
            raise ValueError(f"debounce_ms below floor: {debounce_ms}")
        self._pin = pin
        self._debounce_ms = debounce_ms
        self._cb: EdgeCallback | None = None
        self._driver: GpioDriver | None = None

    def bind_driver(self, driver: GpioDriver) -> None:
        self._driver = driver

    def on_edge(self, cb: EdgeCallback) -> None:
        self._cb = cb

    def start(self) -> None:
        driver = self._driver
        if driver is None:
            log.error("capture.trigger.hwUnavailable mode=%s pin=%d", self.mode, self._pin)
            raise TriggerHwUnavailable(f"pin={self._pin}")
        if self._cb is None:
            raise RuntimeError("on_edge callback not set")
        driver.open(self._pin, self._debounce_ms, self._cb)
        log.info("capture.trigger.start mode=%s pin=%d debounceMs=%d",
                 self.mode, self._pin, self._debounce_ms)

    def stop(self) -> None:
        driver = self._driver
        if driver is None:
            return
        driver.close()
        log.info("capture.trigger.stop mode=%s pin=%d", self.mode, self._pin)
