"""Tests for the Step 95 dashboard aggregator.

Guards the invariants downstream tiles depend on:
  * Wire keys are PascalCase and stable (snapshot-friendly).
  * Percentile math is correct for tiny samples (n=1, n=2, n=20).
  * Malformed inputs never crash; they land in MalformedJudgmentCount.
  * Unknown Problem codes are quarantined, not silently accepted.
  * E_RULE_TIMEOUT explicitly bumps TimeoutCount so alerting has one key.
"""

from __future__ import annotations

import math

import pytest

from BE.app.rules.kernel.dashboard import (
    DashboardAggregate,
    LatencyStats,
    _coerce_latency,
    _percentile,
    aggregate_runs,
)


def _judgment(
    rule_id: str,
    verdict: str,
    latency: float | None = None,
    kind: str | None = "PresenceAbsence",
    error_code: str | None = None,
) -> dict:
    details: dict = {}
    if latency is not None:
        details["LatencyMs"] = latency
    if kind is not None:
        details["RuleKind"] = kind
    if error_code is not None:
        details["ErrorCode"] = error_code
    return {"RuleId": rule_id, "Verdict": verdict, "Details": details}


def test_percentile_single_sample_returns_that_value():
    assert _percentile([7.5], 0.5) == 7.5
    assert _percentile([7.5], 0.95) == 7.5


def test_percentile_two_samples_interpolates():
    # P50 of [10, 20] with linear interpolation on 0..n-1 == 15.
    assert _percentile([10.0, 20.0], 0.5) == 15.0


def test_percentile_matches_expected_for_uniform_series():
    samples = [float(i) for i in range(1, 21)]  # 1..20
    # (n-1) * 0.95 = 19 * 0.95 = 18.05 -> between samples[18]=19 and samples[19]=20.
    assert math.isclose(_percentile(samples, 0.95), 19.05)
    assert _percentile(samples, 0.0) == 1.0
    assert _percentile(samples, 1.0) == 20.0


def test_percentile_empty_is_zero_not_crash():
    assert _percentile([], 0.5) == 0.0


def test_coerce_latency_rejects_bool_nan_inf_negative_and_strings():
    assert _coerce_latency(True) is None
    assert _coerce_latency(float("nan")) is None
    assert _coerce_latency(float("inf")) is None
    assert _coerce_latency(-1) is None
    assert _coerce_latency("12.5") is None
    assert _coerce_latency(12.5) == 12.5
    assert _coerce_latency(0) == 0.0


def test_aggregate_empty_input():
    agg = aggregate_runs([])
    assert isinstance(agg, DashboardAggregate)
    assert agg.RunCount == 0
    assert agg.JudgmentCount == 0
    assert agg.LatencyOverall == LatencyStats()
    assert agg.to_dict()["VerdictCounts"] == {}


def test_aggregate_counts_verdicts_and_latencies_by_rule_and_kind():
    rec = {
        "Judgments": [
            _judgment("r1", "Pass", latency=10.0, kind="PresenceAbsence"),
            _judgment("r1", "Pass", latency=30.0, kind="PresenceAbsence"),
            _judgment("r2", "Fail", latency=50.0, kind="Count"),
        ]
    }
    agg = aggregate_runs([rec])
    assert agg.RunCount == 1
    assert agg.JudgmentCount == 3
    assert agg.VerdictCounts == {"Pass": 2, "Fail": 1}
    assert agg.LatencyByRule["r1"].Count == 2
    assert agg.LatencyByRule["r1"].Max == 30.0
    assert agg.LatencyByKind["PresenceAbsence"].Count == 2
    assert agg.LatencyByKind["Count"].Count == 1
    assert agg.LatencyOverall.Count == 3
    assert agg.LatencyOverall.Max == 50.0


def test_timeout_error_code_bumps_dedicated_counter():
    rec = {
        "Judgments": [
            _judgment("slow", "Error", latency=1200.0, error_code="E_RULE_TIMEOUT"),
            _judgment("ok", "Pass", latency=5.0),
        ]
    }
    agg = aggregate_runs([rec])
    assert agg.TimeoutCount == 1
    assert agg.ErrorCodeCounts == {"E_RULE_TIMEOUT": 1}


