"""Per-code / per-rule budget + problem telemetry aggregator (Plan 90 Step 95).

Owning specs:
  - `spec/21-app/33-rule-evaluation.md` §5 (per-rule LatencyMs + TimeoutMs budget)
  - `spec/21-app/24-runsession-record.md` §4 (per-rule audit trail keys)
  - `spec/21-app/76-observability.md` (dashboard consumers)

Rationale
---------
Steps 83-94 land the raw signals: per-judgment `LatencyMs`, per-timeout
`E_RULE_TIMEOUT`, and the closed `BundleProblemCode` set. Nothing yet folds
those signals into a shape a dashboard (Step 131+ FE tiles, Step 111+ release
audit) can render without re-implementing percentile math and enum lookups in
five different places.

This module is the single source of truth for:
  * Problem-code counts from the loader `Problems[]` list.
  * ErrorCode counts from `Judgments[].Details.ErrorCode`.
  * Verdict counts across a run set (Pass / Fail / Error / Skipped / other).
  * Per-rule and per-RuleKind latency stats (Count, P50, P95, Max, Sum).
  * Explicit `TimeoutCount` derived from `E_RULE_TIMEOUT` so alerting can key
    off ONE integer rather than re-walking every judgment.

Pure module: no I/O, no clock, no numpy. Percentile uses linear interpolation
on a sorted list (identical to `statistics.quantiles` `method="inclusive"`
for reasonable sample sizes) so it works on 1..N samples without spinning up
numpy for a dashboard tile.

Every input field is treated defensively: records from JSONL on disk may be
partially written by an older kernel or a poison line, so unknown / non-dict
entries are skipped, never crashed on. Skipping is bounded: any skipped
judgment is counted under `MalformedJudgmentCount` so a silent 0 is
impossible when the input is broken.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field
from typing import Any

from rule_kernel.problems import ALL_CODES as BUNDLE_PROBLEM_CODES

# Verdicts we bucket explicitly. Anything else falls through to `Other` so a
# future verdict rename surfaces in the dashboard instead of vanishing.
_KNOWN_VERDICTS: tuple[str, ...] = ("Pass", "Fail", "Error", "Skipped")


@dataclass(frozen=True)
class LatencyStats:
    """Per-bucket latency summary. All ms. Pure numeric, JSON-safe.

    P50/P95 use linear interpolation on the sorted sample. For `Count=1`
    both equal the single sample. For `Count=0` an all-zero stat is
    emitted (the caller decides whether to render the tile at all).
    """

    Count: int = 0
    Sum: float = 0.0
    P50: float = 0.0
    P95: float = 0.0
    Max: float = 0.0

    def to_dict(self) -> dict[str, float | int]:
        return {
            "Count": self.Count,
            "Sum": round(self.Sum, 4),
            "P50": round(self.P50, 4),
            "P95": round(self.P95, 4),
            "Max": round(self.Max, 4),
        }


@dataclass(frozen=True)
class DashboardAggregate:
    """Aggregated telemetry across one or more run-record inputs.

    All maps are sorted by key on `to_dict()` so JSON output is stable
    for snapshot tests and human diffing.
    """

    RunCount: int = 0
    JudgmentCount: int = 0
    MalformedJudgmentCount: int = 0
    TimeoutCount: int = 0
    VerdictCounts: dict[str, int] = field(default_factory=dict)
    ErrorCodeCounts: dict[str, int] = field(default_factory=dict)
    ProblemCodeCounts: dict[str, int] = field(default_factory=dict)
    UnknownProblemCodes: dict[str, int] = field(default_factory=dict)
    LatencyByRule: dict[str, LatencyStats] = field(default_factory=dict)
    LatencyByKind: dict[str, LatencyStats] = field(default_factory=dict)
    LatencyOverall: LatencyStats = field(default_factory=LatencyStats)

    def to_dict(self) -> dict[str, Any]:
        return {
            "RunCount": self.RunCount,
            "JudgmentCount": self.JudgmentCount,
            "MalformedJudgmentCount": self.MalformedJudgmentCount,
            "TimeoutCount": self.TimeoutCount,
            "VerdictCounts": dict(sorted(self.VerdictCounts.items())),
            "ErrorCodeCounts": dict(sorted(self.ErrorCodeCounts.items())),
            "ProblemCodeCounts": dict(sorted(self.ProblemCodeCounts.items())),
            "UnknownProblemCodes": dict(sorted(self.UnknownProblemCodes.items())),
            "LatencyByRule": {
                k: v.to_dict() for k, v in sorted(self.LatencyByRule.items())
            },
            "LatencyByKind": {
                k: v.to_dict() for k, v in sorted(self.LatencyByKind.items())
            },
            "LatencyOverall": self.LatencyOverall.to_dict(),
        }


def _percentile(sorted_samples: list[float], q: float) -> float:
    """Linear-interpolation percentile on a pre-sorted list. `q` in [0, 1]."""
    n = len(sorted_samples)
    if n == 0:
        return 0.0
    if n == 1:
        return sorted_samples[0]
    # Clamp defensively so a caller passing q=1.0 or q=0.0 does not index OOB.
    if q <= 0:
        return sorted_samples[0]
    if q >= 1:
        return sorted_samples[-1]
    pos = q * (n - 1)
    lo = int(pos)
    hi = min(lo + 1, n - 1)
    frac = pos - lo
    return sorted_samples[lo] + (sorted_samples[hi] - sorted_samples[lo]) * frac


def _stats(samples: list[float]) -> LatencyStats:
    if not samples:
        return LatencyStats()
    s = sorted(samples)
    return LatencyStats(
        Count=len(s),
        Sum=sum(s),
        P50=_percentile(s, 0.5),
        P95=_percentile(s, 0.95),
        Max=s[-1],
    )


def _coerce_latency(value: Any) -> float | None:
    """Accept int/float only. Reject bools (`isinstance(True, int) is True`)
    and non-finite floats so a poisoned record does not skew stats.
    """
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        f = float(value)
        # NaN != NaN; also drop +/-inf.
        if f != f or f in (float("inf"), float("-inf")):
            return None
        if f < 0:
            return None
        return f
    return None


def aggregate_runs(records: Iterable[Mapping[str, Any]]) -> DashboardAggregate:
    """Fold N run-record dicts (as produced by the processing CLI evaluator
    or read back from `RunSession.jsonl`) into a single DashboardAggregate.

    Loader Problems are read from `record["Problems"]` when present (that
    key is written by the bundle loader's `LoaderResult.problems` when
    persisted). Unknown Problem codes are NOT silently accepted: they
    accumulate under `UnknownProblemCodes` so a drift is visible.
    """
    run_count = 0
    judgment_count = 0
    malformed = 0
    timeout_count = 0
    verdict_counts: dict[str, int] = {v: 0 for v in _KNOWN_VERDICTS}
    error_counts: dict[str, int] = {}
    problem_counts: dict[str, int] = {}
    unknown_problems: dict[str, int] = {}
    per_rule: dict[str, list[float]] = {}
    per_kind: dict[str, list[float]] = {}
    overall: list[float] = []

    for rec in records:
        if not isinstance(rec, Mapping):
            continue
        run_count += 1

        problems = rec.get("Problems")
        if isinstance(problems, list):
            for p in problems:
                if not isinstance(p, Mapping):
                    continue
                code = p.get("Code")
                if not isinstance(code, str) or not code:
                    continue
                if code in BUNDLE_PROBLEM_CODES:
                    problem_counts[code] = problem_counts.get(code, 0) + 1
                else:
                    unknown_problems[code] = unknown_problems.get(code, 0) + 1

        judgments = rec.get("Judgments")
        if not isinstance(judgments, list):
            continue
        for j in judgments:
            if not isinstance(j, Mapping):
                malformed += 1
                continue
            judgment_count += 1

            verdict = j.get("Verdict")
            if isinstance(verdict, str) and verdict:
                verdict_counts[verdict] = verdict_counts.get(verdict, 0) + 1
            else:
                verdict_counts["Other"] = verdict_counts.get("Other", 0) + 1

            details = j.get("Details") or j.get("details") or {}
            if not isinstance(details, Mapping):
                malformed += 1
                details = {}

            err = details.get("ErrorCode")
            if isinstance(err, str) and err:
                error_counts[err] = error_counts.get(err, 0) + 1
                if err == "E_RULE_TIMEOUT":
                    timeout_count += 1

            latency = _coerce_latency(details.get("LatencyMs"))
            if latency is None:
                continue
            overall.append(latency)

            rid = j.get("RuleId") if isinstance(j.get("RuleId"), str) else None
            if rid:
                per_rule.setdefault(rid, []).append(latency)

            kind = details.get("RuleKind")
            if isinstance(kind, str) and kind:
                per_kind.setdefault(kind, []).append(latency)

    return DashboardAggregate(
        RunCount=run_count,
        JudgmentCount=judgment_count,
        MalformedJudgmentCount=malformed,
        TimeoutCount=timeout_count,
        VerdictCounts={k: v for k, v in verdict_counts.items() if v > 0},
        ErrorCodeCounts=error_counts,
        ProblemCodeCounts=problem_counts,
        UnknownProblemCodes=unknown_problems,
        LatencyByRule={rid: _stats(v) for rid, v in per_rule.items()},
        LatencyByKind={k: _stats(v) for k, v in per_kind.items()},
        LatencyOverall=_stats(overall),
    )


__all__ = ["DashboardAggregate", "LatencyStats", "aggregate_runs"]
