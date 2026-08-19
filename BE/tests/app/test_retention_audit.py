"""Plan 90 Step 110 - retention audit writer tests.

Covers ``BE/app/retention_audit.py`` end-to-end:
- row shape (PascalCase, timestamp format, outcome merge)
- append_and_roll wiring (single row per pass, ordering)
- rotation at the 1 MiB ceiling
- best-effort failure semantics (never raises; logs ERROR)
- ``mode`` / ``pass_index`` validation
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

import pytest

from BE.app.jsonl_rotator import read_pair
from BE.app.retention import RetentionOutcome
from BE.app.retention_audit import (
    ALLOWED_MODES,
    AUDIT_FILENAME,
    PREVIOUS_FILENAME,
    append_halt,
    append_pass,
    audit_paths,
    build_halt_row,
    build_row,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")


def _outcome(**over) -> RetentionOutcome:
    base = dict(
        RetentionDays=30, CutoffEpoch=1_700_000_000, DryRun=False,
        RunSessionsScanned=3, RunSessionsDeleted=2,
        ArtifactsScanned=5, ArtifactsUnlinked=4,
        JsonlSidecarsUnlinked=1, BytesReclaimed=2048,
    )
    base.update(over)
    return RetentionOutcome(**base)


def test_audit_paths_returns_current_and_previous(tmp_path: Path) -> None:
    cur, prev = audit_paths(tmp_path)
    assert cur == tmp_path / AUDIT_FILENAME
    assert prev == tmp_path / PREVIOUS_FILENAME
    # audit_paths must NOT create the directory (read-only endpoints
    # depend on this - Step 111 must not have side effects).
    assert not (tmp_path / AUDIT_FILENAME).exists()


def test_build_row_pascal_case_and_iso_timestamp() -> None:
    row = build_row(_outcome(), mode="loop", pass_index=1)
    assert row["Mode"] == "loop"
    assert row["PassIndex"] == 1
    assert _ISO_RE.match(row["TimestampUtc"])  # generated default
    # Outcome fields merged in flat, still PascalCase.
    assert row["RetentionDays"] == 30
    assert row["RunSessionsDeleted"] == 2
    assert row["ArtifactsUnlinked"] == 4
    assert row["BytesReclaimed"] == 2048


def test_build_row_accepts_explicit_timestamp() -> None:
    row = build_row(_outcome(), mode="single-shot", pass_index=1,
                    timestamp_utc="2026-07-21T10:00:00Z")
    assert row["TimestampUtc"] == "2026-07-21T10:00:00Z"


@pytest.mark.parametrize("mode", ["", "Loop", "SINGLE-SHOT", "single_shot", None])
def test_build_row_rejects_bad_mode(mode) -> None:
    with pytest.raises(ValueError):
        build_row(_outcome(), mode=mode, pass_index=1)  # type: ignore[arg-type]


@pytest.mark.parametrize("idx", [0, -1, 1.0, "1"])
def test_build_row_rejects_bad_pass_index(idx) -> None:
    with pytest.raises(ValueError):
        build_row(_outcome(), mode="loop", pass_index=idx)  # type: ignore[arg-type]


def test_append_pass_writes_single_row(tmp_path: Path) -> None:
    out = append_pass(tmp_path, _outcome(), mode="loop", pass_index=1,
                      timestamp_utc="2026-07-21T10:00:00Z")
    assert out is not None
    assert out.AppendedCount == 1
    assert out.IsRolled is False
    rows = read_pair(*audit_paths(tmp_path))
    assert len(rows) == 1
    assert rows[0]["PassIndex"] == 1
    assert rows[0]["Mode"] == "loop"


def test_append_pass_preserves_pass_order(tmp_path: Path) -> None:
    for i in range(1, 4):
        append_pass(tmp_path, _outcome(RunSessionsDeleted=i),
                    mode="loop", pass_index=i,
                    timestamp_utc=f"2026-07-21T10:00:0{i}Z")
    rows = read_pair(*audit_paths(tmp_path))
    assert [r["PassIndex"] for r in rows] == [1, 2, 3]
    assert [r["RunSessionsDeleted"] for r in rows] == [1, 2, 3]


def test_append_pass_creates_parent_dir(tmp_path: Path) -> None:
    logs = tmp_path / "nested" / "logs"
    assert not logs.exists()
    out = append_pass(logs, _outcome(), mode="single-shot", pass_index=1)
    assert out is not None
    assert (logs / AUDIT_FILENAME).exists()


def test_append_pass_rotates_at_ceiling(tmp_path: Path, monkeypatch) -> None:
    # Shrink the ceiling to force a roll after the first row.
    monkeypatch.setattr("BE.app.retention_audit._MAX_BYTES", 200)
    append_pass(tmp_path, _outcome(), mode="loop", pass_index=1,
                timestamp_utc="2026-07-21T10:00:00Z")
    out2 = append_pass(tmp_path, _outcome(RunSessionsDeleted=99),
                       mode="loop", pass_index=2,
                       timestamp_utc="2026-07-21T10:00:01Z")
    assert out2 is not None
    assert out2.IsRolled is True
    assert (tmp_path / PREVIOUS_FILENAME).exists()
    rows = read_pair(*audit_paths(tmp_path))
    # Order: previous (pass 1) then current (pass 2).
    assert [r["PassIndex"] for r in rows] == [1, 2]


def test_append_pass_swallows_oserror(tmp_path: Path, caplog, monkeypatch) -> None:
    def _boom(*_a, **_kw):
        raise OSError(28, "no space")
    monkeypatch.setattr("BE.app.retention_audit.append_and_roll", _boom)
    with caplog.at_level(logging.ERROR, logger="BE.app.retention_audit"):
        out = append_pass(tmp_path, _outcome(), mode="loop", pass_index=1)
    assert out is None  # never raises
    assert any("retention.audit.write_failed" in r.message for r in caplog.records)


def test_append_pass_swallows_value_error(tmp_path: Path, caplog) -> None:
    # Bad mode raises ValueError inside build_row; audit must log + return None.
    with caplog.at_level(logging.ERROR, logger="BE.app.retention_audit"):
        out = append_pass(tmp_path, _outcome(), mode="bogus", pass_index=1)
    assert out is None
    assert any("retention.audit.write_failed" in r.message for r in caplog.records)


def test_row_is_json_serializable_sorted_keys(tmp_path: Path) -> None:
    append_pass(tmp_path, _outcome(UnlinkFailures=("a", "b")),
                mode="loop", pass_index=1,
                timestamp_utc="2026-07-21T10:00:00Z")
    raw = (tmp_path / AUDIT_FILENAME).read_bytes().decode("utf-8").strip()
    parsed = json.loads(raw)
    assert parsed["UnlinkFailures"] == ["a", "b"]
    # sort_keys is enforced by the primitive; keys must be lexical.
    keys = list(parsed.keys())
    assert keys == sorted(keys)


def test_default_timestamp_is_utc_iso(tmp_path: Path) -> None:
    append_pass(tmp_path, _outcome(), mode="single-shot", pass_index=1)
    parsed = json.loads((tmp_path / AUDIT_FILENAME).read_bytes().decode("utf-8").strip())
    assert _ISO_RE.match(parsed["TimestampUtc"])


# --------------------------------------------------------------------------
# Plan 90 Step 112 - loop-halt row (build_halt_row / append_halt)
# --------------------------------------------------------------------------


def _err(code: ErrorCode = ErrorCode.E_BE_INTERNAL, msg: str = "db is locked") -> AppError:
    return AppError(code, msg, details={"K": "v"})


def test_allowed_modes_includes_loop_halt() -> None:
    assert ALLOWED_MODES == ("single-shot", "loop", "loop-halt")


def test_build_halt_row_shape() -> None:
    row = build_halt_row(_err(), pass_index=3, timestamp_utc="2026-07-21T10:00:00Z")
    assert row["Mode"] == "loop-halt"
    assert row["PassIndex"] == 3
    assert row["TimestampUtc"] == "2026-07-21T10:00:00Z"
    assert row["ErrorCode"] == "E_BE_INTERNAL"
    assert row["ErrorMessage"] == "db is locked"
    assert row["ErrorDetails"] == {"K": "v"}
    # loop-halt rows must NOT carry RetentionOutcome fields.
    assert "RunSessionsDeleted" not in row
    assert "ArtifactsUnlinked" not in row


def test_build_halt_row_default_timestamp_is_iso() -> None:
    row = build_halt_row(_err(), pass_index=1)
    assert _ISO_RE.match(row["TimestampUtc"])  # type: ignore[arg-type]


def test_build_halt_row_rejects_non_apperror() -> None:
    with pytest.raises(ValueError):
        build_halt_row(RuntimeError("boom"), pass_index=1)  # type: ignore[arg-type]


@pytest.mark.parametrize("idx", [0, -1, 1.0, "1"])
def test_build_halt_row_rejects_bad_pass_index(idx) -> None:
    with pytest.raises(ValueError):
        build_halt_row(_err(), pass_index=idx)  # type: ignore[arg-type]


def test_build_row_rejects_loop_halt_mode() -> None:
    # Guard: callers must NOT smuggle loop-halt through build_row (which
    # expects a RetentionOutcome). Use build_halt_row instead.
    with pytest.raises(ValueError):
        build_row(_outcome(), mode="loop-halt", pass_index=1)


def test_append_halt_writes_single_row(tmp_path: Path) -> None:
    out = append_halt(tmp_path, _err(), pass_index=2,
                      timestamp_utc="2026-07-21T10:00:00Z")
    assert out is not None
    assert out.AppendedCount == 1
    rows = read_pair(*audit_paths(tmp_path))
    assert len(rows) == 1
    assert rows[0]["Mode"] == "loop-halt"
    assert rows[0]["ErrorCode"] == "E_BE_INTERNAL"


def test_append_halt_after_passes_preserves_order(tmp_path: Path) -> None:
    append_pass(tmp_path, _outcome(), mode="loop", pass_index=1,
                timestamp_utc="2026-07-21T10:00:00Z")
    append_pass(tmp_path, _outcome(), mode="loop", pass_index=2,
                timestamp_utc="2026-07-21T10:00:01Z")
    append_halt(tmp_path, _err(), pass_index=3,
                timestamp_utc="2026-07-21T10:00:02Z")
    rows = read_pair(*audit_paths(tmp_path))
    assert [r["Mode"] for r in rows] == ["loop", "loop", "loop-halt"]
    assert [r["PassIndex"] for r in rows] == [1, 2, 3]


def test_append_halt_swallows_oserror(tmp_path: Path, caplog, monkeypatch) -> None:
    def _boom(*_a, **_kw):
        raise OSError(28, "no space")
    monkeypatch.setattr("BE.app.retention_audit.append_and_roll", _boom)
    with caplog.at_level(logging.ERROR, logger="BE.app.retention_audit"):
        out = append_halt(tmp_path, _err(), pass_index=1)
    assert out is None
    assert any("retention.audit.halt_write_failed" in r.message for r in caplog.records)
