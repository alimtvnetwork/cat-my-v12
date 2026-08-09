"""Plan 20 Step 7 tests: multi-policy audit rotation worker."""
from __future__ import annotations

import sqlite3

import pytest

from app.core.audit.retention_worker import (
    AuditRetentionWorker,
    CATEGORY_POLICY,
    CODE_RETENTION_CLOCK_SKEW,
    CODE_RETENTION_RUN,
    CODE_SEC_AUDIT_PRUNED,
    CODE_SEC_RETENTION_FAILED,
    POLICY_WINDOW_DAYS,
    RetentionPolicy,
    policy_for,
)
from app.core.security.audit_sink import AuditSink


@pytest.fixture()
def sink() -> AuditSink:
    conn = sqlite3.connect(":memory:")
    return AuditSink(conn=conn)


def _seed(sink: AuditSink, *, code: str, ts: int, subject: str = "s", detail: str = "") -> None:
    sink.conn.execute(
        "INSERT INTO audit_log(ts, code, user_id, subject, detail) VALUES (?,?,?,?,?)",
        (ts, code, None, subject, detail),
    )
    sink.conn.commit()


def test_policy_windows_are_monotonic() -> None:
    # §71.2: short < standard < long < forensic
    days = [POLICY_WINDOW_DAYS[p] for p in RetentionPolicy]
    assert days == sorted(days)
    assert POLICY_WINDOW_DAYS[RetentionPolicy.RetentionShort] == 30
    assert POLICY_WINDOW_DAYS[RetentionPolicy.RetentionForensic] == 900


def test_category_prefix_resolution() -> None:
    assert policy_for("E_CAP_TIMEOUT") is RetentionPolicy.RetentionStandard
    assert policy_for("RuleBundleImported") is RetentionPolicy.RetentionLong
    assert policy_for("LicenseActivated") is RetentionPolicy.RetentionLong
    assert policy_for("I_SEC_ADMIN_WRITE") is RetentionPolicy.RetentionForensic
    # Unknown falls back to Standard (never silently dropped).
    assert policy_for("SomethingBrandNew") is RetentionPolicy.RetentionStandard


def test_prune_respects_policy_window(sink: AuditSink) -> None:
    # Use real wall clock: the sink's self-audit rows are timestamped with
    # `time.time()` (not the injected now_fn), so anchoring `now` to real
    # time keeps those rows inside every retention window during the test.
    import time as _t
    now = int(_t.time())
    _seed(sink, code="E_SEC_DENIAL_BURST", ts=now - 5 * 86400)
    stale_ts = now - 31 * 86400
    _seed(sink, code="E_SEC_DENIAL_BURST", ts=stale_ts)
    worker = AuditRetentionWorker(
        sink=sink,
        now_fn=lambda: now,
        monotonic_fn=lambda: 0.0,
        sleep_fn=lambda _s: None,
    )
    result = worker.run_once(policies=[RetentionPolicy.RetentionStandard])
    purged = sum(p.rowsPurged for p in result.perPolicy)
    # RetentionStandard window is 180d, so 31d-old row still survives.
    assert purged == 0
    # Force Short policy (30d) to prune the 31d-old row.
    result2 = worker.run_once(policies=[RetentionPolicy.RetentionShort])
    assert sum(p.rowsPurged for p in result2.perPolicy) == 1
    remaining_stale = sink.conn.execute(
        "SELECT COUNT(*) FROM audit_log WHERE ts=?", (stale_ts,)
    ).fetchone()[0]
    assert remaining_stale == 0


def test_clock_skew_guard_blocks_prune(sink: AuditSink) -> None:
    now = 2_000_000_000
    _seed(sink, code="E_SEC_DENIAL_BURST", ts=now - 999 * 86400)
    worker = AuditRetentionWorker(
        sink=sink,
        now_fn=lambda: now,
        monotonic_fn=lambda: 0.0,
        sleep_fn=lambda _s: None,
    )
    # stored_now is 10s ahead of now_fn -> skew=10 > tolerance=2 -> guard trips.
    result = worker.run_once(
        policies=[RetentionPolicy.RetentionShort],
        stored_now=now + 10,
    )
    assert result.perPolicy == []
    codes = [e.code for e in sink.query(limit=10)]
    assert CODE_RETENTION_CLOCK_SKEW in codes
    # Row still present because prune was skipped.
    remaining = sink.conn.execute("SELECT COUNT(*) FROM audit_log WHERE code='E_SEC_DENIAL_BURST'").fetchone()[0]
    assert remaining == 1


def test_run_emits_self_audit_row(sink: AuditSink) -> None:
    now = 1_900_000_000
    worker = AuditRetentionWorker(
        sink=sink,
        now_fn=lambda: now,
        monotonic_fn=lambda: 0.0,
        sleep_fn=lambda _s: None,
    )
    worker.run_once(policies=[RetentionPolicy.RetentionShort])
    codes = [e.code for e in sink.query(limit=10)]
    assert CODE_RETENTION_RUN in codes


def test_cadence_bounds_enforced(sink: AuditSink) -> None:
    with pytest.raises(ValueError):
        AuditRetentionWorker(sink=sink, cadence_hours=0)
    with pytest.raises(ValueError):
        AuditRetentionWorker(sink=sink, cadence_hours=25)


def test_category_policy_map_matches_taxonomy() -> None:
    # Guard against accidentally re-classifying admin writes as short.
    assert CATEGORY_POLICY["I_SEC_ADMIN_WRITE"] is RetentionPolicy.RetentionForensic


# ---------------------------------------------------------------------------
# Plan 20 follow-up: exercise both cross-taxonomy codes end-to-end, and pin
# the resolve-before-persist invariant from spec/21-app/68-v2-audit-retention.md §68.2.
# ---------------------------------------------------------------------------


