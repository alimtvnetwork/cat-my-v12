"""Plan 90 Step 59 - `processing-cli batch` acceptance tests.

Pins:
- spec/21-app/75 §Subcommands "batch" (fan `evaluate` over N frames,
  one envelope on stdout).
- spec/13-generic-cli/18 "continue on failure" (per-frame errors land
  in `Failures[]`, batch keeps going).
- spec/21-app/17 §5 ordering (input order preserved).
- spec/21-app/24 §1 single-writer JSONL persistence.

These use `subprocess` so we exercise the real dispatcher stdout /
exit-code contract, not the in-process handler.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[4]


def _run(*args: str) -> tuple[int, dict, str]:
    proc = subprocess.run(
        [sys.executable, "-m", "BE.cli.processing.main", "batch", *args],
        capture_output=True, text=True, timeout=30, cwd=str(REPO_ROOT),
    )
    lines = [ln for ln in proc.stdout.strip().splitlines() if ln.strip()]
    payload = json.loads(lines[-1]) if lines else {}
    return proc.returncode, payload, proc.stderr


@pytest.fixture()
def bundle_empty(tmp_path: Path) -> Path:
    b = tmp_path / "bundle.json"
    b.write_text(json.dumps({"schemaVersion": 2, "rules": []}))
    return b


@pytest.fixture()
def frames_dir(tmp_path: Path) -> Path:
    d = tmp_path / "frames"
    d.mkdir()
    for i in range(3):
        (d / f"f{i:03d}.png").write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 8)
    # Non-image file must be ignored.
    (d / "README.txt").write_text("skip me")
    return d


def test_requires_exactly_one_source(bundle_empty: Path):
    rc, env, _ = _run("--bundle", str(bundle_empty))
    assert rc != 0
    assert env["Errors"]["Code"] == "E_CLI_USAGE"


def test_missing_input_dir(bundle_empty: Path, tmp_path: Path):
    rc, env, _ = _run("--bundle", str(bundle_empty),
                      "--input-dir", str(tmp_path / "nope"))
    assert rc != 0
    assert env["Errors"]["Code"] == "E_BE_NOT_FOUND"


def test_empty_input_dir(bundle_empty: Path, tmp_path: Path):
    d = tmp_path / "empty"
    d.mkdir()
    rc, env, _ = _run("--bundle", str(bundle_empty), "--input-dir", str(d))
    assert rc != 0
    assert env["Errors"]["Code"] == "E_BE_NOT_FOUND"


def test_input_dir_success_writes_jsonl(bundle_empty: Path, frames_dir: Path, tmp_path: Path):
    out = tmp_path / "out"
    rc, env, _ = _run(
        "--bundle", str(bundle_empty),
        "--input-dir", str(frames_dir),
        "--results-dir", str(out),
        "--run-id", "RS_BATCH_01",
    )
    assert rc == 0, env
    assert env["Status"]["IsSuccess"] is True
    payload = env["Results"][0]
    assert payload["RunSessionId"] == "RS_BATCH_01"
    assert payload["FrameCount"] == 3
    assert payload["SuccessCount"] == 3
    assert payload["FailureCount"] == 0
    # Deterministic order: f000, f001, f002.
    got = [Path(r["ImageFilePath"]).name for r in payload["Results"]]
    assert got == ["f000.png", "f001.png", "f002.png"]
    # JSONL: exactly one file, exactly 3 lines.
    jsonl = out / "RS_BATCH_01.jsonl"
    assert jsonl.is_file()
    assert len(jsonl.read_text().splitlines()) == 3


def test_manifest_partial_failure_continues(bundle_empty: Path, frames_dir: Path, tmp_path: Path):
    manifest = tmp_path / "m.json"
    manifest.write_text(json.dumps({
        "frames": [
            str(frames_dir / "f000.png"),
            str(frames_dir / "missing.png"),
            str(frames_dir / "f002.png"),
        ],
    }))
    rc, env, _ = _run(
        "--bundle", str(bundle_empty),
        "--manifest", str(manifest),
        "--run-id", "RS_BATCH_02",
    )
    # Continue-on-failure: dispatcher still returns success envelope.
    assert rc == 0, env
    payload = env["Results"][0]
    assert payload["FrameCount"] == 3
    assert payload["SuccessCount"] == 2
    assert payload["FailureCount"] == 1
    assert payload["Failures"][0]["Code"] == "E_BE_NOT_FOUND"
    assert "missing.png" in payload["Failures"][0]["FramePath"]


def test_manifest_bad_json(bundle_empty: Path, tmp_path: Path):
    m = tmp_path / "m.json"
    m.write_text("{not-json")
    rc, env, _ = _run("--bundle", str(bundle_empty), "--manifest", str(m))
    assert rc != 0
    assert env["Errors"]["Code"] == "E_CLI_USAGE"


def test_bundle_with_active_rules_all_frames_fail(frames_dir: Path, tmp_path: Path):
    b = tmp_path / "b.json"
    b.write_text(json.dumps({
        "schemaVersion": 2,
        "rules": [{"id": "r1", "kind": "PresenceAbsence", "enabled": True}],
    }))
    rc, env, _ = _run("--bundle", str(b), "--input-dir", str(frames_dir))
    # Honesty rule: every frame refused, but the batch envelope itself
    # is a valid successful invocation (it did its job = reported failures).
    assert rc == 0, env
    payload = env["Results"][0]
    assert payload["SuccessCount"] == 0
    assert payload["FailureCount"] == 3
    assert all(f["Code"] == "E_BE_UNAVAILABLE" for f in payload["Failures"])


def test_parallel_max_workers_preserves_order(bundle_empty: Path, frames_dir: Path):
    rc, env, _ = _run(
        "--bundle", str(bundle_empty),
        "--input-dir", str(frames_dir),
        "--max-workers", "4",
    )
    assert rc == 0, env
    got = [Path(r["ImageFilePath"]).name for r in env["Results"][0]["Results"]]
    assert got == ["f000.png", "f001.png", "f002.png"]
