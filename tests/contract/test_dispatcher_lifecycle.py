"""Contract tests for dispatcher lifecycle (F-02, spec 15 §36-57)."""
from __future__ import annotations

from pathlib import Path

import pytest

from app.dispatcher.lifecycle import (
    DispatcherLifecycleError,
    mark_failed,
    mark_processed,
    move_to_inflight,
    reclaim_on_boot,
)


def _seed(pending: Path, name: str = "000000001.png") -> Path:
    pending.mkdir(parents=True, exist_ok=True)
    p = pending / name
    p.write_bytes(b"\x89PNG\r\n")
    return p


def test_pending_to_inflight_atomic(tmp_path: Path) -> None:
    pending = tmp_path / "pending"
    inflight = tmp_path / "inflight"
    src = _seed(pending)
    dst = move_to_inflight(src, inflight)
    assert dst.exists() is True
    assert src.exists() is False
    assert dst.parent.name == "inflight"


def test_terminal_moves_processed_and_failed(tmp_path: Path) -> None:
    pending = tmp_path / "pending"
    inflight = tmp_path / "inflight"
    a = move_to_inflight(_seed(pending, "000000001.png"), inflight)
    b = move_to_inflight(_seed(pending, "000000002.png"), inflight)
    ok = mark_processed(a, tmp_path / "processed")
    ng = mark_failed(b, tmp_path / "failed")
    assert ok.parent.name == "processed"
    assert ng.parent.name == "failed"
    assert a.exists() is False and b.exists() is False


def test_reclaim_moves_orphans_back_to_pending(tmp_path: Path) -> None:
    pending = tmp_path / "pending"
    inflight = tmp_path / "inflight"
    orphan = move_to_inflight(_seed(pending, "000000042.png"), inflight)
    reclaimed = reclaim_on_boot(inflight, pending)
    assert [p.name for p in reclaimed] == ["000000042.png"]
    assert orphan.exists() is False
    assert (pending / "000000042.png").exists() is True


def test_reclaim_is_idempotent_on_empty_inflight(tmp_path: Path) -> None:
    assert reclaim_on_boot(tmp_path / "inflight", tmp_path / "pending") == []


def test_move_missing_source_raises_typed(tmp_path: Path) -> None:
    with pytest.raises(DispatcherLifecycleError):
        move_to_inflight(tmp_path / "nope.png", tmp_path / "inflight")
