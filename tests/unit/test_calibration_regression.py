"""Unit tests for linter-scripts/check-calibration-regression.py."""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "linter-scripts" / "check-calibration-regression.py"


def _load_module():
    spec = importlib.util.spec_from_file_location("cal_regression", SCRIPT)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


cal = _load_module()
Thr = cal.Thresholds


def _entry(margin: float, midpoint: float, separable: bool = True):
    return {"separation": {"margin": margin, "midpoint": midpoint, "separable": separable}}


def _report(**per_kind):
    return {"per_kind": per_kind}


def test_no_regression_when_current_matches_baseline():
    base = _report(C=_entry(1.0, 0.5))
    curr = _report(C=_entry(1.0, 0.5))
    assert cal.compare(base, curr, Thr(0.05, 0.10, 0.15)) == []


def test_flags_margin_drop_beyond_tolerance():
    base = _report(C=_entry(1.0, 0.5))
    curr = _report(C=_entry(0.80, 0.5))
    problems = cal.compare(base, curr, Thr(0.05, 0.10, 0.15))
    assert any("margin dropped" in p and "[C]" in p for p in problems)


def test_margin_drop_within_tolerance_passes():
    base = _report(C=_entry(1.0, 0.5))
    curr = _report(C=_entry(0.96, 0.5))
    assert cal.compare(base, curr, Thr(0.05, 0.10, 0.15)) == []


def test_flags_midpoint_drift_in_either_direction():
    base = _report(K=_entry(0.9, 0.44))
    curr = _report(K=_entry(0.9, 0.60))
    problems = cal.compare(base, curr, Thr(0.05, 0.10, 0.15))
    assert any("midpoint drifted" in p and "[K]" in p for p in problems)


def test_flags_separability_flip():
    base = _report(S=_entry(0.5, 0.5, separable=True))
    curr = _report(S=_entry(0.5, 0.5, separable=False))
    problems = cal.compare(base, curr, Thr(0.05, 0.10, 0.15))
    assert any("separable flipped" in p and "[S]" in p for p in problems)


def test_flags_missing_kind():
    base = _report(E=_entry(0.5, 0.75))
    curr = _report()
    problems = cal.compare(base, curr, Thr(0.05, 0.10, 0.15))
    assert any("missing from current report" in p and "[E]" in p for p in problems)


def test_flags_margin_floor_even_when_baseline_was_low():
    # Baseline already low; current stays flat vs baseline but is still
    # below the absolute floor and must fail.
    base = _report(R=_entry(0.10, 0.5))
    curr = _report(R=_entry(0.10, 0.5))
    problems = cal.compare(base, curr, Thr(0.05, 0.10, 0.15))
    assert any("below floor" in p and "[R]" in p for p in problems)