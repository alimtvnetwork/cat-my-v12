"""SOFTWARE_TIMER trigger source (spec 14 §Trigger Sources, Q-01).

Fires the registered callback at `target_fps` using a monotonic-clock loop
running on its own daemon thread. Ceiling 77 fps per spec.
"""
from __future__ import annotations

import logging
import threading
import time

from app.capture.trigger.base import EdgeCallback, TriggerMode

log = logging.getLogger(__name__)

MAX_FPS = 77


class SoftwareTimerSource:
    mode = TriggerMode.SOFTWARE_TIMER

    def __init__(self, target_fps: int) -> None:
        if target_fps < 1 or target_fps > MAX_FPS:
            raise ValueError(f"target_fps out of range: {target_fps}")
        self._period_s = 1.0 / float(target_fps)
        self._cb: EdgeCallback | None = None
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def on_edge(self, cb: EdgeCallback) -> None:
        self._cb = cb

    def start(self) -> None:
        if self._cb is None:
            raise RuntimeError("on_edge callback not set")
        self._stop.clear()
        self._thread = threading.Thread(target=self._loop, name="SoftTimer", daemon=True)
        self._thread.start()
        log.info("capture.trigger.start mode=%s periodS=%.5f", self.mode, self._period_s)

    def stop(self) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=2.0)
        log.info("capture.trigger.stop mode=%s", self.mode)

    def _fire(self) -> None:
        cb = self._cb
        if cb is None:
            return
        try:
            cb()
        except Exception as err:
            log.error("capture.trigger.callbackFailed mode=%s err=%s", self.mode, err)
            raise

    def _loop(self) -> None:
        next_at = time.monotonic()
        while self._stop.is_set() is False:
            next_at += self._period_s
            self._fire()
            sleep_s = next_at - time.monotonic()
            if sleep_s > 0:
                time.sleep(sleep_s)
