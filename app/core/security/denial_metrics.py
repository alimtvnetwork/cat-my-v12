"""Deterministic denial-telemetry metrics.

Pure, side-effect-free helpers used by:
  - `scripts/security/tradeoff_report.py`  (HTML tradeoff table)
  - `scripts/security/denial_evidence_cli.py` (E2E evidence pipeline)
  - `tests/unit/test_denial_replay_harness.py` (regression harness)

Contract:
  - Inputs are JSONL rows shaped `{ts, code, user_id, subject, detail, label?}`.
    `label` is optional and, when present, MUST be either `"attack"` or
    `"legit"`. It carries ground truth for FP/FN. Rows without a label
    contribute to totals but never to FP/FN.
  - Every function is deterministic: same input JSONL -> same output.
  - No I/O beyond an explicit `path` argument.
"""
from __future__ import annotations

import json
import logging
import math
import statistics
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Iterable, Optional, Protocol, Sequence

log = logging.getLogger("ca.security.denial_metrics")

DENIAL_CODES = ("E_SEC_ROLE_DENIED", "E_SEC_NOAUTH")
ROLE_DENIED_CODE = "E_SEC_ROLE_DENIED"
ANON_ACTOR = "anon"
PERCENTILE_KEYS = (("p50", 50), ("p95", 95), ("p99", 99))

# Optional labels; anything else is dropped in strict mode and reported to
# the audit callback in audited mode. Anchored by spec 21-app/69a Methodology.
VALID_LABELS = ("attack", "legit")
DEFAULT_WINDOW_SECONDS = 60


class EvidenceRowError(ValueError):
    """Raised by `load_rows_strict` on any schema violation.

    Attributes:
      path: source JSONL path (absolute).
      lineno: 1-based line number of the offending row.
      reason: short machine tag (e.g. `bad_json`, `missing_ts`, `bad_label`).
    """

    def __init__(self, path: Path, lineno: int, reason: str, msg: str) -> None:
        super().__init__(f"{path}:{lineno}: {reason}: {msg}")
        self.path = path
        self.lineno = lineno
        self.reason = reason


class _RecorderProto(Protocol):
    def record(self, code: str, subject: str, *, user_id: str | None = None, detail: str = "") -> Any: ...


@dataclass(frozen=True)
class DenialRow:
    ts: int
    code: str
    user_id: str | None
    subject: str
    detail: str
    label: str | None  # "attack" | "legit" | None


def load_rows(path: Path) -> list[DenialRow]:
    """Read a JSONL file. Skip blank lines. Raise on malformed JSON."""
    rows: list[DenialRow] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s:
            continue
        obj = json.loads(s)
        if obj.get("code") not in DENIAL_CODES:
            continue
        rows.append(
            DenialRow(
                ts=int(obj["ts"]),
                code=str(obj["code"]),
                user_id=obj.get("user_id"),
                subject=str(obj.get("subject", "")),
                detail=str(obj.get("detail", "")),
                label=obj.get("label"),
            )
        )
    return rows


def _parse_row(path: Path, lineno: int, s: str) -> DenialRow | None:
    """Strict per-line parser. Returns None for rows outside DENIAL_CODES so
    the caller can distinguish "filtered by contract" from "invalid input"."""
    try:
        obj = json.loads(s)
    except json.JSONDecodeError as err:
        raise EvidenceRowError(path, lineno, "bad_json", str(err)) from err
    if not isinstance(obj, dict):
        raise EvidenceRowError(path, lineno, "not_object", type(obj).__name__)
    if "ts" not in obj:
        raise EvidenceRowError(path, lineno, "missing_ts", "row has no `ts` key")
    try:
        ts = int(obj["ts"])
    except (TypeError, ValueError) as err:
        raise EvidenceRowError(path, lineno, "bad_ts", str(err)) from err
    code = obj.get("code")
    if code not in DENIAL_CODES:
        # Contract: silently filter non-denial codes so evidence exports can
        # contain the whole audit_log without pre-filtering. This is NOT an
        # error condition.
        return None
    label = obj.get("label")
    if label is not None and label not in VALID_LABELS:
        raise EvidenceRowError(path, lineno, "bad_label", f"label={label!r}")
    return DenialRow(
        ts=ts,
        code=str(code),
        user_id=obj.get("user_id"),
        subject=str(obj.get("subject", "")),
        detail=str(obj.get("detail", "")),
        label=label,
    )


def load_rows_strict(path: Path) -> list[DenialRow]:
    """Load a JSONL evidence file with full schema validation.

    Raises `EvidenceRowError` on the first bad row with `path:line:reason`
    context. Non-denial codes are silently filtered (contract), blank lines
    are skipped.
    """
    rows: list[DenialRow] = []
    text = path.read_text(encoding="utf-8")
    for i, line in enumerate(text.splitlines(), start=1):
        s = line.strip()
        if not s:
            continue
        row = _parse_row(path, i, s)
        if row is not None:
            rows.append(row)
    return rows


