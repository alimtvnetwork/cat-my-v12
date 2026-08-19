"""Contract tests for BE/cli/common/ipc.py (Plan 90 Step 23).

Verifies spec/21-app/76-cli-log-and-ipc.md §"IPC protocol":
atomic write, one-message-per-file, PascalCase payload keys, Kind-specific
required fields, ack rename, and E_IPC_* error surface.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from BE.cli.common import ipc
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _frame_payload() -> dict:
    return {
        "FramePath": "data/frames/00000001.mono8",
        "Serial": "MER2-XYZ",
        "ExposureUs": 5000,
        "Gain": 1.0,
        "Roi": {"X": 0, "Y": 0, "W": 1024, "H": 768},
        "CapturedAt": "2026-07-21T00:00:00.000000Z",
    }


def test_send_writes_atomic_msg_json(tmp_path: Path) -> None:
    path = ipc.send(
        tmp_path,
        "worker-out",
        "FrameReady",
        _frame_payload(),
        run_id="R1",
        from_="worker-cli",
        to="processing-cli",
        seq=1,
    )
    assert path.exists()
    assert path.name.endswith(".msg.json")
    # No .tmp leftover.
    assert list((tmp_path / "worker-out").glob("*.tmp")) == []
    record = json.loads(path.read_text(encoding="utf-8"))
    assert record["Kind"] == "FrameReady"
    assert record["From"] == "worker-cli"
    assert record["RunId"] == "R1"
    assert record["Seq"] == 1
    assert record["Envelope"] is None
    assert record["Payload"]["Serial"] == "MER2-XYZ"


def test_send_unknown_kind_raises(tmp_path: Path) -> None:
    with pytest.raises(AppError) as ei:
        ipc.send(
            tmp_path, "worker-out", "Bogus", {}, run_id="R", from_="w", to="p"
        )
    assert ei.value.code == ErrorCode.E_IPC_UNKNOWN_KIND


def test_send_missing_required_fields(tmp_path: Path) -> None:
    payload = _frame_payload()
    del payload["Gain"]
    with pytest.raises(AppError) as ei:
        ipc.send(
            tmp_path,
            "worker-out",
            "FrameReady",
            payload,
            run_id="R",
            from_="w",
            to="p",
        )
    assert ei.value.code == ErrorCode.E_IPC_PAYLOAD_INVALID
    assert "Gain" in str(ei.value)


def test_send_rejects_non_pascal_key(tmp_path: Path) -> None:
    p = _frame_payload()
    p["snake_case"] = 1
    with pytest.raises(AppError) as ei:
        ipc.send(
            tmp_path, "worker-out", "FrameReady", p,
            run_id="R", from_="w", to="p",
        )
    assert ei.value.code == ErrorCode.E_IPC_PAYLOAD_INVALID


def test_send_rejects_non_json_safe(tmp_path: Path) -> None:
    p = _frame_payload()
    p["Extra"] = {"Blob": b"\x00\x01"}
    with pytest.raises(AppError) as ei:
        ipc.send(
            tmp_path, "worker-out", "FrameReady", p,
            run_id="R", from_="w", to="p",
        )
    assert ei.value.code == ErrorCode.E_IPC_PAYLOAD_INVALID


def test_send_error_kind_requires_null_payload(tmp_path: Path) -> None:
    with pytest.raises(AppError) as ei:
        ipc.send(
            tmp_path, "worker-out", "Error",
            {"Anything": 1}, run_id="R", from_="w", to="p",
        )
    assert ei.value.code == ErrorCode.E_IPC_PAYLOAD_INVALID
    # Null payload with an envelope is accepted.
    path = ipc.send(
        tmp_path, "worker-out", "Error", None,
        run_id="R", from_="w", to="p",
        envelope={"Status": {"Success": False}, "Errors": []},
    )
    rec = json.loads(path.read_text(encoding="utf-8"))
    assert rec["Payload"] is None
    assert rec["Envelope"]["Status"]["Success"] is False


def test_send_rejects_bad_dir_name(tmp_path: Path) -> None:
    with pytest.raises(AppError) as ei:
        ipc.send(
            tmp_path, "Worker/Out", "Heartbeat",
            {"Uptime": 1, "MemoryMb": 2, "LastEvent": "x"},
            run_id="R", from_="w", to="p",
        )
    assert ei.value.code == ErrorCode.E_IPC_PAYLOAD_INVALID


def test_receive_yields_in_order_and_ack(tmp_path: Path) -> None:
    for i in range(3):
        ipc.send(
            tmp_path, "worker-out", "FrameReady", _frame_payload(),
            run_id="R", from_="w", to="p", seq=i,
        )
    msgs = list(ipc.receive(tmp_path, "worker-out"))
    assert len(msgs) == 3
    assert [m.seq for m in msgs] == sorted(m.seq for m in msgs)
    ack_path = ipc.ack(msgs[0].path)
    assert ack_path.name.endswith(".msg.ack.json")
    assert not msgs[0].path.exists()
    # Ack'd file is no longer surfaced.
    remaining = list(ipc.receive(tmp_path, "worker-out"))
    assert len(remaining) == 2


def test_receive_kind_filter_and_unknown_kind_filter(tmp_path: Path) -> None:
    ipc.send(
        tmp_path, "worker-out", "Heartbeat",
        {"Uptime": 1, "MemoryMb": 2, "LastEvent": "x"},
        run_id="R", from_="w", to="p",
    )
    ipc.send(
        tmp_path, "worker-out", "FrameReady", _frame_payload(),
        run_id="R", from_="w", to="p",
    )
    frames = list(ipc.receive(tmp_path, "worker-out", kind_filter={"FrameReady"}))
    assert len(frames) == 1 and frames[0].kind == "FrameReady"
    with pytest.raises(AppError) as ei:
        list(ipc.receive(tmp_path, "worker-out", kind_filter={"Bogus"}))
    assert ei.value.code == ErrorCode.E_IPC_UNKNOWN_KIND


def test_receive_rejects_corrupt_file(tmp_path: Path) -> None:
    drop = tmp_path / "worker-out"
    drop.mkdir(parents=True)
    (drop / "abc.msg.json").write_text("not-json", encoding="utf-8")
    with pytest.raises(AppError) as ei:
        list(ipc.receive(tmp_path, "worker-out"))
    assert ei.value.code == ErrorCode.E_IPC_PAYLOAD_INVALID


def test_receive_rejects_unknown_kind_on_disk(tmp_path: Path) -> None:
    drop = tmp_path / "worker-out"
    drop.mkdir(parents=True)
    (drop / "abc.msg.json").write_text(
        json.dumps({"Kind": "Nope", "Payload": None}), encoding="utf-8"
    )
    with pytest.raises(AppError) as ei:
        list(ipc.receive(tmp_path, "worker-out"))
    assert ei.value.code == ErrorCode.E_IPC_UNKNOWN_KIND


def test_receive_missing_dir_is_empty(tmp_path: Path) -> None:
    assert list(ipc.receive(tmp_path, "worker-out")) == []


def test_ack_wrong_suffix_raises(tmp_path: Path) -> None:
    f = tmp_path / "foo.txt"
    f.write_text("x")
    with pytest.raises(AppError) as ei:
        ipc.ack(f)
    assert ei.value.code == ErrorCode.E_IPC_PAYLOAD_INVALID


# --- Step 24: typed Pydantic payload model integration ---------------------

from BE.cli.common.ipc_models import (
    PAYLOAD_MODELS,
    FrameReadyPayload,
    HeartbeatPayload,
    ResultReadyPayload,
    Roi,
)


def test_payload_models_cover_all_non_error_kinds() -> None:
    assert set(PAYLOAD_MODELS.keys()) == {"FrameReady", "ResultReady", "Heartbeat"}
    assert "Error" not in PAYLOAD_MODELS  # envelope-only per spec line 114


def test_send_accepts_typed_model_instance(tmp_path: Path) -> None:
    model = FrameReadyPayload(
        FramePath="data/frames/1.mono8",
        Serial="MER2-XYZ",
        ExposureUs=5000,
        Gain=1.0,
        Roi=Roi(X=0, Y=0, W=1024, H=768),
        CapturedAt="2026-07-21T00:00:00.000000Z",
    )
    path = ipc.send(
        tmp_path, "worker-out", "FrameReady", model,
        run_id="R", from_="worker-cli", to="processing-cli",
    )
    rec = json.loads(path.read_text(encoding="utf-8"))
    assert rec["Payload"]["Roi"] == {"X": 0, "Y": 0, "W": 1024, "H": 768}


def test_send_rejects_wrong_model_for_kind(tmp_path: Path) -> None:
    hb = HeartbeatPayload(Uptime=1.0, MemoryMb=10.0, LastEvent="x")
    with pytest.raises(AppError) as ei:
        ipc.send(
            tmp_path, "worker-out", "FrameReady", hb,
            run_id="R", from_="w", to="p",
        )
    assert ei.value.code == ErrorCode.E_IPC_PAYLOAD_INVALID


def test_send_rejects_extra_field(tmp_path: Path) -> None:
    p = {
        "Uptime": 1.0, "MemoryMb": 10.0, "LastEvent": "x",
        "BonusField": "nope",  # extra="forbid" on the model
    }
    with pytest.raises(AppError) as ei:
        ipc.send(
            tmp_path, "worker-out", "Heartbeat", p,
            run_id="R", from_="w", to="p",
        )
    assert ei.value.code == ErrorCode.E_IPC_PAYLOAD_INVALID


def test_send_rejects_wrong_type(tmp_path: Path) -> None:
    p = {
        "ResultsPath": "x", "RunId": "R", "FrameSeq": 0,
        "Decision": "pass", "RuleCount": 3, "PassCount": 3,
        "FailCount": "zero",  # must be int
    }
    with pytest.raises(AppError) as ei:
        ipc.send(
            tmp_path, "worker-out", "ResultReady", p,
            run_id="R", from_="w", to="p",
        )
    assert ei.value.code == ErrorCode.E_IPC_PAYLOAD_INVALID


def test_send_rejects_negative_bounds(tmp_path: Path) -> None:
    p = {"Uptime": -0.1, "MemoryMb": 1.0, "LastEvent": ""}
    with pytest.raises(AppError) as ei:
        ipc.send(
            tmp_path, "worker-out", "Heartbeat", p,
            run_id="R", from_="w", to="p",
        )
    assert ei.value.code == ErrorCode.E_IPC_PAYLOAD_INVALID


def test_result_ready_dict_roundtrip(tmp_path: Path) -> None:
    p = {
        "ResultsPath": "results/1.json",
        "RunId": "R1",
        "FrameSeq": 42,
        "Decision": "pass",
        "RuleCount": 5,
        "PassCount": 5,
        "FailCount": 0,
    }
    path = ipc.send(
        tmp_path, "processing-out", "ResultReady", p,
        run_id="R1", from_="processing-cli", to="main",
    )
    msg = next(ipc.receive(tmp_path, "processing-out"))
    assert msg.kind == "ResultReady"
    # Re-parse consumer-side to prove typed model still validates.
    model = ResultReadyPayload.model_validate(msg.payload)
    assert model.PassCount == 5 and model.FailCount == 0
    ipc.ack(msg.path)
    assert not path.exists()


# --- Step 25: prune_ipc retention ------------------------------------------

import os as _os
from datetime import UTC, datetime


def _mk(path: Path, age_hours: float) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("{}", encoding="utf-8")
    ts = datetime.now(UTC).timestamp() - age_hours * 3600
    _os.utime(path, (ts, ts))
    return path


def test_prune_ipc_deletes_only_old_ack(tmp_path: Path) -> None:
    old_ack = _mk(tmp_path / "worker-out" / "aaa.msg.ack.json", 48)
    fresh_ack = _mk(tmp_path / "worker-out" / "bbb.msg.ack.json", 1)
    live = _mk(tmp_path / "worker-out" / "ccc.msg.json", 999)  # never touched
    report = ipc.prune_ipc(tmp_path)
    assert not old_ack.exists()
    assert fresh_ack.exists()
    assert live.exists()  # live queue is untouchable
    assert report.RemovedAckFiles == 1
    assert report.ScannedDirs == 1


def test_prune_ipc_deletes_stale_tmp(tmp_path: Path) -> None:
    stale_tmp = _mk(tmp_path / "worker-out" / "orphan.tmp", 48)
    fresh_tmp = _mk(tmp_path / "worker-out" / "inflight.tmp", 0.5)
    report = ipc.prune_ipc(tmp_path)
    assert not stale_tmp.exists()
    assert fresh_tmp.exists()
    assert report.RemovedTmpFiles == 1


def test_prune_ipc_missing_root_is_noop(tmp_path: Path) -> None:
    report = ipc.prune_ipc(tmp_path / "missing")
    assert report.ScannedDirs == 0
    assert report.RemovedAckFiles == 0


def test_prune_ipc_rejects_bad_age(tmp_path: Path) -> None:
    with pytest.raises(AppError) as ei:
        ipc.prune_ipc(tmp_path, max_age_hours=0)
    assert ei.value.code == ErrorCode.E_CLI_PREFLIGHT_FAILED


def test_prune_ipc_ignores_unknown_top_dirs(tmp_path: Path) -> None:
    # e.g. Windows System Volume Information -like folders next to drop-dirs
    weird = _mk(tmp_path / "System Volume Information" / "old.msg.ack.json", 999)
    ipc.prune_ipc(tmp_path)
    assert weird.exists()  # not scanned, not removed
