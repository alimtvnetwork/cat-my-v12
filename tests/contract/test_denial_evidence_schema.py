"""Contract tests for the Plan 29 denial-burst tuning evidence pipeline.

Anchors:
  - `spec/21-app/69a-v2-denial-tuning-evidence.md` (row schema + methodology)
  - `spec/21-app/40-error-manage.md` A.1 (audit codes + detail payloads)
  - `app/core/security/denial_metrics.py` (loader + evaluate_all)
  - `app/core/security/remediation.py` (BURST_APPROACHING + DENIAL_BURST emit)
  - `app/supervisor/boot.py::_record_thresholds_loaded`

Failure surface locked here: every schema violation must surface, and every
observability code must include its documented `detail=` keys. No silent
swallowing.
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest

from app.core.security.audit_sink import (
    CODE_BURST_APPROACHING,
    CODE_DENIAL_BURST,
    CODE_ROLE_DENIED,
    CODE_THRESHOLDS_LOADED,
    CODE_TUNING_EVIDENCE_LOAD_FAILED,
    AuditSink,
)
from app.core.security.denial_metrics import (
    DENIAL_CODES,
    VALID_LABELS,
    EvidenceRowError,
    load_evidence_with_audit,
    load_rows,
    load_rows_strict,
)
from app.core.security.remediation import (
    APPROACHING_MARGIN,
    TUNING_VERSION,
    DenialRateLimiter,
)


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "security" / "denial_sample.jsonl"


def _sink() -> AuditSink:
    return AuditSink(sqlite3.connect(":memory:"))


def _write(tmp_path: Path, lines: list[str]) -> Path:
    p = tmp_path / "evidence.jsonl"
    p.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return p


def _kv(detail: str) -> dict[str, str]:
    """Parse `k=v k=v` payloads into a dict."""
    return dict(pair.split("=", 1) for pair in detail.split() if "=" in pair)


# ---------------------------------------------------------------------------
# Row schema
# ---------------------------------------------------------------------------

class TestRowSchema:
    def test_denial_codes_constant_is_stable(self) -> None:
        # If either code is renamed the whole evidence pipeline breaks; this
        # test locks the pair against silent drift.
        assert DENIAL_CODES == ("E_SEC_ROLE_DENIED", "E_SEC_NOAUTH")

    def test_valid_labels_constant_is_stable(self) -> None:
        assert VALID_LABELS == ("attack", "legit")

    def test_load_rows_accepts_the_shipped_fixture(self) -> None:
        rows = load_rows(FIXTURE)
        assert len(rows) >= 1
        assert all(r.code in DENIAL_CODES for r in rows)

    def test_strict_loader_rejects_malformed_json(self, tmp_path: Path) -> None:
        p = _write(tmp_path, ['{"ts": 1, "code": "E_SEC_ROLE_DENIED"}', "{not-json"])
        with pytest.raises(EvidenceRowError) as exc:
            load_rows_strict(p)
        assert exc.value.reason == "bad_json"
        assert exc.value.lineno == 2

    def test_strict_loader_rejects_missing_ts(self, tmp_path: Path) -> None:
        p = _write(tmp_path, ['{"code": "E_SEC_ROLE_DENIED"}'])
        with pytest.raises(EvidenceRowError) as exc:
            load_rows_strict(p)
        assert exc.value.reason == "missing_ts"

    def test_strict_loader_rejects_non_numeric_ts(self, tmp_path: Path) -> None:
        p = _write(tmp_path, ['{"ts": "yesterday", "code": "E_SEC_ROLE_DENIED"}'])
        with pytest.raises(EvidenceRowError) as exc:
            load_rows_strict(p)
        assert exc.value.reason == "bad_ts"

    def test_strict_loader_rejects_unknown_label(self, tmp_path: Path) -> None:
        p = _write(tmp_path, ['{"ts": 1, "code": "E_SEC_ROLE_DENIED", "label": "maybe"}'])
        with pytest.raises(EvidenceRowError) as exc:
            load_rows_strict(p)
        assert exc.value.reason == "bad_label"

    def test_strict_loader_filters_non_denial_codes_silently(self, tmp_path: Path) -> None:
        # Contract: evidence exports may contain the whole audit_log. Rows
        # outside DENIAL_CODES are dropped without raising.
        p = _write(
            tmp_path,
            [
                '{"ts": 1, "code": "I_SEC_ADMIN_WRITE"}',
                '{"ts": 2, "code": "E_SEC_ROLE_DENIED", "user_id": "u"}',
            ],
        )
        rows = load_rows_strict(p)
        assert len(rows) == 1 and rows[0].code == "E_SEC_ROLE_DENIED"

    def test_strict_loader_skips_blank_lines(self, tmp_path: Path) -> None:
        p = tmp_path / "e.jsonl"
        p.write_text('\n{"ts": 1, "code": "E_SEC_ROLE_DENIED"}\n\n', encoding="utf-8")
        rows = load_rows_strict(p)
        assert len(rows) == 1


# ---------------------------------------------------------------------------
# Audited loader (emits W_SEC_TUNING_EVIDENCE_LOAD_FAILED)
# ---------------------------------------------------------------------------

class TestAuditedLoader:
    def test_bad_row_emits_evidence_load_failed(self, tmp_path: Path) -> None:
        sink = _sink()
        p = _write(
            tmp_path,
            [
                '{"ts": 1, "code": "E_SEC_ROLE_DENIED", "user_id": "u"}',
                "{broken",
                '{"ts": 3, "code": "E_SEC_ROLE_DENIED", "user_id": "u"}',
            ],
        )
        rows = load_evidence_with_audit(p, sink)
        # Two good rows kept, one bad row rejected and recorded.
        assert len(rows) == 2
        events = sink.query(code=CODE_TUNING_EVIDENCE_LOAD_FAILED)
        assert len(events) == 1
        kv = _kv(events[0].detail)
        assert kv["line"] == "2"
        assert kv["reason"] == "bad_json"
        assert kv["tuning_version"] == TUNING_VERSION
        assert kv["path"].endswith("evidence.jsonl")
        assert events[0].subject == "security.evidence"

    def test_strict_mode_reraises_after_recording(self, tmp_path: Path) -> None:
        sink = _sink()
        p = _write(tmp_path, ["{bad"])
        with pytest.raises(EvidenceRowError):
            load_evidence_with_audit(p, sink, strict=True)
        # The audit row is written even though the call raised: failure
        # visibility must not depend on strict-mode success.
        assert len(sink.query(code=CODE_TUNING_EVIDENCE_LOAD_FAILED)) == 1

    def test_no_sink_still_loads_good_rows(self, tmp_path: Path) -> None:
        # Contract: callers without an audit sink (offline CLI, dev scripts)
        # get the same skip-and-log behavior; the log line proves the failure
        # surfaced.
        p = _write(
            tmp_path,
            [
                '{"ts": 1, "code": "E_SEC_ROLE_DENIED", "user_id": "u"}',
                "{broken",
            ],
        )
        rows = load_evidence_with_audit(p, None)
        assert len(rows) == 1


# ---------------------------------------------------------------------------
# Detail-payload schemas for the burst-observability codes
# ---------------------------------------------------------------------------

class TestBurstDetailSchemas:
    def test_burst_detail_schema(self) -> None:
        sink = _sink()
        for _ in range(5):
            sink.record(CODE_ROLE_DENIED, "settings:camera", user_id="u1")
        rl = DenialRateLimiter(sink=sink, threshold=5, window_seconds=60)
        rl.scan(now=1_000_000)
        bursts = sink.query(code=CODE_DENIAL_BURST)
        assert len(bursts) == 1
        kv = _kv(bursts[0].detail)
        assert kv["phase"] == "burst"
        assert kv["count"] == "5"
        assert kv["window"] == "60s"
        assert kv["threshold"] == "5"
        assert kv["margin"] == str(APPROACHING_MARGIN)
        assert kv["tuning_version"] == TUNING_VERSION
        assert bursts[0].subject == "user:u1"

    def test_approaching_detail_schema(self) -> None:
        sink = _sink()
        # threshold-margin <= count < threshold: fires the approaching band.
        for _ in range(4):
            sink.record(CODE_ROLE_DENIED, "settings:camera", user_id="u1")
        rl = DenialRateLimiter(sink=sink, threshold=5, window_seconds=60)
        rl.scan(now=1_000_000)
        events = sink.query(code=CODE_BURST_APPROACHING)
        assert len(events) == 1
        kv = _kv(events[0].detail)
        assert kv["phase"] == "approach"
        assert kv["count"] == "4"
        assert kv["threshold"] == "5"
        assert kv["margin"] == str(APPROACHING_MARGIN)
        assert kv["floor"] == str(5 - APPROACHING_MARGIN)
        assert kv["tuning_version"] == TUNING_VERSION
        assert events[0].subject == "user:u1"


# ---------------------------------------------------------------------------
# Detail-payload schema for the boot-time thresholds-loaded emission
# ---------------------------------------------------------------------------

class TestThresholdsLoadedDetailSchema:
    def test_thresholds_loaded_detail_schema(self) -> None:
        # Import inside the test so denial_metrics/audit_sink stay
        # importable when boot.py's dependencies aren't wired.
        from app.supervisor.boot import _record_thresholds_loaded

        sink = _sink()
        limiter = DenialRateLimiter(sink=sink, threshold=7, window_seconds=30)
        _record_thresholds_loaded(
            limiter, {"denial_threshold": 7, "denial_window_seconds": 30}
        )
        events = sink.query(code=CODE_THRESHOLDS_LOADED)
        assert len(events) == 1
        kv = _kv(events[0].detail)
        assert kv["threshold"] == "7"
        assert kv["window"] == "30s"
        assert kv["tuning_version"] == TUNING_VERSION
        assert kv["source"] == "settings_store"
        assert events[0].subject == "security.settings"