"""Unit tests for RetentionScheduler."""
from __future__ import annotations

import sqlite3
import threading
import time

import pytest

from app.core.security.audit_sink import AuditSink
from app.core.security.retention import AuditLogRetention
from app.core.security.retention_scheduler import RetentionScheduler


def _mk() -> tuple[AuditSink, AuditLogRetention]:
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    sink = AuditSink(conn=conn)
    return sink, AuditLogRetention(sink=sink, max_age_seconds=10)


def test_rejects_non_positive_interval() -> None:
    _, ret = _mk()
    with pytest.raises(ValueError):
        RetentionScheduler(retention=ret, interval_seconds=0)


def test_tick_once_returns_removed_count() -> None:
    sink, ret = _mk()
    sink.conn.execute(
        "INSERT INTO audit_log(ts,code,user_id,subject,detail) VALUES (0,'E_SEC_ROLE_DENIED',NULL,'x','')"
    )
    sink.conn.commit()
    sched = RetentionScheduler(retention=ret, interval_seconds=60)
    assert sched.tick_once() == 1


def test_tick_once_surfaces_and_reports_errors() -> None:
    _, ret = _mk()

    class Boom(RuntimeError):
        pass

    def raiser(**_: object) -> int:
        raise Boom("nope")

    ret.prune = raiser  # type: ignore[assignment]
    seen: list[BaseException] = []
    sched = RetentionScheduler(
        retention=ret, interval_seconds=60, on_error=seen.append
    )
    with pytest.raises(Boom):
        sched.tick_once()
    assert len(seen) == 1 and isinstance(seen[0], Boom)


def test_start_stop_runs_at_least_one_tick() -> None:
    sink, ret = _mk()
    sink.conn.execute(
        "INSERT INTO audit_log(ts,code,user_id,subject,detail) VALUES (0,'E_SEC_ROLE_DENIED',NULL,'x','')"
    )
    sink.conn.commit()
    ticks = threading.Event()
    original = ret.prune

    def counting(**kw: object) -> int:
        n = original(**kw)  # type: ignore[arg-type]
        ticks.set()
        return n

    ret.prune = counting  # type: ignore[assignment]
    sched = RetentionScheduler(retention=ret, interval_seconds=0.01)
    sched.start()
    try:
        assert ticks.wait(timeout=2.0), "scheduler never ticked"
    finally:
        sched.stop()


def test_start_is_idempotent() -> None:
    _, ret = _mk()
    sched = RetentionScheduler(retention=ret, interval_seconds=0.05)
    sched.start()
    first = sched._thread
    sched.start()  # no-op
    assert sched._thread is first
    sched.stop()


def test_background_loop_survives_transient_errors() -> None:
    _, ret = _mk()
    calls = {"n": 0}

    def flaky(**_: object) -> int:
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("transient")
        return 0

    ret.prune = flaky  # type: ignore[assignment]
    sched = RetentionScheduler(retention=ret, interval_seconds=0.01)
    sched.start()
    try:
        deadline = time.time() + 2.0
        while calls["n"] < 2 and time.time() < deadline:
            time.sleep(0.02)
        assert calls["n"] >= 2, "scheduler died after first error"
    finally:
        sched.stop()