def test_successful_prune_emits_i_sec_audit_pruned(sink: AuditSink, caplog) -> None:
    """§40 A.1: a real deletion must emit `I_SEC_AUDIT_PRUNED` with cid + policy + removed."""
    import time as _t
    now = int(_t.time())
    stale_ts = now - 31 * 86400
    _seed(sink, code="E_SEC_DENIAL_BURST", ts=stale_ts)
    worker = AuditRetentionWorker(
        sink=sink,
        now_fn=lambda: now,
        monotonic_fn=lambda: 0.0,
        sleep_fn=lambda _s: None,
    )
    with caplog.at_level("INFO", logger="ca.audit.retention_worker"):
        result = worker.run_once(policies=[RetentionPolicy.RetentionShort])
    # Rowcount signal: exactly one row deleted.
    assert sum(p.rowsPurged for p in result.perPolicy) == 1
    # Audit-row signal: `I_SEC_AUDIT_PRUNED` present in the sink itself.
    rows = list(sink.query(limit=20))
    pruned = [r for r in rows if r.code == CODE_SEC_AUDIT_PRUNED]
    assert len(pruned) == 1, f"expected one prune row, got {[r.code for r in rows]}"
    detail = pruned[0].detail or ""
    assert "policy=RetentionShort" in detail
    assert "removed=1" in detail
    assert "cid=" in detail
    # Structured-log signal: matches the audit row.
    assert any(
        "audit.retention.pruned" in rec.message and CODE_SEC_AUDIT_PRUNED in rec.message
        for rec in caplog.records
    )


def test_clock_skew_emits_e_sec_retention_failed(sink: AuditSink, caplog) -> None:
    """§40 A.1: clock-skew guard rolls up to `E_SEC_RETENTION_FAILED` (no partial DELETE)."""
    now = 2_000_000_000
    _seed(sink, code="E_SEC_DENIAL_BURST", ts=now - 999 * 86400)
    worker = AuditRetentionWorker(
        sink=sink,
        now_fn=lambda: now,
        monotonic_fn=lambda: 0.0,
        sleep_fn=lambda _s: None,
    )
    with caplog.at_level("ERROR", logger="ca.audit.retention_worker"):
        worker.run_once(policies=[RetentionPolicy.RetentionShort], stored_now=now + 10)
    rows = list(sink.query(limit=20))
    failed = [r for r in rows if r.code == CODE_SEC_RETENTION_FAILED]
    assert len(failed) == 1
    assert "cause=clock_skew" in (failed[0].detail or "")
    # Structured-log signal: error line carries cid + skew_sec + code.
    assert any(
        "audit.retention.failed" in rec.message
        and "cause=clock_skew" in rec.message
        and CODE_SEC_RETENTION_FAILED in rec.message
        for rec in caplog.records
    )
    # No partial state: the stale row must still be present because prune was refused.
    remaining = sink.conn.execute(
        "SELECT COUNT(*) FROM audit_log WHERE code='E_SEC_DENIAL_BURST'"
    ).fetchone()[0]
    assert remaining == 1


def test_uncaught_sqlite_error_emits_e_sec_retention_failed(sink: AuditSink, caplog) -> None:
    """§40 A.1: uncaught SQLite errors must surface `E_SEC_RETENTION_FAILED`, never swallow."""
    class ExplodingConn:
        def __init__(self, real):
            self._real = real
        def execute(self, *a, **kw):
            raise sqlite3.DatabaseError("disk I/O error")
        def commit(self):
            return self._real.commit()

    now = 1_900_000_000
    sink.conn = ExplodingConn(sink.conn)  # type: ignore[assignment]
    worker = AuditRetentionWorker(
        sink=sink,
        now_fn=lambda: now,
        monotonic_fn=lambda: 0.0,
        sleep_fn=lambda _s: None,
    )
    with caplog.at_level("ERROR", logger="ca.audit.retention_worker"):
        result = worker.run_once(policies=[RetentionPolicy.RetentionShort])
    # The one PolicyResult must carry the uncaught-error marker.
    assert result.perPolicy and result.perPolicy[0].error == "E_AUDIT_RETENTION_UNCAUGHT"
    # Structured-log signal: cause=uncaught + code=E_SEC_RETENTION_FAILED.
    assert any(
        "cause=uncaught" in rec.message and CODE_SEC_RETENTION_FAILED in rec.message
        for rec in caplog.records
    ), [r.message for r in caplog.records]


def test_policies_snapshot_before_prune_invariant() -> None:
    """spec/21-app/68-v2-audit-retention.md §68.2: policy list is resolved BEFORE any DELETE.

    Regression guard: `run_once` must materialize `policies` into a list up front,
    so a generator/iterable given by the caller is consumed exactly once and
    mid-run mutation of the source cannot silently reclassify rows.
    """
    conn = sqlite3.connect(":memory:")
    sink = AuditSink(conn=conn)
    now = 1_800_000_000
    worker = AuditRetentionWorker(
        sink=sink,
        now_fn=lambda: now,
        monotonic_fn=lambda: 0.0,
        sleep_fn=lambda _s: None,
    )
    # Single-use generator: if run_once re-iterates, the second pass yields nothing
    # and per-policy results would be empty. This assertion pins the snapshot behaviour.
    def once():
        yield RetentionPolicy.RetentionShort
        yield RetentionPolicy.RetentionLong
    gen = once()
    result = worker.run_once(policies=gen)
    assert [p.policy for p in result.perPolicy] == [
        RetentionPolicy.RetentionShort,
        RetentionPolicy.RetentionLong,
    ]
    # Generator is exhausted (consumed exactly once by the snapshot).
    assert list(gen) == []
