"""Plan 90 Step 17 tests - session index."""

from __future__ import annotations

import json
import os
import threading
import time
from pathlib import Path

import pytest

from BE.cli.common.session_index import (
    INDEX_DIRNAME,
    INDEX_FILE,
    LOCK_FILE,
    SessionRef,
    close_session,
    open_session,
    read_sessions,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _open(root: Path, run_id: str = "R1") -> SessionRef:
    return open_session(
        root,
        source="worker-cli",
        subcmd="capture",
        pid=os.getpid(),
        run_id=run_id,
        log_path=root / "worker-cli" / "2026-07-21" / "091234-1-capture.jsonl",
    )


def test_open_creates_index_with_shape(tmp_path: Path) -> None:
    ref = _open(tmp_path)
    idx = tmp_path / INDEX_DIRNAME / INDEX_FILE
    data = json.loads(idx.read_text(encoding="utf-8"))
    assert list(data) == ["Sessions"]
    assert len(data["Sessions"]) == 1
    row = data["Sessions"][0]
    assert set(row) == {"RunId", "Source", "Subcmd", "Pid", "StartedAt", "LogPath", "EndedAt", "ExitCode"}
    assert row["EndedAt"] is None and row["ExitCode"] is None
    assert row["RunId"] == ref.RunId


def test_close_sets_ended_at_and_exit_code(tmp_path: Path) -> None:
    _open(tmp_path)
    row = close_session(tmp_path, run_id="R1", exit_code=0)
    assert row.ExitCode == 0 and row.EndedAt is not None
    persisted = read_sessions(tmp_path)[0]
    assert persisted.ExitCode == 0 and persisted.EndedAt is not None


def test_multiple_sessions_appended(tmp_path: Path) -> None:
    _open(tmp_path, "R1"); _open(tmp_path, "R2"); _open(tmp_path, "R3")
    rows = read_sessions(tmp_path)
    assert [r.RunId for r in rows] == ["R1", "R2", "R3"]


def test_duplicate_run_id_rejected(tmp_path: Path) -> None:
    _open(tmp_path, "R1")
    with pytest.raises(AppError) as ei:
        _open(tmp_path, "R1")
    assert ei.value.code is ErrorCode.E_LOG_INDEX_LOCKED


def test_close_unknown_run_id_fails(tmp_path: Path) -> None:
    _open(tmp_path, "R1")
    with pytest.raises(AppError) as ei:
        close_session(tmp_path, run_id="R2", exit_code=1)
    assert ei.value.code is ErrorCode.E_CLI_PREFLIGHT_FAILED


def test_read_sessions_missing_index_returns_empty(tmp_path: Path) -> None:
    assert read_sessions(tmp_path) == []


def test_stale_lock_from_dead_pid_is_stolen(tmp_path: Path) -> None:
    lock = tmp_path / INDEX_DIRNAME / LOCK_FILE
    lock.parent.mkdir(parents=True, exist_ok=True)
    lock.write_text("999999")  # very likely dead
    old = time.time() - 3600
    os.utime(lock, (old, old))
    # Should succeed by stealing the stale lock
    ref = _open(tmp_path, "R1")
    assert ref.RunId == "R1"
    assert not lock.exists()


def test_fresh_lock_blocks_and_times_out(tmp_path: Path) -> None:
    lock = tmp_path / INDEX_DIRNAME / LOCK_FILE
    lock.parent.mkdir(parents=True, exist_ok=True)
    lock.write_text(str(os.getpid()))  # alive pid, fresh mtime
    with pytest.raises(AppError) as ei:
        open_session(
            tmp_path,
            source="worker-cli", subcmd="x", pid=1, run_id="R1",
            log_path=tmp_path / "x.jsonl",
            timeout=0.2, stale_seconds=60,
        )
    assert ei.value.code is ErrorCode.E_LOG_INDEX_LOCKED


def test_corrupt_index_raises(tmp_path: Path) -> None:
    idx = tmp_path / INDEX_DIRNAME / INDEX_FILE
    idx.parent.mkdir(parents=True, exist_ok=True)
    idx.write_text("{not json")
    with pytest.raises(AppError):
        _open(tmp_path, "R1")


def test_invalid_shape_index_raises(tmp_path: Path) -> None:
    idx = tmp_path / INDEX_DIRNAME / INDEX_FILE
    idx.parent.mkdir(parents=True, exist_ok=True)
    idx.write_text('{"Sessions": "not-a-list"}')
    with pytest.raises(AppError):
        _open(tmp_path, "R1")


def test_concurrent_open_serialised(tmp_path: Path) -> None:
    errors: list[BaseException] = []

    def worker(i: int) -> None:
        try:
            open_session(
                tmp_path,
                source="worker-cli", subcmd="cap", pid=os.getpid(),
                run_id=f"R{i}",
                log_path=tmp_path / f"{i}.jsonl",
                timeout=5.0,
            )
        except BaseException as e:  # pragma: no cover - reported via list
            errors.append(e)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert errors == []
    rows = read_sessions(tmp_path)
    assert sorted(r.RunId for r in rows) == [f"R{i}" for i in range(10)]


def test_lock_file_released_after_write(tmp_path: Path) -> None:
    _open(tmp_path, "R1")
    assert not (tmp_path / INDEX_DIRNAME / LOCK_FILE).exists()


def test_lock_released_even_when_mutation_raises(tmp_path: Path) -> None:
    _open(tmp_path, "R1")
    with pytest.raises(AppError):
        _open(tmp_path, "R1")  # duplicate -> raises inside mutate
    assert not (tmp_path / INDEX_DIRNAME / LOCK_FILE).exists()
