"""Plan 90 Step 15 tests - log retention pruner."""

from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

import pytest

from BE.cli.common.log_rotation import DEFAULT_KEEP_DAYS, prune_logs
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _seed(root: Path, source: str, day: date, files: int = 1, size: int = 10) -> Path:
    d = root / source / day.strftime("%Y-%m-%d")
    d.mkdir(parents=True, exist_ok=True)
    for i in range(files):
        (d / f"log-{i}.jsonl").write_bytes(b"x" * size)
    return d


def test_missing_root_returns_zero_report(tmp_path: Path) -> None:
    r = prune_logs(tmp_path / "nope")
    assert r.RemovedDirs == 0 and r.ScannedDirs == 0


def test_keeps_today_and_previous_13(tmp_path: Path) -> None:
    ref = date(2026, 7, 21)
    for i in range(0, 14):
        _seed(tmp_path, "worker-cli", ref - timedelta(days=i))
    r = prune_logs(tmp_path, keep_days=DEFAULT_KEEP_DAYS, today=ref)
    assert r.ScannedDirs == 14 and r.RemovedDirs == 0 and r.KeptDirs == 14


def test_removes_dir_at_cutoff_edge(tmp_path: Path) -> None:
    ref = date(2026, 7, 21)
    old = _seed(tmp_path, "worker-cli", ref - timedelta(days=14), files=3, size=100)
    keep = _seed(tmp_path, "worker-cli", ref - timedelta(days=13))
    r = prune_logs(tmp_path, keep_days=14, today=ref)
    assert not old.exists() and keep.exists()
    assert r.RemovedDirs == 1 and r.RemovedFiles == 3 and r.RemovedBytes == 300
    assert r.KeptDirs == 1 and r.CutoffDate == "2026-07-08"


def test_multiple_sources_pruned_independently(tmp_path: Path) -> None:
    ref = date(2026, 7, 21)
    _seed(tmp_path, "worker-cli", ref - timedelta(days=30))
    _seed(tmp_path, "processing-cli", ref - timedelta(days=30))
    _seed(tmp_path, "be", ref)
    r = prune_logs(tmp_path, keep_days=7, today=ref)
    assert r.RemovedDirs == 2 and r.KeptDirs == 1


def test_index_directory_is_preserved(tmp_path: Path) -> None:
    (tmp_path / "index").mkdir()
    (tmp_path / "index" / "current.json").write_text("{}")
    _seed(tmp_path, "worker-cli", date(2020, 1, 1))
    prune_logs(tmp_path, keep_days=7, today=date(2026, 7, 21))
    assert (tmp_path / "index" / "current.json").exists()


def test_non_date_directory_names_are_ignored(tmp_path: Path) -> None:
    src = tmp_path / "worker-cli"
    (src / "not-a-date").mkdir(parents=True)
    (src / "not-a-date" / "junk").write_text("keep me")
    _seed(tmp_path, "worker-cli", date(2020, 1, 1))
    r = prune_logs(tmp_path, keep_days=7, today=date(2026, 7, 21))
    assert (src / "not-a-date" / "junk").exists()
    assert r.ScannedDirs == 1 and r.RemovedDirs == 1


def test_stray_file_in_source_ignored(tmp_path: Path) -> None:
    (tmp_path / "worker-cli").mkdir()
    (tmp_path / "worker-cli" / "stray.txt").write_text("keep")
    _seed(tmp_path, "worker-cli", date(2020, 1, 1))
    prune_logs(tmp_path, keep_days=7, today=date(2026, 7, 21))
    assert (tmp_path / "worker-cli" / "stray.txt").exists()


def test_keep_days_1_keeps_only_today(tmp_path: Path) -> None:
    ref = date(2026, 7, 21)
    _seed(tmp_path, "worker-cli", ref)
    _seed(tmp_path, "worker-cli", ref - timedelta(days=1))
    r = prune_logs(tmp_path, keep_days=1, today=ref)
    assert r.KeptDirs == 1 and r.RemovedDirs == 1


def test_keep_days_zero_rejected(tmp_path: Path) -> None:
    with pytest.raises(AppError) as ei:
        prune_logs(tmp_path, keep_days=0)
    assert ei.value.code is ErrorCode.E_CLI_PREFLIGHT_FAILED


def test_report_context_shape(tmp_path: Path) -> None:
    _seed(tmp_path, "worker-cli", date(2026, 7, 21))
    ctx = prune_logs(tmp_path, keep_days=7, today=date(2026, 7, 21)).to_ctx()
    assert set(ctx) == {
        "ScannedDirs", "RemovedDirs", "RemovedFiles", "RemovedBytes", "KeptDirs", "CutoffDate",
    }
