"""Tests for the Step 102 retention scheduler (`BE/app/retention_scheduler.py`).

Owning spec: ``spec/21-app/78-retention-schedule.md`` (all 6 acceptance
criteria are exercised below by ID).
"""

from __future__ import annotations

import threading
from typing import Callable

import pytest

from BE.app.retention import RetentionOutcome
from BE.app.retention_scheduler import run_scheduled
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _outcome(deleted: int = 0) -> RetentionOutcome:
    return RetentionOutcome(
        RetentionDays=30,
        CutoffEpoch=0,
        DryRun=False,
        RunSessionsScanned=deleted,
        RunSessionsDeleted=deleted,
    )


def _make_pass(sequence: list) -> Callable[[], RetentionOutcome]:
    """Consume ``sequence`` head-to-tail; each entry is either an outcome
    to return or an exception to raise. Exhaustion raises ``StopIteration``
    so a runaway loop fails loudly instead of blocking the test."""
    it = iter(sequence)

    def _call() -> RetentionOutcome:
        item = next(it)
        if isinstance(item, BaseException):
            raise item
        return item
    return _call


# --- Validation -----------------------------------------------------

@pytest.mark.parametrize("bad", [0, -1, 169, 200])
def test_interval_out_of_range_raises_usage(bad):
    with pytest.raises(AppError) as ei:
        run_scheduled(interval_hours=bad, single_pass=_make_pass([_outcome()]))
    assert ei.value.code == ErrorCode.E_CLI_USAGE


def test_interval_non_int_raises_usage():
    with pytest.raises(AppError) as ei:
        run_scheduled(interval_hours=1.5, single_pass=_make_pass([_outcome()]))  # type: ignore[arg-type]
    assert ei.value.code == ErrorCode.E_CLI_USAGE


def test_interval_bool_rejected_even_though_bool_is_int():
    with pytest.raises(AppError) as ei:
        run_scheduled(interval_hours=True, single_pass=_make_pass([_outcome()]))  # type: ignore[arg-type]
    assert ei.value.code == ErrorCode.E_CLI_USAGE


@pytest.mark.parametrize("bad", [0, -1])
def test_max_passes_below_one_rejected(bad):
    with pytest.raises(AppError) as ei:
        run_scheduled(
            interval_hours=1,
            single_pass=_make_pass([_outcome()]),
            max_passes=bad,
        )
    assert ei.value.code == ErrorCode.E_CLI_USAGE


# --- Happy path (spec 78 §4 AC 1, 3, 6) ------------------------------

def test_max_passes_exactly_runs_n_and_never_sleeps_after_last():
    sleeps: list[float] = []
    outcomes, err = run_scheduled(
        interval_hours=1,
        single_pass=_make_pass([_outcome(1), _outcome(2), _outcome(3)]),
        max_passes=3,
        sleeper=sleeps.append,
    )
    assert err is None
    assert [o.RunSessionsDeleted for o in outcomes] == [1, 2, 3]
    # Sleep is chopped into <=1s slices; 1h -> 3600 slices, 2 gaps -> 7200
    # total slice-calls, and the total wall time equals 2*3600s.
    assert len(sleeps) == 7200
    assert sum(sleeps) == pytest.approx(2 * 3600.0)
    # NEVER a trailing sleep after the last pass: last call happened
    # before returning, so pass 3 does NOT sleep after itself.
    # (Encoded by: sleeps==2*3600 slices, not 3*3600.)


def test_stop_event_pre_set_returns_immediately_no_passes():
    event = threading.Event()
    event.set()
    sleeps: list[float] = []
    called: list[int] = []

    def _pass():
        called.append(1)
        return _outcome()

    outcomes, err = run_scheduled(
        interval_hours=1,
        single_pass=_pass,
        stop_event=event,
        sleeper=sleeps.append,
    )
    assert outcomes == []
    assert err is None
    assert called == []
    assert sleeps == []


