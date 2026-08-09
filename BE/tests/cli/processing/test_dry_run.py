"""Plan 90 Step 61 - `processing-cli dry-run` acceptance tests.

Pins:
- spec/21-app/75 §Subcommands: dry-run rehearses evaluate/batch.
- spec/21-app/24 §1 Write policy: dry-run MUST NOT persist JSONL.
- Honesty rule: bundles with active rules surface as per-frame Failures[]
  carrying `E_BE_UNAVAILABLE`, not fabricated verdicts.
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
        [sys.executable, "-m", "BE.cli.processing.main", "dry-run", *args],
        capture_output=True, text=True, timeout=30, cwd=str(REPO_ROOT),
    )
    lines = [ln for ln in proc.stdout.strip().splitlines() if ln.strip()]
    payload = json.loads(lines[-1]) if lines else {}
    return proc.returncode, payload, proc.stderr


@pytest.fixture()
def frame(tmp_path: Path) -> Path:
    p = tmp_path / "frame.png"
    p.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 32)
    return p


@pytest.fixture()
def empty_bundle(tmp_path: Path) -> Path:
    b = tmp_path / "b.json"
    b.write_text(json.dumps({"schemaVersion": 2, "rules": []}))
    return b


def test_requires_exactly_one_source(empty_bundle: Path):
    rc, env, _ = _run("--bundle", str(empty_bundle))
    assert rc != 0
    assert env["Errors"]["Code"] == "E_CLI_USAGE"


def test_rejects_multiple_sources(empty_bundle: Path, frame: Path, tmp_path: Path):
    rc, env, _ = _run(
        "--bundle", str(empty_bundle),
        "--frame", str(frame),
        "--input-dir", str(tmp_path),
    )
    # argparse mutually_exclusive_group catches this before our handler.
    assert rc != 0
    assert env["Errors"]["Code"] in ("E_CLI_USAGE",)


def test_single_frame_empty_bundle_returns_result_and_marks_dry_run(
    frame: Path, empty_bundle: Path,
):
    rc, env, err = _run(
        "--bundle", str(empty_bundle),
        "--frame", str(frame),
        "--run-id", "RS_DRY_0001",
    )
    assert rc == 0, (rc, env, err)
    # Dispatcher wraps handler return dict under Data or top-level; support both.
    body = env["Results"][0]
    assert body["DryRun"] is True
    assert body["RunSessionId"] == "RS_DRY_0001"
    assert body["FrameCount"] == 1
    assert body["SuccessCount"] == 1
    assert body["FailureCount"] == 0
    assert len(body["Results"]) == 1
    assert body["Results"][0]["Verdict"] == "Pass"


def test_dry_run_does_not_write_jsonl(
    tmp_path: Path, frame: Path, empty_bundle: Path,
):
    # Poison any place a naive impl might write to.
    poison = tmp_path / "results"
    before = list(tmp_path.rglob("*.jsonl"))
    rc, env, _ = _run(
        "--bundle", str(empty_bundle),
        "--frame", str(frame),
        "--run-id", "RS_DRY_NOWRITE",
    )
    assert rc == 0, env
    after = list(tmp_path.rglob("*.jsonl"))
    assert before == after == []
    assert not poison.exists()


def test_input_dir_batches_all_frames(tmp_path: Path, empty_bundle: Path):
    d = tmp_path / "frames"
    d.mkdir()
    for i in range(3):
        (d / f"f{i}.png").write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 8)
    rc, env, _ = _run(
        "--bundle", str(empty_bundle),
        "--input-dir", str(d),
        "--run-id", "RS_DRY_DIR",
    )
    assert rc == 0, env
    body = env["Results"][0]
    assert body["FrameCount"] == 3
    assert body["SuccessCount"] == 3
    assert body["FailureCount"] == 0
    # Deterministic sorted order.
    paths = [r["ImageFilePath"] for r in body["Results"]]
    assert paths == sorted(paths)


def test_active_rules_surface_as_failure_not_exception(
    frame: Path, tmp_path: Path,
):
    b = tmp_path / "b.json"
    b.write_text(json.dumps({
        "schemaVersion": 2,
        "rules": [{"id": "r1", "kind": "PresenceAbsence", "enabled": True}],
    }))
    rc, env, _ = _run(
        "--bundle", str(b),
        "--frame", str(frame),
        "--run-id", "RS_DRY_UNAVAIL",
    )
    # Whole invocation succeeds; per-frame failure is captured, not raised.
    assert rc == 0, env
    body = env["Results"][0]
    assert body["SuccessCount"] == 0
    assert body["FailureCount"] == 1
    fail = body["Failures"][0]
    assert fail["Code"] == "E_BE_UNAVAILABLE"


def test_missing_frame_in_manifest_is_per_frame_failure(
    tmp_path: Path, empty_bundle: Path,
):
    real = tmp_path / "real.png"
    real.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 8)
    missing = tmp_path / "nope.png"
    m = tmp_path / "man.json"
    m.write_text(json.dumps([str(real), str(missing)]))
    rc, env, _ = _run(
        "--bundle", str(empty_bundle),
        "--manifest", str(m),
        "--run-id", "RS_DRY_MAN",
    )
    assert rc == 0, env
    body = env["Results"][0]
    assert body["FrameCount"] == 2
    assert body["SuccessCount"] == 1
    assert body["FailureCount"] == 1
    assert body["Failures"][0]["Code"] == "E_BE_NOT_FOUND"
