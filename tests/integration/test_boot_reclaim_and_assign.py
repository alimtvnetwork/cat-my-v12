"""End-to-end wiring: supervisor reclaim + assign_one with inflight move (F-02)."""
from __future__ import annotations

from pathlib import Path

from app.dispatcher.loop import assign_one, build_state, list_ready
from app.supervisor.boot import reclaim_dispatch_inflight


def test_reclaim_then_assign_moves_through_inflight(tmp_path: Path) -> None:
    pending = tmp_path / "pending"
    inflight = tmp_path / "inflight"
    pending.mkdir()
    inflight.mkdir()

    # Simulate a crash: file left in inflight/
    orphan = inflight / "000000001.png"
    orphan.write_bytes(b"\x89PNG\r\n")

    reclaimed = reclaim_dispatch_inflight(inflight, pending)
    assert reclaimed == 1
    assert (pending / "000000001.png").exists()
    assert list(inflight.iterdir()) == []

    # Now dispatch: assign_one must atomically move pending → inflight
    state = build_state(worker_count=1, batch_size=2)
    ready = list_ready(pending)
    assert len(ready) == 1
    slot = assign_one(state, ready[0], inflight_dir=inflight)
    assert slot is not None
    assert slot.in_flight == 1
    assert (inflight / "000000001.png").exists()
    assert (pending / "000000001.png").exists() is False
    # Tracked path is post-move
    assert state.assigned[0][1].parent == inflight


def test_reclaim_is_idempotent(tmp_path: Path) -> None:
    pending = tmp_path / "pending"
    inflight = tmp_path / "inflight"
    pending.mkdir()
    inflight.mkdir()
    assert reclaim_dispatch_inflight(inflight, pending) == 0
    assert reclaim_dispatch_inflight(inflight, pending) == 0
