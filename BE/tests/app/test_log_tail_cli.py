"""Plan 90 Step 109 tests - unified `bin/log-tail.py` CLI.

Drives the CLI via subprocess against a `jsonl_rotator`-produced
current/previous pair and asserts:
- previous-then-current ordering
- --limit tail semantics
- --filter Key=Value equality
- JSON vs human output
- default --previous fallback (<current>.1)
- exit 2 on bad usage, exit 3 on unreadable input
- poison-line surfacing in output (never silent truncation)
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from BE.app.jsonl_rotator import append_and_roll

REPO_ROOT = Path(__file__).resolve().parents[3]
CLI = REPO_ROOT / "bin" / "log-tail.py"


def _run(*args: str) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(REPO_ROOT) + os.pathsep + env.get("PYTHONPATH", "")
    return subprocess.run(
        [sys.executable, str(CLI), *args],
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )


def _seed(tmp_path: Path, current_rows: list[dict], previous_rows: list[dict]) -> tuple[Path, Path]:
    current = tmp_path / "audit.log"
    previous = tmp_path / "audit.log.1"
    if previous_rows:
        append_and_roll(previous, tmp_path / "audit.log.1.older",
                        previous_rows, max_bytes=1 << 30)
    if current_rows:
        append_and_roll(current, previous, current_rows, max_bytes=1 << 30)
    return current, previous


def test_orders_previous_then_current(tmp_path: Path) -> None:
    current, previous = _seed(
        tmp_path,
        current_rows=[{"i": 3}, {"i": 4}],
        previous_rows=[{"i": 1}, {"i": 2}],
    )
    r = _run("--current", str(current), "--previous", str(previous), "--format", "json")
    assert r.returncode == 0, r.stderr
    got = json.loads(r.stdout)
    assert [e["i"] for e in got] == [1, 2, 3, 4]


def test_limit_returns_last_n(tmp_path: Path) -> None:
    current, previous = _seed(
        tmp_path,
        current_rows=[{"i": i} for i in range(3, 8)],
        previous_rows=[{"i": 1}, {"i": 2}],
    )
    r = _run("--current", str(current), "--previous", str(previous),
             "--limit", "3", "--format", "json")
    assert r.returncode == 0
    assert [e["i"] for e in json.loads(r.stdout)] == [5, 6, 7]


def test_filter_equality(tmp_path: Path) -> None:
    current, previous = _seed(
        tmp_path,
        current_rows=[{"i": 1, "Kind": "A"}, {"i": 2, "Kind": "B"},
                      {"i": 3, "Kind": "A"}],
        previous_rows=[],
    )
    r = _run("--current", str(current), "--filter", "Kind=A", "--format", "json")
    assert r.returncode == 0
    assert [e["i"] for e in json.loads(r.stdout)] == [1, 3]


def test_default_previous_fallback(tmp_path: Path) -> None:
    current, _ = _seed(
        tmp_path,
        current_rows=[{"i": 2}],
        previous_rows=[{"i": 1}],
    )
    r = _run("--current", str(current), "--format", "json")
    assert r.returncode == 0
    assert [e["i"] for e in json.loads(r.stdout)] == [1, 2]


def test_missing_files_prints_empty(tmp_path: Path) -> None:
    r = _run("--current", str(tmp_path / "nope.log"), "--format", "json")
    assert r.returncode == 0
    assert json.loads(r.stdout) == []


def test_human_format_serializes_sorted_keys(tmp_path: Path) -> None:
    current, _ = _seed(tmp_path, current_rows=[{"b": 2, "a": 1}], previous_rows=[])
    r = _run("--current", str(current), "--format", "human")
    assert r.returncode == 0
    assert r.stdout.strip() == '{"a": 1, "b": 2}'


def test_poison_line_surfaces(tmp_path: Path) -> None:
    current = tmp_path / "audit.log"
    current.write_text('{"i": 1}\nnot-json\n{"i": 2}\n', encoding="utf-8")
    r = _run("--current", str(current), "--format", "json")
    assert r.returncode == 0
    entries = json.loads(r.stdout)
    assert len(entries) == 3
    assert entries[1].get("_Raw") == "not-json"
    assert "_ParseError" in entries[1]


def test_bad_limit_exit_2(tmp_path: Path) -> None:
    r = _run("--current", str(tmp_path / "x.log"), "--limit", "0")
    assert r.returncode == 2
    assert "--limit" in r.stderr


def test_bad_filter_exit_2(tmp_path: Path) -> None:
    r = _run("--current", str(tmp_path / "x.log"), "--filter", "noequals")
    assert r.returncode == 2
    assert "--filter" in r.stderr


def test_missing_required_current_exit_2(tmp_path: Path) -> None:
    r = _run("--limit", "5")
    assert r.returncode == 2


def test_unreadable_current_exit_3(tmp_path: Path) -> None:
    # Directory in place of a file forces OSError in read_jsonl.
    bad = tmp_path / "audit.log"
    bad.mkdir()
    r = _run("--current", str(bad), "--format", "json")
    assert r.returncode == 3
    assert "unreadable input" in r.stderr


@pytest.mark.parametrize("fmt", ["json", "human"])
def test_empty_stream_prints_empty(tmp_path: Path, fmt: str) -> None:
    current = tmp_path / "audit.log"
    current.write_text("", encoding="utf-8")
    r = _run("--current", str(current), "--format", fmt)
    assert r.returncode == 0
    if fmt == "json":
        assert json.loads(r.stdout) == []
    else:
        assert r.stdout.strip() == ""


def test_filter_missing_key_matches_nothing(tmp_path: Path) -> None:
    current, _ = _seed(tmp_path, current_rows=[{"i": 1}], previous_rows=[])
    r = _run("--current", str(current), "--filter", "Kind=A", "--format", "json")
    assert r.returncode == 0
    assert json.loads(r.stdout) == []


def test_filter_empty_key_exit_2(tmp_path: Path) -> None:
    r = _run("--current", str(tmp_path / "x.log"), "--filter", "=value")
    assert r.returncode == 2


def test_limit_larger_than_total_returns_all(tmp_path: Path) -> None:
    current, previous = _seed(
        tmp_path,
        current_rows=[{"i": 2}],
        previous_rows=[{"i": 1}],
    )
    r = _run("--current", str(current), "--previous", str(previous),
             "--limit", "99", "--format", "json")
    assert r.returncode == 0
    assert [e["i"] for e in json.loads(r.stdout)] == [1, 2]
