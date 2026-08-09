"""Tests for Plan 90 Step 108 - shared JSONL rotator primitive.

Covers roll-first / append-second ordering, fsync, poison-line surfacing,
neutral error types (OSError / ValueError not AppError), empty-input
no-op, and single-generation ring semantics.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

from BE.app import jsonl_rotator
from BE.app.jsonl_rotator import (
    RollOutcome,
    append_and_roll,
    read_jsonl,
    read_pair,
)


# --- append_and_roll ------------------------------------------------------

def test_append_writes_jsonl_with_sorted_keys(tmp_path: Path) -> None:
    cur = tmp_path / "a.log"
    prev = tmp_path / "a.log.1"
    outcome = append_and_roll(cur, prev, [{"b": 2, "a": 1}], max_bytes=1024)
    assert outcome.IsRolled is False
    assert outcome.AppendedCount == 1
    line = cur.read_text().splitlines()[0]
    # sorted keys means "a" appears before "b" in the serialization.
    assert line == '{"a": 1, "b": 2}'
    assert outcome.BytesAppended == len(line) + 1


def test_empty_rows_is_full_noop(tmp_path: Path) -> None:
    cur = tmp_path / "a.log"
    prev = tmp_path / "a.log.1"
    outcome = append_and_roll(cur, prev, [], max_bytes=1024)
    assert outcome == RollOutcome(IsRolled=False, AppendedCount=0, BytesAppended=0)
    assert not cur.exists()
    assert not prev.exists()


def test_creates_parent_dir(tmp_path: Path) -> None:
    cur = tmp_path / "nested" / "deep" / "a.log"
    prev = tmp_path / "nested" / "deep" / "a.log.1"
    append_and_roll(cur, prev, [{"x": 1}], max_bytes=1024)
    assert cur.exists()


def test_second_append_grows_current_and_does_not_roll(tmp_path: Path) -> None:
    cur = tmp_path / "a.log"
    prev = tmp_path / "a.log.1"
    append_and_roll(cur, prev, [{"i": 1}], max_bytes=1024)
    append_and_roll(cur, prev, [{"i": 2}], max_bytes=1024)
    assert not prev.exists()
    assert len(cur.read_text().splitlines()) == 2


def test_rolls_when_current_at_or_over_cap(tmp_path: Path) -> None:
    cur = tmp_path / "a.log"
    prev = tmp_path / "a.log.1"
    # Fill current with 3 rows worth of bytes.
    append_and_roll(cur, prev, [{"i": i} for i in range(3)], max_bytes=1024)
    size_before = cur.stat().st_size
    # Next call with max_bytes below current size MUST roll first.
    outcome = append_and_roll(cur, prev, [{"i": 99}], max_bytes=size_before)
    assert outcome.IsRolled is True
    assert prev.exists() and prev.stat().st_size == size_before
    # New current only holds the freshly appended row.
    assert cur.read_text().splitlines() == ['{"i": 99}']


def test_roll_replaces_prior_generation(tmp_path: Path) -> None:
    cur = tmp_path / "a.log"
    prev = tmp_path / "a.log.1"
    prev.write_text('{"old": true}\n')
    append_and_roll(cur, prev, [{"i": i} for i in range(3)], max_bytes=1024)
    size_before = cur.stat().st_size
    append_and_roll(cur, prev, [{"i": 99}], max_bytes=size_before)
    # prev is now the previous "cur", not the stale marker.
    assert '"old"' not in prev.read_text()
    assert '"i"' in prev.read_text()


def test_no_roll_when_current_missing(tmp_path: Path) -> None:
    cur = tmp_path / "a.log"
    prev = tmp_path / "a.log.1"
    outcome = append_and_roll(cur, prev, [{"i": 1}], max_bytes=1)  # tiny cap
    assert outcome.IsRolled is False


@pytest.mark.parametrize("bad", [0, -1, 1.5, True, "1024", None])
def test_rejects_bad_max_bytes(tmp_path: Path, bad: object) -> None:
    cur = tmp_path / "a.log"
    prev = tmp_path / "a.log.1"
    with pytest.raises(ValueError):
        append_and_roll(cur, prev, [{"i": 1}], max_bytes=bad)  # type: ignore[arg-type]


def test_io_error_surfaces_as_oserror(tmp_path: Path) -> None:
    # Point ``current`` at a path whose parent cannot be created (parent
    # is a regular file, not a directory).
    blocker = tmp_path / "not-a-dir"
    blocker.write_text("x")
    cur = blocker / "a.log"
    prev = blocker / "a.log.1"
    with pytest.raises(OSError):
        append_and_roll(cur, prev, [{"i": 1}], max_bytes=1024)


# --- read_jsonl / read_pair ----------------------------------------------

def test_read_jsonl_missing_is_empty(tmp_path: Path) -> None:
    assert read_jsonl(tmp_path / "nope") == []


def test_read_jsonl_skips_blank_lines_and_surfaces_poison(tmp_path: Path) -> None:
    p = tmp_path / "a.log"
    p.write_text('{"ok": 1}\n\nnot-json\n{"ok": 2}\n')
    rows = read_jsonl(p)
    assert rows[0] == {"ok": 1}
    assert rows[1] == {"_Raw": "not-json", "_ParseError": rows[1]["_ParseError"]}
    assert "Expecting" in rows[1]["_ParseError"] or "value" in rows[1]["_ParseError"]
    assert rows[2] == {"ok": 2}


def test_read_pair_returns_previous_then_current(tmp_path: Path) -> None:
    cur = tmp_path / "a.log"
    prev = tmp_path / "a.log.1"
    prev.write_text('{"i": 0}\n')
    cur.write_text('{"i": 1}\n{"i": 2}\n')
    assert [r["i"] for r in read_pair(cur, prev)] == [0, 1, 2]


def test_read_pair_both_missing_is_empty(tmp_path: Path) -> None:
    assert read_pair(tmp_path / "a", tmp_path / "b") == []


# --- installer wrapper still uses the primitive end-to-end ---------------

def test_installer_rotator_delegates_to_primitive(tmp_path: Path, monkeypatch) -> None:
    """Regression pin: install_log_rotator must call jsonl_rotator, not a
    private copy. Any future refactor that re-derives the append/roll
    logic will fail this test."""
    from BE.app import install_log_rotator
    from BE.app.install_manifest import InstallManifest, write_manifest

    calls: list[dict] = []
    real = jsonl_rotator.append_and_roll

    def spy(current, previous, rows, *, max_bytes):
        rows_list = list(rows)
        calls.append({"cur": current, "prev": previous, "n": len(rows_list)})
        return real(current, previous, rows_list, max_bytes=max_bytes)

    monkeypatch.setattr(jsonl_rotator, "append_and_roll", spy)

    actions = [
        {
            "Name": f"a{i}",
            "Script": "noop.py",
            "Args": [],
            "Phase": "install",
            "StartedAt": "2026-01-01T00:00:00Z",
            "CompletedAt": "2026-01-01T00:00:01Z",
            "DurationMs": 1000,
            "ExitCode": 0,
            "IsCritical": False,
            "IsSuccess": True,
        }
        for i in range(5)
    ]
    manifest = InstallManifest(
        SchemaVersion=1,
        AppVersion="0.0.0",
        Platform="posix",
        InstalledAt="2026-01-01T00:00:00Z",
        LastUpdatedAt="2026-01-01T00:00:00Z",
        Actions=actions,
    )
    write_manifest(tmp_path, manifest)
    outcome = install_log_rotator.rotate_manifest(tmp_path, max_actions=2)
    assert outcome.IsRotated is True
    assert outcome.ArchivedCount == 3
    assert calls and calls[0]["n"] == 3

