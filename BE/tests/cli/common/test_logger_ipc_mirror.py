"""Plan 90 Step 28 - logger -> IPC Error mirror on FATAL.

Anchors:
- `spec/21-app/76-cli-log-and-ipc.md` §"Payload shapes" (Kind=Error carries
  the Universal Envelope, Payload=null).
- `spec/03-error-manage/` (never swallow errors; observability across
  processes, not just on disk).

Invariants:
  M1. FATAL with `ipc_root` set writes to disk AND drops one `Kind=Error`
      IPC message in `<ipc_root>/<ipc_dir>` carrying the envelope.
  M2. INFO/WARN/ERROR do NOT mirror by default (min level is FATAL).
  M3. Custom `ipc_mirror_min_level` (e.g. "ERROR") lowers the threshold.
  M4. No `ipc_root` -> no mirror, no side effects.
  M5. Mirror failure (bad `ipc_dir`) is best-effort: FATAL still lands on
      disk and a follow-up ERROR line records the mirror failure. No raise.
  M6. Envelope shape matches spec: `Status.Success=false`, `Errors[0]`
      carries `Code`, `Message`, `Trace`, `Ctx`, `Level`, `RunId`.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from BE.cli.common import ipc
from BE.cli.common.logger import JsonlLogger


def _read_log_lines(logger: JsonlLogger) -> list[dict]:
    return [json.loads(l) for l in logger.path.read_text(encoding="utf-8").splitlines() if l]


def _read_ipc(root: Path, dir_: str) -> list[dict]:
    return [
        json.loads(p.read_text(encoding="utf-8"))
        for p in sorted((root / dir_).glob("*.msg.json"))
    ]


def _mk(tmp_path: Path, **kw) -> JsonlLogger:
    return JsonlLogger(
        source="worker-cli", subcmd="test",
        log_root=tmp_path / "logs",
        ipc_root=tmp_path / "ipc",
        **kw,
    )


def test_m1_fatal_mirrors_to_ipc(tmp_path: Path) -> None:
    lg = _mk(tmp_path)
    try:
        lg.log("FATAL", "cam.crash", "camera SDK died",
               code="E_CAM_CAPTURE_FAILED", ctx={"Serial": "SN1"})
    finally:
        lg.close()
    lines = _read_log_lines(lg)
    assert any(l["Level"] == "FATAL" and l["Event"] == "cam.crash" for l in lines)
    msgs = _read_ipc(tmp_path / "ipc", "main-in")
    assert len(msgs) == 1
    m = msgs[0]
    assert m["Kind"] == "Error"
    assert m["Payload"] is None                            # M6 / C7 alignment
    env = m["Envelope"]
    assert env["Status"]["Success"] is False               # M6
    assert env["Status"]["Code"] == "E_CAM_CAPTURE_FAILED"
    err = env["Errors"][0]
    assert err["Code"] == "E_CAM_CAPTURE_FAILED"
    assert err["Level"] == "FATAL"
    assert err["Ctx"] == {"Serial": "SN1"}
    assert err["RunId"] == lg.run_id


def test_m2_lower_levels_do_not_mirror(tmp_path: Path) -> None:
    lg = _mk(tmp_path)
    try:
        lg.log("INFO", "boot", "hi")
        lg.log("WARN", "wobble", "meh", code="E_CAM_CAPTURE_FAILED")
        lg.log("ERROR", "oops", "bad", code="E_CAM_CAPTURE_FAILED")
    finally:
        lg.close()
    assert not (tmp_path / "ipc" / "main-in").exists() or \
        _read_ipc(tmp_path / "ipc", "main-in") == []


def test_m3_custom_min_level_lowers_threshold(tmp_path: Path) -> None:
    lg = _mk(tmp_path, ipc_mirror_min_level="ERROR")
    try:
        lg.log("WARN", "w", "w", code="E_CAM_CAPTURE_FAILED")
        lg.log("ERROR", "e", "e", code="E_CAM_CAPTURE_FAILED")
    finally:
        lg.close()
    msgs = _read_ipc(tmp_path / "ipc", "main-in")
    assert len(msgs) == 1
    assert msgs[0]["Envelope"]["Errors"][0]["Level"] == "ERROR"


def test_m4_no_ipc_root_no_side_effects(tmp_path: Path) -> None:
    lg = JsonlLogger(source="worker-cli", subcmd="test", log_root=tmp_path / "logs")
    try:
        lg.log("FATAL", "boom", "x", code="E_CAM_CAPTURE_FAILED")
    finally:
        lg.close()
    assert not (tmp_path / "ipc").exists()


def test_m5_mirror_failure_falls_back_to_disk(tmp_path: Path) -> None:
    # Invalid drop-dir name -> ipc.send raises E_IPC_PAYLOAD_INVALID.
    lg = _mk(tmp_path, ipc_dir="Not Valid Name")
    try:
        lg.log("FATAL", "cam.crash", "died", code="E_CAM_CAPTURE_FAILED")
    finally:
        lg.close()
    lines = _read_log_lines(lg)
    events = [l["Event"] for l in lines]
    assert "cam.crash" in events                            # FATAL still landed
    assert "log.ipc_mirror_failed" in events                # M5 follow-up line
    fallback = next(l for l in lines if l["Event"] == "log.ipc_mirror_failed")
    assert fallback["Level"] == "ERROR"                     # never re-mirrors
    assert fallback["Ctx"]["MirrorCode"] == "E_IPC_PAYLOAD_INVALID"


def test_mirror_does_not_recurse(tmp_path: Path) -> None:
    """Sanity: the mirror's own fallback ERROR line must NOT itself mirror,
    otherwise a broken drop-dir would loop until the log fills the disk."""
    lg = _mk(tmp_path, ipc_dir="Bad Name", ipc_mirror_min_level="ERROR")
    try:
        lg.log("ERROR", "e", "e", code="E_CAM_CAPTURE_FAILED")
    finally:
        lg.close()
    lines = _read_log_lines(lg)
    # Exactly one primary + one fallback == 2 lines, not N lines of recursion.
    assert len(lines) == 2
