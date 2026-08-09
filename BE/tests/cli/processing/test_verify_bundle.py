"""Plan 90 Step 62 - `processing-cli verify-bundle` acceptance tests.

Pins spec/21-app/75 §Acceptance #4 and the collection-not-short-circuit
behaviour that Step 66's FE rules-editor button depends on.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]


def _run(*args: str) -> tuple[int, dict, str]:
    proc = subprocess.run(
        [sys.executable, "-m", "BE.cli.processing.main", "verify-bundle", *args],
        capture_output=True, text=True, timeout=20, cwd=str(REPO_ROOT),
    )
    lines = [ln for ln in proc.stdout.strip().splitlines() if ln.strip()]
    payload = json.loads(lines[-1]) if lines else {}
    return proc.returncode, payload, proc.stderr


def _write(p: Path, obj) -> Path:
    p.write_text(json.dumps(obj), encoding="utf-8")
    return p


def test_missing_bundle_file_is_invalid(tmp_path: Path):
    rc, env, _ = _run("--bundle", str(tmp_path / "nope.json"))
    assert rc != 0
    assert env["Errors"]["Code"] == "E_RULE_BUNDLE_INVALID"


def test_bad_json_reports_json_invalid(tmp_path: Path):
    b = tmp_path / "b.json"
    b.write_text("{not-json")
    rc, env, _ = _run("--bundle", str(b))
    assert rc != 0
    problems = env["Errors"]["Details"]["Problems"]
    assert problems[0]["Code"] == "BundleJsonInvalid"


def test_valid_empty_bundle_succeeds(tmp_path: Path):
    b = _write(tmp_path / "b.json", {"schemaVersion": 2, "rules": []})
    rc, env, err = _run("--bundle", str(b))
    assert rc == 0, (rc, env, err)
    body = env["Results"][0]
    assert body["RuleCount"] == 0
    assert body["ActiveCount"] == 0
    assert body["Kinds"] == {}


def test_valid_bundle_counts_active_inactive_silent(tmp_path: Path):
    b = _write(tmp_path / "b.json", {
        "schemaVersion": 2,
        "rules": [
            {"id": "r1", "kind": "PresenceAbsence", "status": "Active"},
            {"id": "r2", "kind": "PresenceAbsence", "status": "Silent"},
            {"id": "r3", "kind": "Count", "status": "Inactive"},
            {"id": "r4", "kind": "Count", "enabled": False},  # legacy disabled
        ],
    })
    rc, env, err = _run("--bundle", str(b))
    assert rc == 0, (rc, env, err)
    body = env["Results"][0]
    assert body["ActiveCount"] == 1
    assert body["SilentCount"] == 1
    assert body["InactiveCount"] == 2
    assert body["Kinds"] == {"PresenceAbsence": 2, "Count": 2}


def test_collects_all_problems_not_first_fail(tmp_path: Path):
    b = _write(tmp_path / "b.json", {
        "schemaVersion": "two",  # invalid
        "rules": [
            {"id": "", "kind": "Nope", "status": "Weird"},  # 3 problems
            {"id": "r1", "kind": "InvalidKind"},            # 1 problem
            {"id": "r1"},                                    # duplicate id
        ],
    })
    rc, env, _ = _run("--bundle", str(b))
    assert rc != 0
    codes = [p["Code"] for p in env["Errors"]["Details"]["Problems"]]
    assert "SchemaVersionInvalid" in codes
    assert "RuleIdMissing" in codes
    assert "RuleKindUnknown" in codes
    assert "RuleStatusInvalid" in codes
    assert "RuleIdDuplicate" in codes
    # Collection, not short-circuit: at least 5 distinct problems surfaced.
    assert len(codes) >= 5


def test_acceptance_conditions_shape_validated(tmp_path: Path):
    conds = json.dumps([
        {"id": "ac-1", "presence": "bogus", "targetColor": "not-hex", "similarityPct": 150},
        {"id": "ac-2", "presence": "present", "targetColor": "#2b2b2b", "similarityPct": 85},
    ])
    b = _write(tmp_path / "b.json", {
        "schemaVersion": 2,
        "rules": [{"id": "r1", "kind": "PresenceAbsence",
                   "params": {"acceptanceConditions": conds}}],
    })
    rc, env, _ = _run("--bundle", str(b))
    assert rc != 0
    codes = [p["Code"] for p in env["Errors"]["Details"]["Problems"]]
    assert "AcceptancePresenceInvalid" in codes
    assert "AcceptanceTargetColorInvalid" in codes
    assert "AcceptanceSimilarityOutOfRange" in codes


def test_acceptance_conditions_must_be_string(tmp_path: Path):
    # Per spec 60: acceptanceConditions ships as a JSON STRING inside params,
    # because params is Record<string, string|number|boolean>.
    b = _write(tmp_path / "b.json", {
        "schemaVersion": 2,
        "rules": [{"id": "r1", "kind": "PresenceAbsence",
                   "params": {"acceptanceConditions": [{"presence": "present"}]}}],
    })
    rc, env, _ = _run("--bundle", str(b))
    assert rc != 0
    codes = [p["Code"] for p in env["Errors"]["Details"]["Problems"]]
    assert "AcceptanceConditionsNotString" in codes


def test_strict_kind_flag_requires_kind(tmp_path: Path):
    b = _write(tmp_path / "b.json", {
        "schemaVersion": 2,
        "rules": [{"id": "r1"}],
    })
    rc_ok, _, _ = _run("--bundle", str(b))
    assert rc_ok == 0  # default: kind optional
    rc_strict, env, _ = _run("--bundle", str(b), "--strict-kind")
    assert rc_strict != 0
    codes = [p["Code"] for p in env["Errors"]["Details"]["Problems"]]
    assert "RuleKindMissing" in codes
