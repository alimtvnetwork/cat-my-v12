"""Plan 90 Step 30 - Deterministic cadence proof for HeartbeatTicker.

Real-time tests in `test_heartbeat.py` verify the ticker works end-to-end
under wall clock. This file proves the cadence contract deterministically:
given N virtual ticks, the ticker emits exactly N heartbeats with monotonic
`Uptime` values in `interval_s` increments and stops on the (N+1)th wait
returning True.

`freezegun` cannot patch `threading.Event.wait` (it monkey-patches
`datetime`/`time`, not the low-level condition variable that `Event` uses),
so we do NOT use `freezegun` here. Instead we inject `wait_fn` and `clock`
via constructor parameters, drive the ticker on the current thread by
calling `_run()` directly, and get a bit-exact cadence assertion with zero
sleep and zero thread scheduling.
"""

from __future__ import annotations

from pathlib import Path

from BE.cli.common import ipc
from BE.cli.common.heartbeat import HeartbeatTicker


class VirtualClock:
    """Manual clock: `advance(dt)` moves time forward; `now()` reads it."""

    def __init__(self, start: float = 1000.0) -> None:
        self._t = start

    def now(self) -> float:
        return self._t

    def advance(self, dt: float) -> None:
        self._t += dt


def _drain(root: Path) -> list[ipc.Message]:
    return list(ipc.receive(root, "worker-out", kind_filter=["Heartbeat"]))


def test_cadence_exact_tick_count_and_uptime_progression(tmp_path: Path) -> None:
    """N virtual waits => N emissions; Uptime grows by exactly interval_s each tick."""
    clock = VirtualClock(start=1000.0)
    interval = 5.0
    max_ticks = 4
    calls = {"n": 0}

    def wait(seconds: float) -> bool:
        # H1: caller passed our configured interval every time.
        assert seconds == interval
        clock.advance(seconds)
        calls["n"] += 1
        # False = timed out (emit); True on the tick AFTER max_ticks = stop.
        return calls["n"] > max_ticks

    ticker = HeartbeatTicker(
        ipc_root=tmp_path, ipc_dir="worker-out",
        run_id="R-cadence", from_="worker", interval_s=interval,
        memory_fn=lambda: 12.0, clock=clock.now, wait_fn=wait,
    )
    ticker._started_at = clock.now()  # start() sets this; simulate here
    ticker._run()  # drive synchronously

    assert ticker.sent == max_ticks
    assert ticker.failures == 0
    assert calls["n"] == max_ticks + 1  # last wait returned True to exit

    msgs = _drain(tmp_path)
    assert len(msgs) == max_ticks
    uptimes = [m.payload["Uptime"] for m in msgs]
    assert uptimes == [interval * (i + 1) for i in range(max_ticks)]
    # MemoryMb from injected fn, LastEvent empty (never noted).
    assert all(m.payload["MemoryMb"] == 12.0 for m in msgs)
    assert all(m.payload["LastEvent"] == "" for m in msgs)


def test_zero_ticks_when_stop_signalled_before_first_wait(tmp_path: Path) -> None:
    """H1 corollary: stop-before-first-interval => zero heartbeats emitted."""
    def wait(_seconds: float) -> bool:
        return True  # signalled immediately

    ticker = HeartbeatTicker(
        ipc_root=tmp_path, ipc_dir="worker-out",
        run_id="R-zero", from_="worker", interval_s=5.0,
        wait_fn=wait,
    )
    ticker._started_at = 0.0
    ticker._run()

    assert ticker.sent == 0
    assert _drain(tmp_path) == []


def test_note_between_virtual_ticks_reflected_in_next_payload(tmp_path: Path) -> None:
    """note() called from wait_fn between ticks appears on the NEXT payload."""
    clock = VirtualClock()
    interval = 5.0
    calls = {"n": 0}
    ticker_ref: dict = {}

    events_before_each_tick = ["captured_1", "captured_2", "captured_3"]

    def wait(seconds: float) -> bool:
        clock.advance(seconds)
        # Note the event that the tick ABOUT to emit should carry.
        if calls["n"] < len(events_before_each_tick):
            ticker_ref["t"].note(events_before_each_tick[calls["n"]])
        calls["n"] += 1
        return calls["n"] > len(events_before_each_tick)

    ticker = HeartbeatTicker(
        ipc_root=tmp_path, ipc_dir="worker-out",
        run_id="R-note", from_="worker", interval_s=interval,
        memory_fn=lambda: 0.0, clock=clock.now, wait_fn=wait,
    )
    ticker_ref["t"] = ticker
    ticker._started_at = clock.now()
    ticker._run()

    msgs = _drain(tmp_path)
    got = [m.payload["LastEvent"] for m in msgs]
    assert got == events_before_each_tick


def test_ipc_failure_counted_without_breaking_cadence(tmp_path: Path, monkeypatch) -> None:
    """H3: even under 100% ipc.send failure, virtual cadence still counts loops."""
    def boom(*_a, **_kw):
        raise RuntimeError("ipc down")
    monkeypatch.setattr("BE.cli.common.heartbeat.ipc.send", boom)

    calls = {"n": 0}
    def wait(_seconds: float) -> bool:
        calls["n"] += 1
        return calls["n"] > 3

    ticker = HeartbeatTicker(
        ipc_root=tmp_path, ipc_dir="worker-out",
        run_id="R-fail", from_="worker", interval_s=5.0, wait_fn=wait,
    )
    ticker._started_at = 0.0
    ticker._run()

    assert ticker.sent == 0
    assert ticker.failures == 3
    assert _drain(tmp_path) == []
