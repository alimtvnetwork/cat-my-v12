"""Plan 90 Step 29 - HeartbeatTicker.

Background thread that emits `Kind=Heartbeat` IPC messages at a fixed
interval while a long-running CLI subcommand runs. The `open-stream` and
`capture-frames` subcommands attach one so the UI Sessions tail can tell
"worker healthy, no frames yet" apart from "worker hung", and so
`doctor` can report last-heartbeat mtime.

Anchors:
- `spec/21-app/76-cli-log-and-ipc.md` §"Payload shapes" (Heartbeat).
- `BE/cli/common/ipc_models.py::HeartbeatPayload` (Uptime, MemoryMb, LastEvent).
- `BE/cli/common/ipc.py::send` (typed model round-trip).

Design invariants:
  H1. Uses `threading.Event.wait(interval)` for cancellation, so `stop()`
      returns within one wait quantum, not one full interval.
  H2. `note(event)` is thread-safe and records the last visible event so
      the heartbeat payload's `LastEvent` reflects worker progress.
  H3. On IPC failure the ticker does NOT crash the worker: it counts
      failures and continues (the ticker is best-effort observability;
      raising here would kill the capture loop).
  H4. `MemoryMb` uses `resource.getrusage(RUSAGE_SELF).ru_maxrss` on POSIX
      (KB on Linux, bytes on macOS) with a graceful `0.0` fallback on
      Windows or import failure. Never optional third-party (psutil).
  H5. Context-manager form guarantees `stop()` + `join()` even on exception.
"""

from __future__ import annotations

import sys
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Optional

from BE.cli.common import ipc
from BE.cli.common.ipc_models import HeartbeatPayload

DEFAULT_INTERVAL_S = 5.0


def _memory_mb() -> float:
    """Best-effort resident set size in MiB. H4."""
    try:
        import resource  # POSIX only
    except ImportError:  # Windows
        return 0.0
    try:
        rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    except (OSError, ValueError):
        return 0.0
    # Linux reports KB, macOS reports bytes. Normalise both to MiB.
    if sys.platform == "darwin":
        return rss / (1024.0 * 1024.0)
    return rss / 1024.0


@dataclass(slots=True)
class HeartbeatTicker:
    ipc_root: Path
    ipc_dir: str
    run_id: str
    from_: str
    to: str = "processing"
    interval_s: float = DEFAULT_INTERVAL_S
    memory_fn: Callable[[], float] = field(default=_memory_mb)
    clock: Callable[[], float] = field(default=time.monotonic)
    # Wait primitive; MUST return True iff a stop was signalled during the
    # wait, False on timeout. Default is `Event.wait`, matching real-time
    # semantics. Tests inject a virtual-clock wait to prove cadence
    # deterministically without relying on real threads/sleep. `freezegun`
    # cannot patch `threading.Event.wait`, so injection is the correct
    # (and only) way to get a deterministic cadence proof here.
    wait_fn: Optional[Callable[[float], bool]] = None
    _stop: threading.Event = field(default_factory=threading.Event, init=False)
    _thread: Optional[threading.Thread] = field(default=None, init=False)
    _started_at: float = field(default=0.0, init=False)
    _last_event: str = field(default="", init=False)
    _lock: threading.Lock = field(default_factory=threading.Lock, init=False)
    _sent: int = field(default=0, init=False)
    _failures: int = field(default=0, init=False)

    def __post_init__(self) -> None:
        if self.interval_s <= 0:
            raise ValueError(f"interval_s must be > 0, got {self.interval_s}")

    # --- public API ---------------------------------------------------------

    def note(self, event: str) -> None:
        """Record the last worker-visible event; picked up on next tick. H2."""
        with self._lock:
            self._last_event = str(event)

    @property
    def sent(self) -> int:
        return self._sent

    @property
    def failures(self) -> int:
        return self._failures

    def start(self) -> None:
        if self._thread is not None:
            raise RuntimeError("HeartbeatTicker already started")
        self._started_at = self.clock()
        self._stop.clear()
        self._thread = threading.Thread(
            target=self._run, name=f"heartbeat-{self.run_id}", daemon=True,
        )
        self._thread.start()

    def stop(self, timeout: float = 2.0) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=timeout)
            self._thread = None

    def __enter__(self) -> "HeartbeatTicker":
        self.start()
        return self

    def __exit__(self, *_exc: object) -> None:
        self.stop()

    # --- internals ----------------------------------------------------------

    def _run(self) -> None:
        # First tick fires after `interval_s`, not immediately, so a fast
        # subcommand (e.g. `probe`) that exits before the first interval
        # never emits a heartbeat.
        wait = self.wait_fn if self.wait_fn is not None else self._stop.wait
        while not wait(self.interval_s):  # H1
            self._emit_once()

    def _emit_once(self) -> None:
        with self._lock:
            last_event = self._last_event
        payload = HeartbeatPayload(
            Uptime=max(0.0, self.clock() - self._started_at),
            MemoryMb=self.memory_fn(),
            LastEvent=last_event,
        )
        try:
            ipc.send(
                self.ipc_root, self.ipc_dir, "Heartbeat", payload,
                run_id=self.run_id, from_=self.from_, to=self.to,
            )
            self._sent += 1
        except Exception:  # H3: best-effort; never crash the worker
            self._failures += 1


__all__ = ["HeartbeatTicker", "DEFAULT_INTERVAL_S"]
