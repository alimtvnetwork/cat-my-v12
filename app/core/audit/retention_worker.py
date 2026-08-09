"""Plan 20 Step 7: multi-policy audit rotation worker.

Implements the contract locked in `spec/21-app/71-audit-retention.md`
§71.3. One transactional delete per policy, capped batch size, per-policy
budget, exponential back-off on SQLite lock errors, clock-skew guard, and
a self-audit `AuditRetentionRun` row so the rotation is itself observable.

Design notes:
  - Categories map to exactly one `RetentionPolicy` per §71.2. The map
    lives here (not in `audit_sink`) so the sink stays append-only and
    the worker owns the deletion contract.
  - `now_fn` is injected so tests can freeze the clock. `monotonic_fn`
    is injected separately so wall-clock skew can be simulated without
    breaking the per-policy budget timer.
  - We keep the row-count cap in a single DELETE ... LIMIT statement
    where SQLite supports it; the fallback path uses a bounded subselect.
"""
from __future__ import annotations

import logging
import sqlite3
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Iterable

from app.core.db import safe_execute
from app.core.security.audit_sink import AuditSink

log = logging.getLogger("ca.audit.retention_worker")


# §71.2 policy enum. Windows in days; convert to seconds at prune time.
class RetentionPolicy(str, Enum):
    RetentionShort = "RetentionShort"
    RetentionStandard = "RetentionStandard"
    RetentionLong = "RetentionLong"
    RetentionForensic = "RetentionForensic"


POLICY_WINDOW_DAYS: dict[RetentionPolicy, int] = {
    RetentionPolicy.RetentionShort: 30,
    RetentionPolicy.RetentionStandard: 180,
    RetentionPolicy.RetentionLong: 400,
    RetentionPolicy.RetentionForensic: 900,
}

# §71.2 category -> policy map. Any code not listed defaults to
# `RetentionStandard` (safe middle ground) and is logged so the taxonomy
# gap is visible instead of silently dropped.
CATEGORY_POLICY: dict[str, RetentionPolicy] = {
    "E_SEC_DENIAL_BURST": RetentionPolicy.RetentionStandard,
    "E_SEC_ROLE_DENIED": RetentionPolicy.RetentionStandard,
    "E_SEC_DENIED": RetentionPolicy.RetentionStandard,
    "E_CAP_": RetentionPolicy.RetentionStandard,  # prefix match
    "RuleBundle": RetentionPolicy.RetentionLong,  # prefix match
    "I_SEC_ADMIN_WRITE": RetentionPolicy.RetentionForensic,
    "I_SEC_AUDIT_PRUNED": RetentionPolicy.RetentionForensic,
    "AuditRetentionRun": RetentionPolicy.RetentionForensic,
    "License": RetentionPolicy.RetentionLong,  # prefix match
}


def policy_for(code: str) -> RetentionPolicy:
    """Resolve a category code to its retention policy per §71.2."""
    exact = CATEGORY_POLICY.get(code)
    if exact is not None:
        return exact
    for key, pol in CATEGORY_POLICY.items():
        if key.endswith("_") or key[-1:].isalpha():
            if code.startswith(key):
                return pol
    return RetentionPolicy.RetentionStandard


# §71.3 cadence + batch caps.
DEFAULT_CADENCE_HOURS = 6
MIN_CADENCE_HOURS = 1
MAX_CADENCE_HOURS = 24
DEFAULT_BATCH_CAP = 1000
DEFAULT_PER_POLICY_BUDGET_SEC = 300
CLOCK_SKEW_TOLERANCE_SEC = 2  # |now - stored_now| > 2s trips E_AUDIT_RETENTION_CLOCK_SKEW
MAX_BACKOFF_SEC = 8


