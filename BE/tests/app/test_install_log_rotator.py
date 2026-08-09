"""Plan 90 Step 107 tests - installer log rotation + tail CLI.

Covers `BE.app.install_log_rotator.rotate_manifest`, `read_archive_entries`,
and the `bin/install-log-tail.py` CLI via subprocess.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

from BE.app.install_log_rotator import (
    ARCHIVE_FILENAME,
    ARCHIVE_PREVIOUS_FILENAME,
    DEFAULT_ARCHIVE_MAX_BYTES,
    DEFAULT_MAX_ACTIONS,
    archive_path,
    previous_archive_path,
    read_archive_entries,
    rotate_manifest,
)
from BE.app.install_manifest import (
    MANIFEST_FILENAME,
    ManifestActionRecord,
    init_manifest,
    read_manifest_strict,
    record_action,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

REPO_ROOT = Path(__file__).resolve().parents[3]


def _mk(i: int, *, phase: str = "install", ok: bool = True) -> ManifestActionRecord:
    return ManifestActionRecord(
        Name=f"step-{i:03d}",
        Script="bin/x.py",
        Args=(),
        Phase=phase,
        StartedAt=f"2026-07-21T00:{i // 60:02d}:{i % 60:02d}+00:00",
        CompletedAt=f"2026-07-21T00:{i // 60:02d}:{i % 60:02d}+00:00",
        DurationMs=i,
        ExitCode=0 if ok else 1,
        IsCritical=False,
        IsSuccess=ok,
    )


def _seed(root: Path, n: int) -> None:
    init_manifest(root, app_version="9.9.9", platform="posix",
                  now=datetime(2026, 7, 21, tzinfo=timezone.utc))
    for i in range(n):
        record_action(root, _mk(i))


def test_noop_when_under_threshold(tmp_path: Path) -> None:
    _seed(tmp_path, 5)
    out = rotate_manifest(tmp_path, max_actions=10)
    assert out.IsRotated is False
    assert out.ArchivedCount == 0
    assert out.RemainingCount == 5
    assert not archive_path(tmp_path).exists()


def test_noop_when_no_manifest(tmp_path: Path) -> None:
    out = rotate_manifest(tmp_path, max_actions=10)
    assert out.IsRotated is False
    assert out.RemainingCount == 0


def test_moves_oldest_overflow_to_archive(tmp_path: Path) -> None:
    _seed(tmp_path, 12)
    out = rotate_manifest(tmp_path, max_actions=5)
    assert out.IsRotated is True
    assert out.ArchivedCount == 7
    assert out.RemainingCount == 5
    m = read_manifest_strict(tmp_path)
    assert [a["Name"] for a in m.Actions] == [f"step-{i:03d}" for i in range(7, 12)]
    archived = read_archive_entries(tmp_path)
    assert [a["Name"] for a in archived] == [f"step-{i:03d}" for i in range(7)]


def test_idempotent_second_call_is_noop(tmp_path: Path) -> None:
    _seed(tmp_path, 12)
    rotate_manifest(tmp_path, max_actions=5)
    out = rotate_manifest(tmp_path, max_actions=5)
    assert out.IsRotated is False
    assert out.ArchivedCount == 0


def test_rolls_archive_when_oversize(tmp_path: Path) -> None:
    _seed(tmp_path, 20)
    # First rotation: creates .log
    out1 = rotate_manifest(tmp_path, max_actions=5, archive_max_bytes=64)
    assert out1.IsRotated is True
    # Second rotation with more overflow will trigger a roll because
    # .log already exists and exceeds 64 bytes.
    for i in range(20, 30):
        record_action(tmp_path, _mk(i))
    out2 = rotate_manifest(tmp_path, max_actions=5, archive_max_bytes=64)
    assert out2.IsRotated is True
    assert out2.IsArchiveRolled is True
    assert previous_archive_path(tmp_path).exists()
    assert archive_path(tmp_path).exists()


def test_poison_line_surfaces_in_read(tmp_path: Path) -> None:
    _seed(tmp_path, 12)
    rotate_manifest(tmp_path, max_actions=5)
    with open(archive_path(tmp_path), "a", encoding="utf-8") as f:
        f.write("not-json\n")
    entries = read_archive_entries(tmp_path)
    poison = [e for e in entries if "_ParseError" in e]
    assert len(poison) == 1
    assert poison[0]["_Raw"] == "not-json"


def test_rejects_bad_max_actions(tmp_path: Path) -> None:
    _seed(tmp_path, 3)
    with pytest.raises(AppError) as exc:
        rotate_manifest(tmp_path, max_actions=0)
    assert exc.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID


def test_rejects_bad_archive_max_bytes(tmp_path: Path) -> None:
    _seed(tmp_path, 3)
    with pytest.raises(AppError) as exc:
        rotate_manifest(tmp_path, max_actions=1, archive_max_bytes=-1)
    assert exc.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID


def test_rejects_bool_max_actions(tmp_path: Path) -> None:
    with pytest.raises(AppError):
        rotate_manifest(tmp_path, max_actions=True)  # type: ignore[arg-type]


def test_read_archive_order_previous_then_current(tmp_path: Path) -> None:
    _seed(tmp_path, 20)
    rotate_manifest(tmp_path, max_actions=5, archive_max_bytes=64)
    for i in range(20, 30):
        record_action(tmp_path, _mk(i))
    rotate_manifest(tmp_path, max_actions=5, archive_max_bytes=64)
    entries = read_archive_entries(tmp_path)
    # Oldest step-000 must appear before newest archived step.
    names = [e.get("Name") for e in entries if "Name" in e]
    assert names == sorted(names, key=lambda n: int(n.split("-")[1]))


def test_defaults_are_sane_positive() -> None:
    assert DEFAULT_MAX_ACTIONS > 0
    assert DEFAULT_ARCHIVE_MAX_BYTES > 0


# ------------------------- CLI tests -------------------------


def _run_cli(*args: str) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(REPO_ROOT) + os.pathsep + env.get("PYTHONPATH", "")
    return subprocess.run(
        [sys.executable, str(REPO_ROOT / "bin" / "install-log-tail.py"), *args],
        capture_output=True, text=True, env=env, check=False,
    )


def test_cli_prints_manifest_tail_human(tmp_path: Path) -> None:
    _seed(tmp_path, 3)
    res = _run_cli("--install-root", str(tmp_path), "--limit", "10")
    assert res.returncode == 0, res.stderr
    assert "step-000" in res.stdout
    assert "step-002" in res.stdout


def test_cli_json_output(tmp_path: Path) -> None:
    _seed(tmp_path, 2)
    res = _run_cli("--install-root", str(tmp_path), "--format", "json")
    assert res.returncode == 0, res.stderr
    data = json.loads(res.stdout)
    assert isinstance(data, list) and len(data) == 2


def test_cli_limit_truncates_oldest(tmp_path: Path) -> None:
    _seed(tmp_path, 10)
    res = _run_cli("--install-root", str(tmp_path), "--limit", "2", "--format", "json")
    assert res.returncode == 0
    data = json.loads(res.stdout)
    assert [d["Name"] for d in data] == ["step-008", "step-009"]


def test_cli_filter_by_name(tmp_path: Path) -> None:
    _seed(tmp_path, 5)
    res = _run_cli("--install-root", str(tmp_path), "--name", "step-002",
                   "--format", "json")
    assert res.returncode == 0
    assert [d["Name"] for d in json.loads(res.stdout)] == ["step-002"]


def test_cli_filter_by_status_failure(tmp_path: Path) -> None:
    init_manifest(tmp_path, app_version="1", platform="posix",
                  now=datetime(2026, 1, 1, tzinfo=timezone.utc))
    record_action(tmp_path, _mk(0, ok=True))
    record_action(tmp_path, _mk(1, ok=False))
    res = _run_cli("--install-root", str(tmp_path),
                   "--status", "failure", "--format", "json")
    assert res.returncode == 0
    data = json.loads(res.stdout)
    assert len(data) == 1 and data[0]["IsSuccess"] is False


def test_cli_include_archive_merges(tmp_path: Path) -> None:
    _seed(tmp_path, 12)
    rotate_manifest(tmp_path, max_actions=5)
    res = _run_cli("--install-root", str(tmp_path), "--limit", "100",
                   "--include-archive", "--format", "json")
    assert res.returncode == 0
    data = json.loads(res.stdout)
    assert len(data) == 12
    assert data[0]["Name"] == "step-000"
    assert data[-1]["Name"] == "step-011"


def test_cli_bad_limit_exits_2(tmp_path: Path) -> None:
    _seed(tmp_path, 1)
    res = _run_cli("--install-root", str(tmp_path), "--limit", "0")
    assert res.returncode == 2
    assert "--limit" in res.stderr


def test_cli_missing_manifest_prints_empty(tmp_path: Path) -> None:
    res = _run_cli("--install-root", str(tmp_path), "--format", "json")
    assert res.returncode == 0
    assert json.loads(res.stdout) == []


# ---------- install-record rotation wiring ----------


def test_install_record_triggers_rotation(tmp_path: Path) -> None:
    """install-record.py invokes rotate_manifest after successful append."""
    env = os.environ.copy()
    env["PYTHONPATH"] = str(REPO_ROOT) + os.pathsep + env.get("PYTHONPATH", "")

    # Seed 5 entries, then run install-record with max-actions=3 so rotation fires.
    _seed(tmp_path, 5)
    res = subprocess.run(
        [
            sys.executable, str(REPO_ROOT / "bin" / "install-record.py"),
            "--install-root", str(tmp_path),
            "--app-version", "9.9.9",
            "--platform", "posix",
            "--name", "recorded-one",
            "--script", "bin/x.py",
            "--args-json", "[]",
            "--phase", "install",
            "--started-at", "2026-07-21T00:00:00+00:00",
            "--completed-at", "2026-07-21T00:00:01+00:00",
            "--duration-ms", "1000",
            "--exit-code", "0",
            "--is-critical", "false",
            "--max-actions", "3",
        ],
        capture_output=True, text=True, env=env, check=False,
    )
    assert res.returncode == 0, res.stderr
    m = read_manifest_strict(tmp_path)
    assert len(m.Actions) == 3
    assert m.Actions[-1]["Name"] == "recorded-one"
    assert (tmp_path / ARCHIVE_FILENAME).exists()
    assert (tmp_path / MANIFEST_FILENAME).exists()
    # Previous archive not created on first rotation.
    assert not (tmp_path / ARCHIVE_PREVIOUS_FILENAME).exists()