def load_evidence_with_audit(
    path: Path,
    sink: _RecorderProto | None,
    *,
    strict: bool = False,
) -> list[DenialRow]:
    """Load an evidence JSONL and record every bad row to the audit sink.

    Emits `W_SEC_TUNING_EVIDENCE_LOAD_FAILED` per bad row with
    `detail="path=<abs> line=<n> reason=<tag> tuning_version=plan-29-v1"`.
    In non-strict mode bad rows are skipped so a large export with a few
    corrupt lines can still be evaluated; in strict mode the first bad row
    re-raises after being recorded so callers can fail fast in tests.
    """
    # Local import: audit_sink -> denial_metrics is not a real dependency
    # cycle (audit_sink stands alone), but we import at call time to keep
    # denial_metrics importable in tools that don't wire an audit sink.
    from app.core.security.audit_sink import CODE_TUNING_EVIDENCE_LOAD_FAILED

    # Match the tuning-version tag used by remediation.py so ops can filter
    # every burst-observability row from one grep.
    tuning_version = "plan-29-v1"
    rows: list[DenialRow] = []
    text = path.read_text(encoding="utf-8")
    for i, line in enumerate(text.splitlines(), start=1):
        s = line.strip()
        if not s:
            continue
        try:
            row = _parse_row(path, i, s)
        except EvidenceRowError as err:
            detail = (
                f"path={path} line={err.lineno} reason={err.reason} "
                f"tuning_version={tuning_version}"
            )
            if sink is not None:
                try:
                    sink.record(
                        CODE_TUNING_EVIDENCE_LOAD_FAILED,
                        "security.evidence",
                        detail=detail,
                    )
                except Exception as sink_err:  # noqa: BLE001
                    # Audit failure must never hide the original evidence
                    # error. Log and continue: the raise below still fires
                    # in strict mode.
                    log.error(
                        "denial_metrics.evidence_audit_failed err=%s original=%s",
                        sink_err, err,
                    )
            log.warning("denial_metrics.evidence_row_rejected %s", detail)
            if strict:
                raise
            continue
        if row is not None:
            rows.append(row)
    return rows


