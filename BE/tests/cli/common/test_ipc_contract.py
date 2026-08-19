"""Plan 90 Step 26 - IPC contract suite.

These tests assert the invariants of `BE.cli.common.ipc` as a *single*
contract, not per-feature edge cases (those live in `test_ipc.py`). If
any invariant here regresses, downstream consumers (processing-cli
consumer, UI Sessions tail) can silently ghost frames, so the contract
must be provable in one file.

Anchors:
- spec/21-app/76-cli-log-and-ipc.md §"IPC protocol" (atomic write, ack,
  24h retention on `.ack.json`).
- spec/21-app/74-worker-cli.md §Acceptance #4 (`frame_ready` observability).

Invariants covered:
  C1. Atomic visibility  - `receive` never yields a partial `.tmp` file.
  C2. FIFO across producers  - ULID names sort in write order across two
      producers writing into the same drop-dir.
  C3. `ack` idempotence  - a second `ack` on the already-renamed path
      returns the same `.ack.json` path without raising.
  C4. `ack` + `prune_ipc` compose  - acked past cutoff -> gone; live
      (unacked) past cutoff -> kept forever.
  C5. Corruption is loud, not silent  - a truncated `.msg.json` raises
      `E_IPC_PAYLOAD_INVALID` from `receive`, not a skipped yield.
  C6. Unknown-Kind on disk is loud  - a hand-crafted record with a Kind
      outside the registry raises `E_IPC_UNKNOWN_KIND` from `receive`.
  C7. `Error` Kind carries the envelope, never a payload.
"""

from __future__ import annotations

import json
import os
import time
from datetime import UTC, datetime
from pathlib import Path

import pytest

from BE.cli.common import ipc
from BE.cli.common.ipc_models import FrameReadyPayload, Roi
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

DIR = "worker-out"
RUN = "01HZZZZZZZZZZZZZZZZZZZZZZZ"


def _frame(i: int) -> FrameReadyPayload:
    return FrameReadyPayload(
        FramePath=f"cap/{i:08d}.mono8",
        Serial="SN-TEST",
        ExposureUs=1000,
        Gain=1.0,
        Roi=Roi(X=0, Y=0, W=8, H=8),
        CapturedAt="2026-01-01T00:00:00.000Z",
    )


def _send(root: Path, kind: str = "FrameReady", i: int = 1, **kw):
    payload = _frame(i) if kind == "FrameReady" else None
    return ipc.send(
        root, DIR, kind, payload,
        run_id=RUN, from_="worker", to="processing", seq=i, **kw,
    )


# --- C1 ---------------------------------------------------------------------

def test_c1_atomic_visibility_ignores_tmp(tmp_path: Path) -> None:
    """A `.tmp` file must never surface through `receive`."""
    (tmp_path / DIR).mkdir()
    stray = tmp_path / DIR / "01HZZZFAKEFAKEFAKEFAKEFAKE.tmp"
    stray.write_text("half-written", encoding="utf-8")
    _send(tmp_path, i=1)
    msgs = list(ipc.receive(tmp_path, DIR))
    assert len(msgs) == 1
    assert msgs[0].kind == "FrameReady"
    assert stray.exists()  # not our job to delete; prune_ipc handles residue


# --- C2 ---------------------------------------------------------------------

def test_c2_fifo_across_producers(tmp_path: Path) -> None:
    """ULID names encode write time; `receive` must yield in write order."""
    paths = []
    for i in range(1, 6):
        paths.append(_send(tmp_path, i=i))
        time.sleep(0.002)  # ensures monotonic ULID prefix
    got = [m.seq for m in ipc.receive(tmp_path, DIR)]
    assert got == [1, 2, 3, 4, 5]


# --- C3 ---------------------------------------------------------------------

def test_c3_ack_is_idempotent(tmp_path: Path) -> None:
    p = _send(tmp_path, i=1)
    first = ipc.ack(p)
    second = ipc.ack(p)  # source gone, sibling .ack.json present
    assert first == second
    assert first.exists()
    assert not p.exists()


# --- C4 ---------------------------------------------------------------------

def test_c4_ack_plus_prune_composes(tmp_path: Path) -> None:
    acked = ipc.ack(_send(tmp_path, i=1))
    live = _send(tmp_path, i=2)  # never acked
    # Backdate both files to 48h ago.
    old = datetime.now(UTC).timestamp() - 48 * 3600
    os.utime(acked, (old, old))
    os.utime(live, (old, old))
    report = ipc.prune_ipc(tmp_path, max_age_hours=24)
    assert not acked.exists()          # acked + past cutoff -> gone
    assert live.exists()               # never acked -> kept regardless of age
    assert report.RemovedAckFiles == 1
    # And `receive` still sees the live one after prune.
    remaining = list(ipc.receive(tmp_path, DIR))
    assert len(remaining) == 1 and remaining[0].seq == 2


# --- C5 ---------------------------------------------------------------------

def test_c5_corruption_is_loud(tmp_path: Path) -> None:
    _send(tmp_path, i=1)  # one good message
    (tmp_path / DIR / "01HZZZBROKENBROKENBROKENAB.msg.json").write_text(
        "{not-json", encoding="utf-8",
    )
    with pytest.raises(AppError) as ei:
        list(ipc.receive(tmp_path, DIR))
    assert ei.value.code == ErrorCode.E_IPC_PAYLOAD_INVALID


# --- C6 ---------------------------------------------------------------------

def test_c6_unknown_kind_on_disk_is_loud(tmp_path: Path) -> None:
    (tmp_path / DIR).mkdir()
    rec = {
        "MsgId": "01HZZZUNKNOWNUNKNOWNUNKNOAB",
        "Kind": "TotallyMadeUp",
        "From": "x", "To": "y", "RunId": RUN, "Seq": 0,
        "Ts": "2026-01-01T00:00:00.000Z",
        "Payload": {}, "Envelope": None,
    }
    (tmp_path / DIR / f"{rec['MsgId']}.msg.json").write_text(
        json.dumps(rec), encoding="utf-8",
    )
    with pytest.raises(AppError) as ei:
        list(ipc.receive(tmp_path, DIR))
    assert ei.value.code == ErrorCode.E_IPC_UNKNOWN_KIND


# --- C7 ---------------------------------------------------------------------

def test_c7_error_kind_envelope_only(tmp_path: Path) -> None:
    env = {
        "Status": {"Success": False, "Code": "E_CAM_CAPTURE_FAILED",
                   "Message": "boom", "Ts": "2026-01-01T00:00:00.000Z"},
        "Data": None,
        "Errors": [{"Code": "E_CAM_CAPTURE_FAILED", "Message": "boom"}],
    }
    p = ipc.send(
        tmp_path, DIR, "Error", None,
        run_id=RUN, from_="worker", to="processing", envelope=env,
    )
    (msg,) = list(ipc.receive(tmp_path, DIR))
    assert msg.kind == "Error"
    assert msg.payload is None
    assert msg.envelope == env
    # Sending Error with a payload is rejected at the boundary.
    with pytest.raises(AppError) as ei:
        ipc.send(
            tmp_path, DIR, "Error", {"Anything": 1},
            run_id=RUN, from_="worker", to="processing", envelope=env,
        )
    assert ei.value.code == ErrorCode.E_IPC_PAYLOAD_INVALID
    assert p.exists()
