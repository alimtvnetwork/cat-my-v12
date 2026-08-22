"""Plan 90 Step 102 - Retention scheduler (in-process ticker).

Owning spec: ``spec/21-app/78-retention-schedule.md``.
Companion module: ``BE/app/retention.py`` (Step 101, single-shot pass).

Root cause guarded: Step 101 exposed ``run_retention(...)`` as the only
delete path but nothing invokes it periodically, so without an external
timer every ordering guarantee it made evaporates: the DB and
``results/<RunId>/artifacts/`` tree grow forever and the first
``E_FS_NO_SPACE`` takes every subsequent ``evaluate`` down.

This module is deliberately tiny and pure: no filesystem, no DB, no
signal handlers, no logging config. The CLI wrapper
(``bin/retention-run.py``) owns process concerns (signals, envelope
emission, exit codes); this module owns the tick loop and stop
semantics so tests can drive both without spinning up a process.

Contract summary (see spec 78 §2.4 for the full contract):

* ``run_scheduled(interval_hours, single_pass, ...)`` runs ``single_pass``
  immediately, then sleeps ``interval_hours*3600`` seconds in slices
  of at most ``_SLICE_SECONDS`` so ``stop_event`` aborts within ~1s.
* Returns ``(outcomes, error)``. ``error`` is a captured ``AppError``
  from the offending pass; the loop STOPS on domain errors (do not
  keep pounding a broken DB every hour).
* Non-``AppError`` exceptions propagate to the caller unchanged - the
  wrapper maps them to ``IoError=4``.
"""

from __future__ import annotations

import logging
import threading
import time
from collections.abc import Callable

from BE.app.retention import RetentionOutcome
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_log = logging.getLogger(__name__)

# Sleep is chopped into <=1s slices so SIGINT interrupts a 24h wait
# within one second. Anything larger makes shutdown feel wedged.
_SLICE_SECONDS = 1.0

# Guard-rails duplicate spec 78 §2.2 so the pure module rejects bad
# input even if a caller bypasses the CLI parser.
_MIN_INTERVAL_HOURS = 1
_MAX_INTERVAL_HOURS = 168  # one week; longer -> use the OS scheduler.


def _validate(interval_hours: int, max_passes: int | None) -> None:
    if not isinstance(interval_hours, int) or isinstance(interval_hours, bool):
        raise AppError(
            ErrorCode.E_CLI_USAGE,
            f"interval_hours must be int, got {type(interval_hours).__name__}.",
            details={"IntervalHours": repr(interval_hours)},
        )
    if interval_hours < _MIN_INTERVAL_HOURS or interval_hours > _MAX_INTERVAL_HOURS:
        raise AppError(
            ErrorCode.E_CLI_USAGE,
            f"interval_hours must be in [{_MIN_INTERVAL_HOURS}, {_MAX_INTERVAL_HOURS}], got {interval_hours}.",
            details={"IntervalHours": interval_hours},
        )
    if max_passes is None:
        return
    if not isinstance(max_passes, int) or isinstance(max_passes, bool):
        raise AppError(
            ErrorCode.E_CLI_USAGE,
            f"max_passes must be int or None, got {type(max_passes).__name__}.",
            details={"MaxPasses": repr(max_passes)},
        )
    if max_passes < 1:
        raise AppError(
            ErrorCode.E_CLI_USAGE,
            f"max_passes must be >= 1 when provided, got {max_passes}.",
            details={"MaxPasses": max_passes},
        )


def _interruptible_sleep(
    total_seconds: float,
    stop_event: threading.Event,
    sleeper: Callable[[float], None],
) -> bool:
    """Sleep up to ``total_seconds`` in ``_SLICE_SECONDS`` slices.

    Returns True if the sleep completed, False if ``stop_event`` fired
    mid-sleep. Tests inject a synchronous ``sleeper`` and pre-set the
    event to prove interruption without wall-clock waits.
    """
    remaining = float(total_seconds)
    while remaining > 0:
        if stop_event.is_set():
            return False
        slice_s = _SLICE_SECONDS if remaining > _SLICE_SECONDS else remaining
        sleeper(slice_s)
        remaining -= slice_s

    return stop_event.is_set() is False


def run_scheduled(
    *,
    interval_hours: int,
    single_pass: Callable[[], RetentionOutcome],
    max_passes: int | None = None,
    sleeper: Callable[[float], None] = time.sleep,
    stop_event: threading.Event | None = None,
) -> tuple[list[RetentionOutcome], AppError | None]:
    """Run ``single_pass`` on an ``interval_hours`` cadence.

    See ``spec/21-app/78-retention-schedule.md`` §2.4.

    First pass always runs immediately (never sleep before the first
    pass). Subsequent passes sleep first, then run. If ``stop_event``
    is set at any point the loop exits cleanly.
    """
    _validate(interval_hours, max_passes)
    event = stop_event if stop_event is not None else threading.Event()
    outcomes: list[RetentionOutcome] = []
    interval_seconds = float(interval_hours) * 3600.0

    pass_index = 0
    while True:
        if event.is_set():
            _log.info(
                "retention.scheduler.stop_requested completed_passes=%d",
                pass_index,
            )
            return outcomes, None
        pass_index += 1
        try:
            outcome = single_pass()
        except AppError as exc:
            _log.error(
                "retention.scheduler.pass_failed pass_index=%d code=%s msg=%s",
                pass_index, exc.code.name, exc,
            )
            return outcomes, exc
        outcomes.append(outcome)
        _log.info(
            "retention.scheduler.pass_completed pass_index=%d deleted=%d failures=%d",
            pass_index,
            outcome.RunSessionsDeleted,
            len(outcome.UnlinkFailures),
        )
        if max_passes is not None and pass_index >= max_passes:
            return outcomes, None
        completed = _interruptible_sleep(interval_seconds, event, sleeper)
        if not completed:
            _log.info(
                "retention.scheduler.stop_requested completed_passes=%d",
                pass_index,
            )
            return outcomes, None


__all__ = ["run_scheduled"]
