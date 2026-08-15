"""Loader DAG + tolerance validation tests (Plan 90 Step 90).

Pins:
  - MathExpression `Expression` refs must exist and point at rules with
    a strictly lower `orderIndex` (spec 33 §6); missing / forward /
    self-ref land in `Problems[]`.
  - Bundle-level `toleranceProfiles` validates via `build_profile_map`;
    per-rule `ToleranceRef` resolves via `resolve_for_rule`. All
    failures are folded into `Problems[]`, never partial success.
  - `orderIndex` must be unique within the bundle and either present on
    every rule or none.
  - Valid bundle exposes `task_id` and `tolerance_profiles` on the
    returned `RuleBundle`.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from rule_kernel.loader import load_bundle
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _write(tmp_path: Path, data: Any) -> Path:
    p = tmp_path / "bundle.json"
    p.write_text(json.dumps(data), encoding="utf-8")
    return p


def _rule(rid: str, kind: str = "PresenceAbsence", order: int | None = None,
          params: dict[str, Any] | None = None) -> dict[str, Any]:
    r: dict[str, Any] = {"id": rid, "name": rid, "kind": kind,
                         "status": "Active", "params": params or {}}
    if order is not None:
        r["orderIndex"] = order
    return r


def _codes(exc: AppError) -> list[str]:
    return [p["Code"] for p in (exc.details or {}).get("Problems", [])]


def test_math_expression_forward_ref_rejected(tmp_path: Path) -> None:
    bundle = {
        "schemaVersion": 2, "validationMode": "parallel",
        "rules": [
            _rule("m", "MathExpression", order=1,
                  params={"Expression": "Rule.b.Value + 1",
                          "MinValue": 0, "MaxValue": 10}),
            _rule("b", "Count", order=2),
        ],
    }
    with pytest.raises(AppError) as ei:
        load_bundle(_write(tmp_path, bundle))
    assert ei.value.code == ErrorCode.E_RULE_BUNDLE_INVALID
    assert "RuleRefForward" in _codes(ei.value)


def test_math_expression_missing_ref_rejected(tmp_path: Path) -> None:
    bundle = {
        "schemaVersion": 2,
        "rules": [_rule("m", "MathExpression", order=1,
                        params={"Expression": "Rule.ghost.Value",
                                "MinValue": 0, "MaxValue": 1})],
    }
    with pytest.raises(AppError) as ei:
        load_bundle(_write(tmp_path, bundle))
    assert "RuleRefMissing" in _codes(ei.value)


def test_math_expression_self_ref_rejected(tmp_path: Path) -> None:
    bundle = {
        "schemaVersion": 2,
        "rules": [_rule("m", "MathExpression", order=1,
                        params={"Expression": "Rule.m.Value + 0",
                                "MinValue": 0, "MaxValue": 1})],
    }
    with pytest.raises(AppError) as ei:
        load_bundle(_write(tmp_path, bundle))
    assert "RuleRefForward" in _codes(ei.value)


def test_math_expression_backward_ref_ok(tmp_path: Path) -> None:
    bundle = {
        "schemaVersion": 2,
        "rules": [
            _rule("b", "Count", order=1),
            _rule("m", "MathExpression", order=2,
                  params={"Expression": "Rule.b.Value + 1",
                          "MinValue": 0, "MaxValue": 999}),
        ],
    }
    result = load_bundle(_write(tmp_path, bundle))
    assert [r.id for r in result.rules] == ["b", "m"]


def test_order_index_duplicate_rejected(tmp_path: Path) -> None:
    bundle = {
        "schemaVersion": 2,
        "rules": [_rule("a", order=1), _rule("b", order=1)],
    }
    with pytest.raises(AppError) as ei:
        load_bundle(_write(tmp_path, bundle))
    assert "RuleOrderIndexDuplicate" in _codes(ei.value)


def test_order_index_all_or_none(tmp_path: Path) -> None:
    bundle = {
        "schemaVersion": 2,
        "rules": [_rule("a", order=1), _rule("b")],
    }
    with pytest.raises(AppError) as ei:
        load_bundle(_write(tmp_path, bundle))
    assert "RuleOrderIndexMissing" in _codes(ei.value)


def test_tolerance_profiles_and_ref_resolve(tmp_path: Path) -> None:
    bundle = {
        "schemaVersion": 2, "taskId": "T1",
        "toleranceProfiles": [{
            "ProfileId": "tp1", "ProfileName": "Match80",
            "Kind": "MatchPercent", "ParamsJson": {"MinPercent": 80},
        }],
        "rules": [_rule("a", "PresenceAbsence",
                        params={"ToleranceRef": "tp1"})],
    }
    result = load_bundle(_write(tmp_path, bundle))
    assert result.task_id == "T1"
    assert len(result.tolerance_profiles) == 1
    assert result.tolerance_profiles[0]["ProfileId"] == "tp1"


def test_tolerance_ref_missing_rejected(tmp_path: Path) -> None:
    bundle = {
        "schemaVersion": 2, "taskId": "T1",
        "toleranceProfiles": [{
            "ProfileId": "tp1", "ProfileName": "Match80",
            "Kind": "MatchPercent", "ParamsJson": {"MinPercent": 80},
        }],
        "rules": [_rule("a", "PresenceAbsence",
                        params={"ToleranceRef": "ghost"})],
    }
    with pytest.raises(AppError) as ei:
        load_bundle(_write(tmp_path, bundle))
    assert "RuleToleranceUnresolved" in _codes(ei.value)


def test_tolerance_kind_incompatible_rejected(tmp_path: Path) -> None:
    bundle = {
        "schemaVersion": 2, "taskId": "T1",
        "toleranceProfiles": [{
            "ProfileId": "tp1", "ProfileName": "Range",
            "Kind": "ScalarRange",
            "ParamsJson": {"Min": 0, "Max": 10, "Inclusive": "Both"},
        }],
        "rules": [_rule("a", "PresenceAbsence",
                        params={"ToleranceRef": "tp1"})],
    }
    with pytest.raises(AppError) as ei:
        load_bundle(_write(tmp_path, bundle))
    assert "RuleToleranceUnresolved" in _codes(ei.value)


def test_tolerance_profiles_invalid_shape(tmp_path: Path) -> None:
    bundle = {
        "schemaVersion": 2, "taskId": "T1",
        "toleranceProfiles": [{
            "ProfileId": "tp1", "ProfileName": "Bad",
            "Kind": "ScalarRange",
            "ParamsJson": {"Min": 10, "Max": 0, "Inclusive": "Both"},
        }],
        "rules": [_rule("a", "PresenceAbsence")],
    }
    with pytest.raises(AppError) as ei:
        load_bundle(_write(tmp_path, bundle))
    assert "ToleranceProfilesInvalid" in _codes(ei.value)


def test_multiple_problems_collected(tmp_path: Path) -> None:
    bundle = {
        "schemaVersion": 2,
        "rules": [
            _rule("m", "MathExpression", order=1,
                  params={"Expression": "Rule.ghost.Value + Rule.also_missing.X",
                          "MinValue": 0, "MaxValue": 1}),
        ],
    }
    with pytest.raises(AppError) as ei:
        load_bundle(_write(tmp_path, bundle))
    codes = _codes(ei.value)
    assert codes.count("RuleRefMissing") == 2


def test_task_id_wrong_type(tmp_path: Path) -> None:
    bundle = {"schemaVersion": 2, "taskId": 42, "rules": []}
    with pytest.raises(AppError) as ei:
        load_bundle(_write(tmp_path, bundle))
    assert "TaskIdInvalid" in _codes(ei.value)
