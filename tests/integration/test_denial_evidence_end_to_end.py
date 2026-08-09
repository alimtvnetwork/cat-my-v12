"""End-to-end integration for the Plan 29 evidence pipeline.

Wires an audited load of a JSONL export (with intentional bad rows) through
`evaluate_all`, asserts the four candidate names from
`spec/21-app/69a-v2-denial-tuning-evidence.md` are produced, and confirms
bad rows surface as `W_SEC_TUNING_EVIDENCE_LOAD_FAILED` in the same audit
sink the burst emitter uses.

This is the smallest integration that covers all three seams:
  1. Loader (`load_evidence_with_audit`) -> AuditSink (failure path).
  2. Metrics (`evaluate_all`) -> CandidateResult provenance (happy path).
  3. Registry: every code exercised here is registered in
     `spec/21-app/40-error-manage.md` A.1.
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest

from app.core.security.audit_sink import (
    AuditSink,
    CODE_TUNING_EVIDENCE_LOAD_FAILED,
)
from app.core.security.denial_metrics import (
    default_candidates,
    evaluate_all,
    load_evidence_with_audit,
)
from app.core.security.remediation import TUNING_VERSION


def _sink() -> AuditSink:
    return AuditSink(sqlite3.connect(":memory:"))


def _row(ts: int, user: str, label: str | None = None) -> str:
    obj: dict[str, object] = {
        "ts": ts,
        "code": "E_SEC_ROLE_DENIED",
        "user_id": user,
        "subject": "settings:camera",
        "detail": "role=viewer required=admin",
    }
    if label is not None:
        obj["label"] = label
    return json.dumps(obj)


@pytest.fixture()
def evidence_file(tmp_path: Path) -> Path:
    # A single attacker bucket (10 rows in one minute) plus a scattered
    # legit operator, plus one malformed row that must be recorded.
    lines: list[str] = []
    for i in range(10):
        lines.append(_row(1_700_000_000 + i, "attacker-1", "attack"))
    for i in range(3):
        lines.append(_row(1_700_000_600 + i * 30, "op-1", "legit"))
    lines.append("{ not valid json")
    p = tmp_path / "evidence.jsonl"
    p.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return p


def test_end_to_end_load_evaluate_and_record_bad_row(evidence_file: Path) -> None:
    sink = _sink()
    rows = load_evidence_with_audit(evidence_file, sink)

    # 13 well-formed rows survive; the malformed row is dropped and audited.
    assert len(rows) == 13
    failures = sink.query(code=CODE_TUNING_EVIDENCE_LOAD_FAILED)
    assert len(failures) == 1
    assert f"tuning_version={TUNING_VERSION}" in failures[0].detail
    assert "reason=bad_json" in failures[0].detail

    stats, results = evaluate_all(rows)

    # 69a table shape: exactly four candidates, in the documented order.
    names = [r.name for r in results]
    assert names == ["p95", "p95+2σ", "p99", "p99+3σ"]

    # Every candidate carries the same baseline provenance so downstream
    # tooling (dashboards, CLI reports) can trace each threshold back to the
    # exact baseline snapshot it was derived from.
    for r in results:
        assert r.baseline_p95 == stats.p95
        assert r.baseline_p99 == stats.p99
        assert r.baseline_sigma == stats.sigma
        assert r.baseline_sample_size == stats.sample_size
        assert r.baseline_buckets == stats.buckets
        assert r.formula, "formula provenance is required by 69a"

    # Legit operator (3 rows spread across minutes) never trips ANY
    # candidate. Attacker bucket (10 in one minute) trips at least the p95
    # and p99 candidates; the σ-inflated candidates may not, and that is
    # exactly the tradeoff surface 69a exists to make visible.
    by_name = {r.name: r for r in results}
    assert by_name["p95"].fn == 0
    assert by_name["p99"].fn == 0
    for r in results:
        assert r.fp == 0, f"legit rows must never trip {r.name}"


def test_default_candidates_names_match_69a_table(evidence_file: Path) -> None:
    rows = load_evidence_with_audit(evidence_file, None)
    stats, _ = evaluate_all(rows)
    names = [name for name, _ in default_candidates(stats)]
    # Locks the 4-row 69a evidence table against silent additions.
    assert names == ["p95", "p95+2σ", "p99", "p99+3σ"]