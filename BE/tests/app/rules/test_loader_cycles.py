"""Rule-ref cycle guard tests (Plan 90 Step 93).

Pins spec 21-app/33 §6: MathExpression rules that form a reference cycle
must surface one `RuleRefCycle` problem per distinct cycle with the full
chain, and the redundant `RuleRefForward` on the closing edge must be
suppressed.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from BE.app.rules.kernel.loader import load_bundle
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _write(tmp_path: Path, data: Any) -> Path:
    p = tmp_path / "bundle.json"
    p.write_text(json.dumps(data), encoding="utf-8")
    return p


def _math(rid: str, expr: str, order: int) -> dict[str, Any]:
    return {"id": rid, "name": rid, "kind": "MathExpression",
            "status": "Active", "orderIndex": order,
            "params": {"Expression": expr, "MinValue": 0, "MaxValue": 1000}}


def _problems(exc: AppError) -> list[dict[str, Any]]:
    return list((exc.details or {}).get("Problems", []))


def _codes(exc: AppError) -> list[str]:
    return [p["Code"] for p in _problems(exc)]


def test_two_rule_cycle_reports_ref_cycle(tmp_path: Path) -> None:
    bundle = {
        "schemaVersion": 2,
        "rules": [
            _math("a", "Rule.b.Value + 1", 1),
            _math("b", "Rule.a.Value + 1", 2),
        ],
    }
    with pytest.raises(AppError) as ei:
        load_bundle(_write(tmp_path, bundle))
    assert ei.value.code == ErrorCode.E_RULE_BUNDLE_INVALID
    codes = _codes(ei.value)
    assert codes.count("RuleRefCycle") == 1
    # Forward-ref on the closing edge must be suppressed.
    assert "RuleRefForward" not in codes
    cycle = next(p for p in _problems(ei.value) if p["Code"] == "RuleRefCycle")
    assert cycle["Details"]["RuleIds"] == ["a", "b"]
    assert cycle["Details"]["Chain"][0] == cycle["Details"]["Chain"][-1]


def test_three_rule_cycle_reports_ref_cycle(tmp_path: Path) -> None:
    bundle = {
        "schemaVersion": 2,
        "rules": [
            _math("a", "Rule.b.Value", 1),
            _math("b", "Rule.c.Value", 2),
            _math("c", "Rule.a.Value", 3),
        ],
    }
    with pytest.raises(AppError) as ei:
        load_bundle(_write(tmp_path, bundle))
    codes = _codes(ei.value)
    assert codes.count("RuleRefCycle") == 1
    cycle = next(p for p in _problems(ei.value) if p["Code"] == "RuleRefCycle")
    assert cycle["Details"]["RuleIds"] == ["a", "b", "c"]


def test_two_disjoint_cycles_each_reported_once(tmp_path: Path) -> None:
    bundle = {
        "schemaVersion": 2,
        "rules": [
            _math("a", "Rule.b.Value", 1),
            _math("b", "Rule.a.Value", 2),
            _math("c", "Rule.d.Value", 3),
            _math("d", "Rule.c.Value", 4),
        ],
    }
    with pytest.raises(AppError) as ei:
        load_bundle(_write(tmp_path, bundle))
    codes = _codes(ei.value)
    assert codes.count("RuleRefCycle") == 2
    id_sets = sorted(
        tuple(p["Details"]["RuleIds"])
        for p in _problems(ei.value) if p["Code"] == "RuleRefCycle"
    )
    assert id_sets == [("a", "b"), ("c", "d")]


def test_forward_ref_without_cycle_still_reports_forward(tmp_path: Path) -> None:
    bundle = {
        "schemaVersion": 2,
        "rules": [
            _math("a", "Rule.b.Value", 1),
            {"id": "b", "name": "b", "kind": "Count",
             "status": "Active", "orderIndex": 2, "params": {}},
        ],
    }
    with pytest.raises(AppError) as ei:
        load_bundle(_write(tmp_path, bundle))
    codes = _codes(ei.value)
    assert "RuleRefForward" in codes
    assert "RuleRefCycle" not in codes


def test_self_reference_reports_forward_not_cycle(tmp_path: Path) -> None:
    # Self-ref is a degenerate cycle but historically reported as
    # RuleRefForward; keep that behaviour so authors get the pre-existing
    # actionable hint. New cycle guard only fires for len >= 2.
    bundle = {
        "schemaVersion": 2,
        "rules": [_math("a", "Rule.a.Value + 1", 1)],
    }
    with pytest.raises(AppError) as ei:
        load_bundle(_write(tmp_path, bundle))
    codes = _codes(ei.value)
    assert "RuleRefForward" in codes
    assert "RuleRefCycle" not in codes


def test_valid_backward_chain_loads(tmp_path: Path) -> None:
    bundle = {
        "schemaVersion": 2,
        "rules": [
            {"id": "src", "name": "src", "kind": "Count",
             "status": "Active", "orderIndex": 1, "params": {}},
            _math("a", "Rule.src.Value + 1", 2),
            _math("b", "Rule.a.Value + Rule.src.Value", 3),
        ],
    }
    loaded = load_bundle(_write(tmp_path, bundle))
    assert [s.id for s in loaded.rules] == ["src", "a", "b"]
