"""Deterministic replay harness for denial-burst telemetry.

Replays the checked-in `denial_sample.jsonl` (Plan 29 Step 33) through the
pure metrics pipeline and asserts p50/p95/p99 and FP/FN outputs stay stable.
Regressions here indicate the metric definitions drifted, which would
invalidate every threshold recommendation downstream.

Fixture format: one JSON object per line with keys
`{ts, code, user_id, subject, detail, label?}`. See
`app/core/security/denial_metrics.py` for the contract.
"""
from __future__ import annotations

from pathlib import Path

from app.core.security.denial_metrics import (
    baseline,
    default_candidates,
    evaluate_all,
    evaluate_candidate,
    load_rows,
    per_actor_minute_counts,
)

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "security" / "denial_sample.jsonl"


def test_fixture_loads_all_denial_rows() -> None:
    rows = load_rows(FIXTURE)
    # 10 role-denied + 2 no-auth in the fixture.
    assert len(rows) == 12
    assert {r.code for r in rows} == {"E_SEC_ROLE_DENIED", "E_SEC_NOAUTH"}


def test_baseline_percentiles_are_stable() -> None:
    rows = load_rows(FIXTURE)
    counts = per_actor_minute_counts(rows)
    # Minute boundaries split op-01 across two buckets and op-02 across one.
    assert counts == [1, 1, 1, 1, 2, 2, 4]

    stats = baseline(rows)
    assert stats.sample_size == 12
    assert stats.buckets == 7
    assert stats.p50 == 1
    assert stats.p95 == 4
    assert stats.p99 == 4


def test_candidate_defaults_are_stable() -> None:
    rows = load_rows(FIXTURE)
    stats = baseline(rows)
    names = [n for n, _ in default_candidates(stats)]
    assert names == ["p95", "p95+2σ", "p99", "p99+3σ"]


def test_fp_fn_zero_when_no_labels() -> None:
    # Fixture has no `label` field, so FP/FN must be zero and labeled_buckets 0.
    rows = load_rows(FIXTURE)
    _, results = evaluate_all(rows)
    for r in results:
        assert r.fp == 0
        assert r.fn == 0
        assert r.labeled_buckets == 0


def test_fp_fn_respect_labels(tmp_path: Path) -> None:
    labeled = tmp_path / "labeled.jsonl"
    labeled.write_text(
        # Two labeled buckets: op-A trips (count>=3, attack), op-B does not (count=1, legit).
        '{"ts": 1, "code": "E_SEC_ROLE_DENIED", "user_id": "op-A", "subject": "x", "detail": "", "label": "attack"}\n'
        '{"ts": 2, "code": "E_SEC_ROLE_DENIED", "user_id": "op-A", "subject": "x", "detail": "", "label": "attack"}\n'
        '{"ts": 3, "code": "E_SEC_ROLE_DENIED", "user_id": "op-A", "subject": "x", "detail": "", "label": "attack"}\n'
        '{"ts": 4, "code": "E_SEC_ROLE_DENIED", "user_id": "op-B", "subject": "x", "detail": "", "label": "legit"}\n',
        encoding="utf-8",
    )
    rows = load_rows(labeled)
    # threshold=3 => op-A trips (correct), op-B does not (correct): FP=0 FN=0
    r_ok = evaluate_candidate(rows, threshold=3, name="tight")
    assert (r_ok.trips, r_ok.fp, r_ok.fn, r_ok.labeled_buckets) == (1, 0, 0, 2)
    # threshold=1 => both trip: op-B is a false positive.
    r_loose = evaluate_candidate(rows, threshold=1, name="loose")
    assert (r_loose.trips, r_loose.fp, r_loose.fn) == (2, 1, 0)
    # threshold=99 => nobody trips: op-A is a false negative.
    r_dead = evaluate_candidate(rows, threshold=99, name="dead")
    assert (r_dead.trips, r_dead.fp, r_dead.fn) == (0, 0, 1)


def test_replay_is_deterministic() -> None:
    a = evaluate_all(load_rows(FIXTURE))
    b = evaluate_all(load_rows(FIXTURE))
    assert a == b
