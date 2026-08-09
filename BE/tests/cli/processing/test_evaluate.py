"""Plan 90 Step 58 - `processing-cli evaluate` acceptance tests.

Pins spec/21-app/75 §Acceptance #1 (envelope with `Results = [ResultRecord]`),
spec/21-app/24 §3 counter invariants for the empty-bundle case, and the
honesty-rule refusal path (`E_BE_UNAVAILABLE`) when a bundle declares
rules the evaluator cannot yet execute.
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
        [sys.executable, "-m", "BE.cli.processing.main", "evaluate", *args],
        capture_output=True, text=True, timeout=20, cwd=str(REPO_ROOT),
    )
    lines = [ln for ln in proc.stdout.strip().splitlines() if ln.strip()]
    payload = json.loads(lines[-1]) if lines else {}
    return proc.returncode, payload, proc.stderr


@pytest.fixture()
def frame(tmp_path: Path) -> Path:
    p = tmp_path / "frame.png"
    p.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 32)
    return p


def test_missing_frame_raises_be_not_found(tmp_path: Path):
    bundle = tmp_path / "b.json"
    bundle.write_text(json.dumps({"schemaVersion": 2, "rules": []}))
    rc, env, _ = _run("--frame", str(tmp_path / "nope.png"), "--bundle", str(bundle))
    assert rc != 0
    assert env["Status"]["IsSuccess"] is False
    assert env["Errors"]["Code"] == "E_BE_NOT_FOUND"


def test_missing_bundle_raises_rule_bundle_invalid(frame: Path, tmp_path: Path):
    rc, env, _ = _run("--frame", str(frame), "--bundle", str(tmp_path / "no.json"))
    assert rc != 0
    assert env["Errors"]["Code"] == "E_RULE_BUNDLE_INVALID"


def test_bad_json_bundle_raises_rule_bundle_invalid(frame: Path, tmp_path: Path):
    b = tmp_path / "bad.json"
    b.write_text("{not-json")
    rc, env, _ = _run("--frame", str(frame), "--bundle", str(b))
    assert rc != 0
    assert env["Errors"]["Code"] == "E_RULE_BUNDLE_INVALID"


def test_bundle_with_rules_refuses_to_fabricate(frame: Path, tmp_path: Path):
    b = tmp_path / "b.json"
    b.write_text(json.dumps({
        "schemaVersion": 2,
        "rules": [{"id": "r1", "kind": "PresenceAbsence", "enabled": True}],
    }))
    rc, env, _ = _run("--frame", str(frame), "--bundle", str(b))
    assert rc != 0
    assert env["Errors"]["Code"] == "E_BE_UNAVAILABLE"
    # BackendMessage must name the evaluator so operators know why we refused.
    assert "evaluator" in env["Errors"]["BackendMessage"].lower()


def test_empty_bundle_returns_result_record(frame: Path, tmp_path: Path):
    b = tmp_path / "b.json"
    b.write_text(json.dumps({"schemaVersion": 2, "rules": []}))
    rc, env, err = _run(
        "--frame", str(frame),
        "--bundle", str(b),
        "--run-id", "RS_TEST_0001",
    )
    assert rc == 0, (rc, env, err)
    assert env["Status"]["IsSuccess"] is True
    results = env["Results"]
    assert isinstance(results, list) and len(results) == 1
    rec = results[0]
    # spec 24 §3 keys (PascalCase per spec 24 §2).
    assert rec["SchemaVersion"] == 2
    assert rec["RunSessionId"] == "RS_TEST_0001"
    assert rec["Verdict"] == "Pass"
    assert rec["Judgments"] == []
    rs = rec["RuleSet"]
    # Counter invariants: active + inactive + silent == total; pass+fail+error == active.
    assert rs["RuleCount"] == 0
    assert rs["ActiveCount"] + rs["InactiveCount"] + rs["SilentCount"] == rs["RuleCount"]
    assert rs["PassCount"] + rs["FailCount"] + rs["ErrorCount"] == rs["ActiveCount"]


def test_results_dir_writes_jsonl(frame: Path, tmp_path: Path):
    b = tmp_path / "b.json"
    b.write_text(json.dumps({"schemaVersion": 2, "rules": []}))
    out = tmp_path / "results"
    rc, env, _ = _run(
        "--frame", str(frame), "--bundle", str(b),
        "--run-id", "RS_PERSIST_001", "--results-dir", str(out),
    )
    assert rc == 0, env
    jsonl = out / "RS_PERSIST_001.jsonl"
    assert jsonl.exists()
    line = jsonl.read_text(encoding="utf-8").strip().splitlines()[0]
    rec = json.loads(line)
    assert rec["RunSessionId"] == "RS_PERSIST_001"
    assert rec["Verdict"] == "Pass"


def test_emit_ipc_requires_results_dir(frame: Path, tmp_path: Path):
    b = tmp_path / "b.json"
    b.write_text(json.dumps({"schemaVersion": 2, "rules": []}))
    rc, env, _ = _run(
        "--frame", str(frame), "--bundle", str(b),
        "--run-id", "RS_IPC_NO_DIR", "--emit-ipc",
    )
    assert rc != 0
    assert env["Errors"]["Code"] == "E_CLI_USAGE"


def test_emit_ipc_writes_result_ready_message(frame: Path, tmp_path: Path):
    b = tmp_path / "b.json"
    b.write_text(json.dumps({"schemaVersion": 2, "rules": []}))
    ipc_root = tmp_path / "ipc"
    results = tmp_path / "results"
    rc, env, err = _run(
        "--frame", str(frame), "--bundle", str(b),
        "--run-id", "RS_IPC_OK_001",
        "--results-dir", str(results),
        "--emit-ipc", "--ipc-root", str(ipc_root),
        "--ipc-out-dir", "processing-out",
        "--frame-seq", "7",
    )
    assert rc == 0, (rc, env, err)
    out_dir = ipc_root / "processing-out"
    msgs = sorted(out_dir.glob("*.msg.json"))
    assert len(msgs) == 1, list(out_dir.iterdir())
    msg = json.loads(msgs[0].read_text(encoding="utf-8"))
    assert msg["Kind"] == "ResultReady"
    assert msg["RunId"] == "RS_IPC_OK_001"
    assert msg["Seq"] == 7
    p = msg["Payload"]
    assert p["RunId"] == "RS_IPC_OK_001"
    assert p["FrameSeq"] == 7
    assert p["Decision"] == "pass"
    assert p["RuleCount"] == 0
    assert p["ResultsPath"].endswith("RS_IPC_OK_001.jsonl")


# --- Plan 90 Step 68: --mode flag (spec 21-app/49 §4) ---------------------


def test_mode_auto_reads_bundle_validation_mode_parallel(frame: Path, tmp_path: Path):
    """`--mode auto` on a bundle with validationMode='parallel' -> full."""
    b = tmp_path / "b.json"
    b.write_text(json.dumps({"schemaVersion": 2, "validationMode": "parallel",
                             "rules": [{"id": "r1", "status": "Active"}]}))
    rc, env, _ = _run("--frame", str(frame), "--bundle", str(b), "--mode", "auto")
    # Active rule + no engine -> E_BE_UNAVAILABLE, but Details must show the
    # resolved mode came from the bundle.
    assert rc != 0
    assert env["Errors"]["Code"] == "E_BE_UNAVAILABLE"
    details = env["Errors"].get("Details") or {}
    assert details.get("Mode") == "full"
    assert details.get("ModeSource") == "bundle"


def test_mode_cli_short_circuit_overrides_bundle(frame: Path, tmp_path: Path):
    b = tmp_path / "b.json"
    b.write_text(json.dumps({"schemaVersion": 2, "validationMode": "parallel",
                             "rules": [{"id": "r1", "status": "Active"}]}))
    rc, env, _ = _run("--frame", str(frame), "--bundle", str(b),
                      "--mode", "short-circuit")
    assert rc != 0
    assert env["Errors"]["Code"] == "E_BE_UNAVAILABLE"
    details = env["Errors"].get("Details") or {}
    assert details.get("Mode") == "short-circuit"
    assert details.get("ModeSource") == "cli-override"


def test_mode_bundle_sequential_maps_to_short_circuit(frame: Path, tmp_path: Path):
    b = tmp_path / "b.json"
    b.write_text(json.dumps({"schemaVersion": 2, "validationMode": "sequential",
                             "rules": [{"id": "r1", "status": "Active"}]}))
    rc, env, _ = _run("--frame", str(frame), "--bundle", str(b))
    assert rc != 0
    details = env["Errors"].get("Details") or {}
    assert details.get("Mode") == "short-circuit"
    assert details.get("ModeSource") == "bundle"


def test_mode_invalid_choice_rejected_by_argparse(frame: Path, tmp_path: Path):
    b = tmp_path / "b.json"
    b.write_text(json.dumps({"schemaVersion": 2, "rules": []}))
    rc, _env, err = _run("--frame", str(frame), "--bundle", str(b),
                         "--mode", "bogus")
    # argparse writes to stderr and exits non-zero before envelope emission.
    assert rc != 0
    assert "bogus" in err or "invalid choice" in err
