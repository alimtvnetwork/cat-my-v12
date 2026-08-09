"""Scheduled runner for AuditLogRetention.

Runs :meth:`AuditLogRetention.prune` on a fixed interval on a background
thread so the append-only ``audit_log`` cannot grow unbounded in
long-running deployments. The scheduler owns only scheduling — the
retention policy still owns the delete decision.

Contract:
  - ``start()`` is idempotent; a second call is a no-op while running.
  - ``stop()`` joins the worker thread within ``stop_timeout`` seconds.
  - Every tick is logged; exceptions inside ``prune`` are logged and
    surfaced via a settable ``on_error`` callback but do NOT kill the
    scheduler (transient sqlite locks would otherwise silently disable
    retention forever).
  - ``interval_seconds <= 0`` is a configuration error and rejected at
    construction time — silent no-op schedulers are worse than a crash.
"""
from __future__ import annotations

import logging
import threading
from dataclasses import dataclass, field
from typing import Callable

from .retention import AuditLogRetention

log = logging.getLogger("ca.security.retention.scheduler")


@dataclass
class RetentionScheduler:
    retention: AuditLogRetention
    interval_seconds: float
    on_error: Callable[[BaseException], None] | None = None
    stop_timeout: float = 5.0
    _stop: threading.Event = field(default_factory=threading.Event, init=False, repr=False)
    _thread: threading.Thread | None = field(default=None, init=False, repr=False)

    def __post_init__(self) -> None:
        if self.interval_seconds <= 0:
            raise ValueError("RetentionScheduler.interval_seconds must be > 0")

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            log.debug("retention.scheduler.start_ignored reason=already_running")
            return
        self._stop.clear()
        self._thread = threading.Thread(
            target=self._run, name="audit-retention", daemon=True
        )
        self._thread.start()
        log.info("retention.scheduler.started interval=%s", self.interval_seconds)

    def stop(self) -> None:
        self._stop.set()
        t = self._thread
        if t and t.is_alive():
            t.join(timeout=self.stop_timeout)
        log.info("retention.scheduler.stopped")

    def tick_once(self) -> int:
        """Run one prune synchronously; used by tests and manual triggers."""
        try:
            removed = self.retention.prune()
        except BaseException as exc:  # noqa: BLE001 - surfaced, not swallowed
            log.exception("retention.scheduler.tick_failed")
            if self.on_error is not None:
                self.on_error(exc)
            raise
        log.info("retention.scheduler.tick removed=%s", removed)
        return removed

    def _run(self) -> None:
        while not self._stop.is_set():
            try:
                self.tick_once()
            except BaseException:  # noqa: BLE001 - already logged in tick_once
                pass
            self._stop.wait(self.interval_seconds)