def test_stop_event_set_between_passes_ends_after_current_pass():
    event = threading.Event()
    calls = {"n": 0}

    def _pass():
        calls["n"] += 1
        return _outcome(calls["n"])

    def _sleeper(_s):
        # Simulate SIGINT arriving after the first sleep slice.
        event.set()

    outcomes, err = run_scheduled(
        interval_hours=1,
        single_pass=_pass,
        sleeper=_sleeper,
        stop_event=event,
    )
    assert err is None
    assert len(outcomes) == 1
    assert calls["n"] == 1


# --- Interruptible sleep (spec 78 §4 AC 5) ---------------------------

def test_sleep_is_interruptible_within_one_slice():
    event = threading.Event()
    slice_count = {"n": 0}

    def _pass():
        return _outcome()

    def _sleeper(seconds):
        # Assert each slice is <=1s per _SLICE_SECONDS contract.
        assert seconds <= 1.0
        slice_count["n"] += 1
        if slice_count["n"] == 1:
            event.set()

    outcomes, err = run_scheduled(
        interval_hours=1,  # would be 3600 slices without interruption
        single_pass=_pass,
        sleeper=_sleeper,
        max_passes=5,
        stop_event=event,
    )
    assert err is None
    assert len(outcomes) == 1
    # One pass, then event fires during the first sleep slice; abort.
    assert slice_count["n"] == 1


# --- Domain-error stops the loop (spec 78 §4 AC 4) -------------------

def test_apperror_in_pass_stops_loop_and_returns_captured_error():
    err = AppError(ErrorCode.E_BE_INTERNAL, "boom", details={"K": "V"})
    outcomes, captured = run_scheduled(
        interval_hours=1,
        single_pass=_make_pass([_outcome(7), err, _outcome(99)]),
        max_passes=5,
        sleeper=lambda _s: None,
    )
    assert captured is err
    assert len(outcomes) == 1
    assert outcomes[0].RunSessionsDeleted == 7


def test_non_apperror_propagates_unchanged():
    boom = RuntimeError("fs full")
    with pytest.raises(RuntimeError, match="fs full"):
        run_scheduled(
            interval_hours=1,
            single_pass=_make_pass([_outcome(), boom]),
            max_passes=5,
            sleeper=lambda _s: None,
        )


# --- Logging (spec 78 §4 AC 6) ---------------------------------------

def test_pass_completed_logs_monotonic_pass_index(caplog):
    caplog.set_level("INFO", logger="BE.app.retention_scheduler")
    run_scheduled(
        interval_hours=1,
        single_pass=_make_pass([_outcome(), _outcome(), _outcome()]),
        max_passes=3,
        sleeper=lambda _s: None,
    )
    indices = [
        int(r.getMessage().split("pass_index=")[1].split()[0])
        for r in caplog.records
        if "retention.scheduler.pass_completed" in r.getMessage()
    ]
    assert indices == [1, 2, 3]


def test_stop_requested_log_fires_on_interrupt(caplog):
    caplog.set_level("INFO", logger="BE.app.retention_scheduler")
    event = threading.Event()

    def _sleeper(_s):
        event.set()

    run_scheduled(
        interval_hours=1,
        single_pass=_make_pass([_outcome(), _outcome()]),
        max_passes=5,
        sleeper=_sleeper,
        stop_event=event,
    )
    stops = [r for r in caplog.records if "retention.scheduler.stop_requested" in r.getMessage()]
    assert len(stops) == 1


def test_pass_failed_log_on_apperror(caplog):
    caplog.set_level("ERROR", logger="BE.app.retention_scheduler")
    err = AppError(ErrorCode.E_BE_INTERNAL, "db down")
    run_scheduled(
        interval_hours=1,
        single_pass=_make_pass([err]),
        max_passes=5,
        sleeper=lambda _s: None,
    )
    assert any("retention.scheduler.pass_failed" in r.getMessage() for r in caplog.records)