def per_actor_minute_counts(rows: Sequence[DenialRow]) -> list[int]:
    """Bucket rows by (user_id, ts // 60) and return sorted counts ascending.

    Rows with `user_id is None` fall into a synthetic `__anon__` actor so
    unauthenticated bursts still form a bucket.
    """
    buckets: dict[tuple[str, int], int] = {}
    for r in rows:
        key = (r.user_id or "__anon__", r.ts // DEFAULT_WINDOW_SECONDS)
        buckets[key] = buckets.get(key, 0) + 1
    return sorted(buckets.values())


def percentile(sorted_values: Sequence[int], pct: float) -> int:
    """Nearest-rank percentile (NIST SP 800-24). `sorted_values` ascending."""
    if not sorted_values:
        return 0
    if pct <= 0:
        return sorted_values[0]
    if pct >= 100:
        return sorted_values[-1]
    n = len(sorted_values)
    rank = max(1, min(n, int(round((pct / 100.0) * n))))
    return sorted_values[rank - 1]


def stddev(values: Sequence[int]) -> float:
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    var = sum((v - mean) ** 2 for v in values) / (len(values) - 1)
    return math.sqrt(var)


@dataclass(frozen=True)
class BaselineStats:
    sample_size: int
    buckets: int
    p50: int
    p95: int
    p99: int
    sigma: float


@dataclass(frozen=True)
class WindowPercentiles:
    p50: int
    p95: int
    p99: int
    buckets: int
    rows: int
    first_ts: int | None
    last_ts: int | None


def baseline(rows: Sequence[DenialRow]) -> BaselineStats:
    counts = per_actor_minute_counts(rows)
    return BaselineStats(
        sample_size=len(rows),
        buckets=len(counts),
        p50=percentile(counts, 50),
        p95=percentile(counts, 95),
        p99=percentile(counts, 99),
        sigma=round(stddev(counts), 4),
    )


def _bucket_for_window(row: DenialRow, window_seconds: int) -> tuple[str, int]:
    return (row.user_id or ANON_ACTOR, row.ts // window_seconds)


def _inclusive_percentile(values: Sequence[int], pct: int) -> int:
    if len(values) == 0:
        return 0
    if len(values) == 1:
        return values[0]
    qs = statistics.quantiles(values, n=100, method="inclusive")
    return int(round(qs[pct - 1]))


def percentiles_by_window(rows: Sequence[DenialRow], window_seconds: int) -> WindowPercentiles:
    role_rows = sorted((r for r in rows if r.code == ROLE_DENIED_CODE), key=lambda r: r.ts)
    buckets: dict[tuple[str, int], int] = {}
    for row in role_rows:
        key = _bucket_for_window(row, window_seconds)
        buckets[key] = buckets.get(key, 0) + 1
    counts = sorted(buckets.values())
    return WindowPercentiles(
        **{name: _inclusive_percentile(counts, pct) for name, pct in PERCENTILE_KEYS},
        buckets=len(counts), rows=len(role_rows),
        first_ts=role_rows[0].ts if role_rows else None,
        last_ts=role_rows[-1].ts if role_rows else None,
    )


@dataclass(frozen=True)
class CandidateResult:
    name: str
    threshold: int
    trips: int          # buckets whose count >= threshold
    fp: int             # trips whose ground-truth label is "legit"
    fn: int             # non-trips whose ground-truth label is "attack"
    labeled_buckets: int
    # Provenance: how the threshold was derived and the baseline snapshot
    # it was derived from. Populated by `evaluate_all`; direct callers of
    # `evaluate_candidate` may leave these at their defaults.
    formula: str = ""
    baseline_p50: int = 0
    baseline_p95: int = 0
    baseline_p99: int = 0
    baseline_sigma: float = 0.0
    baseline_sample_size: int = 0
    baseline_buckets: int = 0



def _bucket_labels(rows: Sequence[DenialRow]) -> dict[tuple[str, int], tuple[int, str | None]]:
    """Bucket -> (count, label). Label is the majority label among rows in
    the bucket; unlabeled rows do not vote. `None` when the bucket has no
    labeled rows."""
    counts: dict[tuple[str, int], int] = {}
    votes: dict[tuple[str, int], dict[str, int]] = {}
    for r in rows:
        key = (r.user_id or "__anon__", r.ts // DEFAULT_WINDOW_SECONDS)
        counts[key] = counts.get(key, 0) + 1
        if r.label in ("attack", "legit"):
            v = votes.setdefault(key, {})
            v[r.label] = v.get(r.label, 0) + 1
    out: dict[tuple[str, int], tuple[int, str | None]] = {}
    for key, c in counts.items():
        v = votes.get(key)
        if not v:
            out[key] = (c, None)
        else:
            # Deterministic tiebreak: prefer "attack" on a tie so FN stays
            # visible rather than hidden behind the tie.
            label = "attack" if v.get("attack", 0) >= v.get("legit", 0) else "legit"
            out[key] = (c, label)
    return out


def evaluate_candidate(rows: Sequence[DenialRow], threshold: int, name: str) -> CandidateResult:
    labelled = _bucket_labels(rows)
    trips = fp = fn = labeled_buckets = 0
    for _, (count, label) in labelled.items():
        tripped = count >= threshold
        if tripped:
            trips += 1
        if label is None:
            continue
        labeled_buckets += 1
        if tripped and label == "legit":
            fp += 1
        elif not tripped and label == "attack":
            fn += 1
    return CandidateResult(
        name=name,
        threshold=threshold,
        trips=trips,
        fp=fp,
        fn=fn,
        labeled_buckets=labeled_buckets,
    )


def default_candidates(stats: BaselineStats) -> list[tuple[str, int]]:
    """Plan 29 §Step 11 candidates: p95+2σ, p99, p99+3σ (rounded up)."""
    sigma_i = max(1, int(math.ceil(stats.sigma)))
    return [
        ("p95", max(1, stats.p95)),
        ("p95+2σ", max(1, stats.p95 + 2 * sigma_i)),
        ("p99", max(1, stats.p99)),
        ("p99+3σ", max(1, stats.p99 + 3 * sigma_i)),
    ]


def _formula_for(name: str, stats: BaselineStats) -> str:
    """Human-readable derivation of the threshold, e.g. `p95+2σ = 4+2*2 = 8`."""
    sigma_i = max(1, int(math.ceil(stats.sigma)))
    if name == "p95":
        return f"p95 = {stats.p95}"
    if name == "p95+2σ":
        return f"p95 + 2*ceil(σ) = {stats.p95} + 2*{sigma_i} = {stats.p95 + 2 * sigma_i}"
    if name == "p99":
        return f"p99 = {stats.p99}"
    if name == "p99+3σ":
        return f"p99 + 3*ceil(σ) = {stats.p99} + 3*{sigma_i} = {stats.p99 + 3 * sigma_i}"
    return name


def evaluate_all(rows: Sequence[DenialRow]) -> tuple[BaselineStats, list[CandidateResult]]:
    stats = baseline(rows)
    results: list[CandidateResult] = []
    for name, t in default_candidates(stats):
        r = evaluate_candidate(rows, t, name)
        # Attach provenance so downstream logs/reports record the exact
        # threshold candidate and baseline parameters used.
        results.append(
            CandidateResult(
                name=r.name,
                threshold=r.threshold,
                trips=r.trips,
                fp=r.fp,
                fn=r.fn,
                labeled_buckets=r.labeled_buckets,
                formula=_formula_for(name, stats),
                baseline_p50=stats.p50,
                baseline_p95=stats.p95,
                baseline_p99=stats.p99,
                baseline_sigma=stats.sigma,
                baseline_sample_size=stats.sample_size,
                baseline_buckets=stats.buckets,
            )
        )
    return stats, results