def test_multiple_error_codes_accumulate_but_only_timeout_bumps_timeout_count():
    rec = {
        "Judgments": [
            _judgment("a", "Error", latency=1.0, error_code="E_RULE_EVAL_FAILED"),
            _judgment("b", "Error", latency=2.0, error_code="E_RULE_TIMEOUT"),
            _judgment("c", "Error", latency=3.0, error_code="E_RULE_TIMEOUT"),
        ]
    }
    agg = aggregate_runs([rec])
    assert agg.TimeoutCount == 2
    assert agg.ErrorCodeCounts == {"E_RULE_EVAL_FAILED": 1, "E_RULE_TIMEOUT": 2}


def test_problem_code_known_vs_unknown_split():
    rec = {
        "Problems": [
            {"Code": "RuleRefCycle", "Message": "..."},
            {"Code": "RuleKindUnknown", "Message": "..."},
            {"Code": "TotallyMadeUpCode", "Message": "..."},
            {"Message": "no code field"},
            "not-a-dict",
        ],
        "Judgments": [],
    }
    agg = aggregate_runs([rec])
    assert agg.ProblemCodeCounts == {"RuleRefCycle": 1, "RuleKindUnknown": 1}
    assert agg.UnknownProblemCodes == {"TotallyMadeUpCode": 1}


def test_malformed_inputs_are_counted_not_crashed():
    records = [
        "not-a-mapping",
        {"Judgments": "not-a-list"},
        {"Judgments": ["not-a-dict", 42, None]},
        {"Judgments": [{"RuleId": "r", "Verdict": "Pass", "Details": "not-a-dict"}]},
    ]
    agg = aggregate_runs(records)  # type: ignore[arg-type]
    # Only the last 3 dict records count as runs; the string is skipped.
    assert agg.RunCount == 3
    # 3 non-dict judgments in one record + 1 malformed Details in another.
    assert agg.MalformedJudgmentCount == 4


def test_lowercase_details_key_still_read_defensively():
    rec = {
        "Judgments": [
            {"RuleId": "r", "Verdict": "Pass", "details": {"LatencyMs": 8.0}},
        ]
    }
    agg = aggregate_runs([rec])
    assert agg.LatencyOverall.Count == 1
    assert agg.LatencyOverall.Max == 8.0


def test_to_dict_keys_are_sorted_for_stable_snapshots():
    rec = {
        "Judgments": [
            _judgment("z", "Pass", latency=1.0, kind="Zeta"),
            _judgment("a", "Pass", latency=1.0, kind="Alpha"),
        ]
    }
    d = aggregate_runs([rec]).to_dict()
    assert list(d["LatencyByRule"].keys()) == ["a", "z"]
    assert list(d["LatencyByKind"].keys()) == ["Alpha", "Zeta"]


def test_unknown_verdict_falls_through_to_other_bucket():
    rec = {"Judgments": [_judgment("r", "Weird", latency=1.0)]}
    agg = aggregate_runs([rec])
    assert agg.VerdictCounts == {"Weird": 1}


def test_latency_stats_to_dict_rounds_to_4dp():
    stats = LatencyStats(Count=1, Sum=1.234567, P50=1.234567, P95=1.234567, Max=1.234567)
    assert stats.to_dict()["Sum"] == 1.2346


def test_multi_run_folds_latencies_across_records():
    r1 = {"Judgments": [_judgment("r", "Pass", latency=10.0)]}
    r2 = {"Judgments": [_judgment("r", "Pass", latency=30.0)]}
    r3 = {"Judgments": [_judgment("r", "Pass", latency=50.0)]}
    agg = aggregate_runs([r1, r2, r3])
    assert agg.RunCount == 3
    assert agg.LatencyByRule["r"].Count == 3
    assert agg.LatencyByRule["r"].P50 == 30.0
    assert agg.LatencyByRule["r"].Max == 50.0


def test_missing_ruleid_still_lands_in_overall_and_kind_buckets():
    rec = {
        "Judgments": [
            {"Verdict": "Pass", "Details": {"LatencyMs": 4.0, "RuleKind": "PresenceAbsence"}}
        ]
    }
    agg = aggregate_runs([rec])
    assert agg.LatencyOverall.Count == 1
    assert "PresenceAbsence" in agg.LatencyByKind
    assert agg.LatencyByRule == {}


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
