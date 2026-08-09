"""Tests for `BE/cli/common/heartbeat.py::HeartbeatTicker` (Plan 90 Step 29)."""

from __future__ import annotations

import time
from pathlib import Path

import pytest

from BE.cli.common import ipc
from BE.cli.common.heartbeat import DEFAULT_INTERVAL_S, HeartbeatTicker


def _drain(root: Path, dir_: str) -> list[ipc.Message]:
    return list(ipc.receive(root, dir_, kind_filter=["Heartbeat"]))


def test_default_interval_matches_spec() -> None:
    # spec/21-app/76-cli-log-and-ipc.md: heartbeat cadence is 5s.
    assert DEFAULT_INTERVAL_S == 5.0


def test_interval_must_be_positive(tmp_path: Path) -> None:
    with pytest.raises(ValueError):
        HeartbeatTicker(
            ipc_root=tmp_path, ipc_dir="worker-out",
            run_id="R", from_="worker", interval_s=0,
        )


def test_emits_periodic_heartbeats_with_typed_payload(tmp_path: Path) -> None:
    ticker = HeartbeatTicker(
        ipc_root=tmp_path, ipc_dir="worker-out",
        run_id="R1", from_="worker", interval_s=0.05,
        memory_fn=lambda: 42.5,
    )
    ticker.note("grabbed_1")
    with ticker:
        # Wait long enough for at least 3 ticks (~150ms).
        deadline = time.monotonic() + 1.0
        while ticker.sent < 3 and time.monotonic() < deadline:
            time.sleep(0.02)
    assert ticker.sent >= 3, f"expected >=3 heartbeats, got {ticker.sent}"
    assert ticker.failures == 0

    msgs = _drain(tmp_path, "worker-out")
    assert len(msgs) >= 3
    m = msgs[0]
    assert m.kind == "Heartbeat"
    assert m.from_ == "worker"
    assert m.to == "processing"
    assert m.run_id == "R1"
    assert m.payload is not None
    assert set(m.payload.keys()) == {"Uptime", "MemoryMb", "LastEvent"}
    assert m.payload["MemoryMb"] == 42.5
    assert m.payload["LastEvent"] == "grabbed_1"
    assert m.payload["Uptime"] >= 0.0


def test_no_tick_before_first_interval_elapses(tmp_path: Path) -> None:
    """H1: first tick fires AFTER interval_s, never immediately."""
    ticker = HeartbeatTicker(
        ipc_root=tmp_path, ipc_dir="worker-out",
        run_id="R2", from_="worker", interval_s=5.0,
    )
    with ticker:
        # Stop well before the first 5s tick.
        time.sleep(0.05)
    assert ticker.sent == 0
    assert _drain(tmp_path, "worker-out") == []


def test_note_is_thread_safe_and_reflected_on_next_tick(tmp_path: Path) -> None:
    ticker = HeartbeatTicker(
        ipc_root=tmp_path, ipc_dir="worker-out",
        run_id="R3", from_="worker", interval_s=0.05,
    )
    with ticker:
        ticker.note("step_a")
        # Wait for at least one tick with step_a.
        deadline = time.monotonic() + 1.0
        while ticker.sent < 1 and time.monotonic() < deadline:
            time.sleep(0.02)
        ticker.note("step_b")
        target = ticker.sent + 2
        while ticker.sent < target and time.monotonic() < deadline:
            time.sleep(0.02)
    events = [m.payload["LastEvent"] for m in _drain(tmp_path, "worker-out")]
    assert "step_a" in events
    assert "step_b" in events
    # Chronological order preserved by ULID filename sort.
    assert events.index("step_a") < events.index("step_b")


def test_double_start_raises(tmp_path: Path) -> None:
    ticker = HeartbeatTicker(
        ipc_root=tmp_path, ipc_dir="worker-out",
        run_id="R4", from_="worker", interval_s=0.05,
    )
    ticker.start()
    try:
        with pytest.raises(RuntimeError):
            ticker.start()
    finally:
        ticker.stop()


def test_stop_returns_promptly_even_with_long_interval(tmp_path: Path) -> None:
    ticker = HeartbeatTicker(
        ipc_root=tmp_path, ipc_dir="worker-out",
        run_id="R5", from_="worker", interval_s=30.0,
    )
    ticker.start()
    t0 = time.monotonic()
    ticker.stop(timeout=2.0)
    elapsed = time.monotonic() - t0
    # H1: Event.wait() unblocks immediately on set(); must NOT wait 30s.
    assert elapsed < 1.0, f"stop() took {elapsed:.2f}s"


def test_ipc_failure_counted_and_does_not_crash(tmp_path: Path, monkeypatch) -> None:
    """H3: an ipc.send exception is swallowed into `failures`, not raised."""
    calls = {"n": 0}

    def boom(*_a, **_kw):
        calls["n"] += 1
        raise RuntimeError("disk full simulation")

    monkeypatch.setattr("BE.cli.common.heartbeat.ipc.send", boom)

    ticker = HeartbeatTicker(
        ipc_root=tmp_path, ipc_dir="worker-out",
        run_id="R6", from_="worker", interval_s=0.05,
    )
    with ticker:
        deadline = time.monotonic() + 1.0
        while ticker.failures < 2 and time.monotonic() < deadline:
            time.sleep(0.02)
    assert ticker.failures >= 2
    assert ticker.sent == 0
    assert calls["n"] >= 2


def test_context_manager_stops_on_exception(tmp_path: Path) -> None:
    ticker = HeartbeatTicker(
        ipc_root=tmp_path, ipc_dir="worker-out",
        run_id="R7", from_="worker", interval_s=0.05,
    )
    with pytest.raises(RuntimeError):
        with ticker:
            raise RuntimeError("worker died")
    # Thread cleared, subsequent start() must succeed.
    ticker.start()
    ticker.stop()