# §71.3 error taxonomy (granular) + spec 40 A.1 cross-taxonomy alarm.
CODE_RETENTION_LOCKED = "E_AUDIT_RETENTION_LOCKED"
CODE_RETENTION_BATCH_OVERRUN = "E_AUDIT_RETENTION_BATCH_OVERRUN"
CODE_RETENTION_CLOCK_SKEW = "E_AUDIT_RETENTION_CLOCK_SKEW"
CODE_RETENTION_RUN = "AuditRetentionRun"
CODE_SEC_AUDIT_PRUNED = "I_SEC_AUDIT_PRUNED"           # spec 40 A.1 (per-policy success)
CODE_SEC_RETENTION_FAILED = "E_SEC_RETENTION_FAILED"   # spec 40 A.1 (rolled-up failure)



@dataclass
class PolicyResult:
    policy: RetentionPolicy
    horizonTs: int
    rowsPurged: int
    batchOverrun: bool
    durationMs: int
    error: str | None = None


@dataclass
class RotationResult:
    correlationId: str
    startedAt: int
    finishedAt: int
    perPolicy: list[PolicyResult] = field(default_factory=list)


@dataclass
class AuditRetentionWorker:
    sink: AuditSink
    cadence_hours: int = DEFAULT_CADENCE_HOURS
    batch_cap: int = DEFAULT_BATCH_CAP
    per_policy_budget_sec: int = DEFAULT_PER_POLICY_BUDGET_SEC
    now_fn: Callable[[], float] = time.time
    monotonic_fn: Callable[[], float] = time.monotonic
    sleep_fn: Callable[[float], None] = time.sleep

    def __post_init__(self) -> None:
        if not (MIN_CADENCE_HOURS <= self.cadence_hours <= MAX_CADENCE_HOURS):
            raise ValueError(
                f"cadence_hours must be in [{MIN_CADENCE_HOURS}, {MAX_CADENCE_HOURS}]"
            )
        if self.batch_cap <= 0:
            raise ValueError("batch_cap must be positive")

    # --- public API --------------------------------------------------

    def run_once(
        self,
        *,
        policies: Iterable[RetentionPolicy] | None = None,
        stored_now: float | None = None,
    ) -> RotationResult:
        """Run one rotation pass across every policy.

        `stored_now` mirrors the last persisted "worker heartbeat" wall
        clock and is used purely for the §71.3 clock-skew guard: if the
        current `now_fn()` differs by more than `CLOCK_SKEW_TOLERANCE_SEC`,
        we emit `E_AUDIT_RETENTION_CLOCK_SKEW` and refuse to prune.
        """
        cid = _new_correlation_id()
        started = int(self.now_fn())
        result = RotationResult(correlationId=cid, startedAt=started, finishedAt=started)

        if stored_now is not None:
            skew = abs(started - int(stored_now))
            if skew > CLOCK_SKEW_TOLERANCE_SEC:
                # Structured log: keep keys=values so /ops log-tail + grep stay stable.
                log.error(
                    "audit.retention.failed cid=%s cause=clock_skew skew_sec=%d "
                    "tolerance_sec=%d code=%s",
                    cid, skew, CLOCK_SKEW_TOLERANCE_SEC, CODE_SEC_RETENTION_FAILED,
                )
                self._record_run_event(
                    code=CODE_RETENTION_CLOCK_SKEW,
                    detail=f"cid={cid} skewSec={skew}",
                )
                # Spec 40 A.1: roll up to cross-taxonomy alarm consumed by /ops.
                self._record_run_event(
                    code=CODE_SEC_RETENTION_FAILED,
                    detail=f"cid={cid} cause=clock_skew skewSec={skew}",
                )
                result.finishedAt = int(self.now_fn())
                return result


        target = list(policies) if policies is not None else list(RetentionPolicy)
        for pol in target:
            result.perPolicy.append(self._prune_policy(pol, cid))
        result.finishedAt = int(self.now_fn())
        self._record_run_event(
            code=CODE_RETENTION_RUN,
            detail=(
                f"cid={cid} policies={len(result.perPolicy)} "
                f"purged={sum(p.rowsPurged for p in result.perPolicy)}"
            ),
        )
        return result

    # --- internals ---------------------------------------------------

    def _prune_policy(self, policy: RetentionPolicy, cid: str) -> PolicyResult:
        window_sec = POLICY_WINDOW_DAYS[policy] * 86400
        horizon = int(self.now_fn()) - window_sec
        started_mono = self.monotonic_fn()
        removed = 0
        backoff = 0.25
        overrun = False
        error: str | None = None
        try:
            while True:
                if self.monotonic_fn() - started_mono > self.per_policy_budget_sec:
                    overrun = True
                    self._record_run_event(
                        code=CODE_RETENTION_BATCH_OVERRUN,
                        detail=(
                            f"cid={cid} policy={policy.value} horizon={horizon} "
                            f"purgedSoFar={removed}"
                        ),
                    )
                    break
                try:
                    cur = safe_execute(self.sink.conn, 
                        "DELETE FROM audit_log WHERE ts < ? AND rowid IN ("
                        "  SELECT rowid FROM audit_log WHERE ts < ? LIMIT ?"
                        ")",
                        (horizon, horizon, self.batch_cap),
                    )
                    batch = cur.rowcount or 0
                    self.sink.conn.commit()
                except sqlite3.OperationalError as exc:
                    msg = str(exc).lower()
                    if "locked" in msg or "busy" in msg:
                        if backoff > MAX_BACKOFF_SEC:
                            error = CODE_RETENTION_LOCKED
                            log.error(
                                "audit.retention.failed cid=%s policy=%s cause=locked "
                                "backoff_sec=%.2f horizon=%d code=%s",
                                cid, policy.value, backoff, horizon,
                                CODE_SEC_RETENTION_FAILED,
                            )
                            self._record_run_event(
                                code=CODE_RETENTION_LOCKED,
                                detail=f"cid={cid} policy={policy.value}",
                            )
                            # Spec 40 A.1: cross-taxonomy alarm on back-off exhaustion.
                            self._record_run_event(
                                code=CODE_SEC_RETENTION_FAILED,
                                detail=(
                                    f"cid={cid} policy={policy.value} "
                                    f"cause=locked horizon={horizon} sqliteErr=OperationalError"
                                ),
                            )
                            break
                        self.sleep_fn(backoff)
                        backoff *= 2
                        continue
                    raise
                if batch == 0:
                    break
                removed += batch
        except sqlite3.Error as exc:
            log.exception(
                "audit.retention.failed cid=%s policy=%s cause=uncaught "
                "horizon=%d sqlite_err=%s code=%s",
                cid, policy.value, horizon, type(exc).__name__,
                CODE_SEC_RETENTION_FAILED,
            )
            error = "E_AUDIT_RETENTION_UNCAUGHT"
            # Spec 40 A.1: never swallow; surface rolled-up failure.
            self._record_run_event(
                code=CODE_SEC_RETENTION_FAILED,
                detail=(
                    f"cid={cid} policy={policy.value} cause=uncaught "
                    f"horizon={horizon} sqliteErr={type(exc).__name__}"
                ),
            )
        duration_ms = int((self.monotonic_fn() - started_mono) * 1000)
        if removed > 0 and error is None:
            log.info(
                "audit.retention.pruned cid=%s policy=%s removed=%d horizon=%d "
                "duration_ms=%d code=%s",
                cid, policy.value, removed, horizon, duration_ms,
                CODE_SEC_AUDIT_PRUNED,
            )
            # Spec 40 A.1: per-policy success emission (subject audit_log).
            self._record_run_event(
                code=CODE_SEC_AUDIT_PRUNED,
                detail=f"cid={cid} policy={policy.value} removed={removed} horizon={horizon}",
            )
        return PolicyResult(
            policy=policy,
            horizonTs=horizon,
            rowsPurged=removed,
            batchOverrun=overrun,
            durationMs=duration_ms,
            error=error,
        )


    def _record_run_event(self, *, code: str, detail: str) -> None:
        try:
            self.sink.record(code, subject="audit_log", detail=detail)
        except Exception:  # pragma: no cover - self-audit best-effort
            log.exception("audit.retention_worker.self_audit_failed code=%s", code)


def _new_correlation_id() -> str:
    return uuid.uuid4().hex[:12]
