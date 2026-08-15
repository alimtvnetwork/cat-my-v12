"""Bundle loader contract tests (Plan 90 Step 80).

Pins:
  - Valid bundle parses into a `RuleBundle` with mode mapped per spec 49
    (parallel->full, sequential->short-circuit).
  - Every shape violation is collected into `details.Problems[]` before
    raising: no early-exit, no partial bundle returned.
  - `E_RULE_BUNDLE_INVALID` fires for: missing file, unreadable file,
    non-JSON, non-object root, non-int schemaVersion, non-array rules,
    unknown kind/status, missing id, duplicate id, non-object params,
    bad acceptanceConditions, unknown validationMode.
  - `strict_kind=True` promotes missing kind from silent to problem.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from rule_kernel.loader import load_bundle
from rule_kernel.models import RuleStatus
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _write(tmp_path: Path, data: Any, name: str = "bundle.json") -> Path:
    p = tmp_path / name
    p.write_text(json.dumps(data), encoding="utf-8")
    return p


def _valid_rule(rid: str = "r1", status: str = "Active") -> dict[str, Any]:
    return {"id": rid, "name": rid.upper(), "kind": "PresenceAbsence",
            "status": status, "params": {}}


def test_valid_bundle_parses_all_fields(tmp_path: Path) -> None:
    path = _write(tmp_path, {"bundleId": "b-42", "schemaVersion": 3,
                             "validationMode": "sequential",
                             "rules": [_valid_rule("a"), _valid_rule("b", "Silent")]})
    bundle = load_bundle(path)
    assert bundle.bundle_id == "b-42"
    assert bundle.version == 3
    assert bundle.mode == "short-circuit"
    assert [r.id for r in bundle.rules] == ["a", "b"]
    assert bundle.rules[1].status is RuleStatus.SILENT


def test_missing_validation_mode_defaults_to_full(tmp_path: Path) -> None:
    path = _write(tmp_path, {"schemaVersion": 1, "rules": []})
    bundle = load_bundle(path)
    assert bundle.mode == "full"
    assert bundle.bundle_id == path.stem


def test_missing_file_raises_bundle_invalid(tmp_path: Path) -> None:
    with pytest.raises(AppError) as exc:
        load_bundle(tmp_path / "nope.json")
    assert exc.value.code is ErrorCode.E_RULE_BUNDLE_INVALID
    codes = [p["Code"] for p in exc.value.details["Problems"]]
    assert "BundleFileMissing" in codes


def test_non_json_content_raises_bundle_invalid(tmp_path: Path) -> None:
    p = tmp_path / "b.json"
    p.write_text("{ not json", encoding="utf-8")
    with pytest.raises(AppError) as exc:
        load_bundle(p)
    codes = [x["Code"] for x in exc.value.details["Problems"]]
    assert "BundleJsonInvalid" in codes


def test_all_problems_collected_not_early_exit(tmp_path: Path) -> None:
    path = _write(tmp_path, {
        "schemaVersion": "bad",
        "validationMode": "weird",
        "rules": [
            {"id": "", "kind": "Nope", "status": "Whatever"},
            _valid_rule("dup"),
            _valid_rule("dup"),
            {"id": "p", "kind": "Count", "params": "not-an-object"},
        ],
    })
    with pytest.raises(AppError) as exc:
        load_bundle(path)
    codes = [p["Code"] for p in exc.value.details["Problems"]]
    for expected in ("SchemaVersionInvalid", "ValidationModeUnknown",
                     "RuleIdMissing", "RuleKindUnknown", "RuleStatusInvalid",
                     "RuleIdDuplicate", "RuleParamsNotObject"):
        assert expected in codes, f"missing {expected} in {codes}"
    assert exc.value.details["ProblemCount"] == len(codes)


def test_strict_kind_promotes_missing_kind(tmp_path: Path) -> None:
    path = _write(tmp_path, {"schemaVersion": 1,
                             "rules": [{"id": "r1", "status": "Active"}]})
    load_bundle(path)  # lenient default: no problem
    with pytest.raises(AppError) as exc:
        load_bundle(path, strict_kind=True)
    codes = [p["Code"] for p in exc.value.details["Problems"]]
    assert "RuleKindMissing" in codes


def test_acceptance_conditions_string_validated(tmp_path: Path) -> None:
    conds = json.dumps([{"presence": "bogus", "targetColor": "red",
                         "similarityPct": 200}])
    path = _write(tmp_path, {"schemaVersion": 1, "rules": [
        {"id": "r1", "kind": "PresenceAbsence", "status": "Active",
         "params": {"acceptanceConditions": conds}},
    ]})
    with pytest.raises(AppError) as exc:
        load_bundle(path)
    codes = [p["Code"] for p in exc.value.details["Problems"]]
    for expected in ("AcceptancePresenceInvalid", "AcceptanceTargetColorInvalid",
                     "AcceptanceSimilarityOutOfRange"):
        assert expected in codes


def test_enabled_false_maps_to_inactive(tmp_path: Path) -> None:
    path = _write(tmp_path, {"schemaVersion": 1, "rules": [
        {"id": "r1", "kind": "Count", "enabled": False},
    ]})
    bundle = load_bundle(path)
    assert bundle.rules[0].status is RuleStatus.INACTIVE
