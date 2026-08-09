"""Audit log retention policy (v1 legacy path).

DEPRECATED (Plan 20, spec 68 §68.3): the v2 deletion seam is
`app/core/audit/retention_worker.py::AuditRetentionWorker`. This module
predates the multi-policy worker and is kept only for v1 callers still
resolving `AuditLogRetention.prune()`. New code MUST NOT import from
here; do not add fields, do not widen the API. Removal is scheduled
after all v1 callers migrate to the worker (tracked in
`.lovable/memory/v2/plan20/00-baseline-gap.md` §G2 follow-up).

Contract (frozen):
  - ``AuditLogRetention.prune(now=...)`` deletes rows with ``ts < now - max_age_seconds``.
  - Retention is a no-op when ``max_age_seconds`` is ``None`` or ``<= 0``.
  - Each prune emits an ``I_SEC_AUDIT_PRUNED`` audit row via the sink
    (subject=``"audit_log"``, detail=``"removed=<n> horizon=<ts>"``) so
    the deletion is itself observable.
  - Returns the number of rows removed.
"""

from __future__ import annotations

import logging
import sqlite3
import time
from dataclasses import dataclass

from .audit_sink import AuditSink

log = logging.getLogger("ca.security.retention")

CODE_AUDIT_PRUNED = "I_SEC_AUDIT_PRUNED"


@dataclass
class AuditLogRetention:
    sink: AuditSink
    max_age_seconds: int | None

    def prune(self, *, now: int | None = None) -> int:
        if self.max_age_seconds is None or self.max_age_seconds <= 0:
            log.debug("audit.retention.skipped reason=disabled")
            return 0
        horizon = int(now if now is not None else time.time()) - int(self.max_age_seconds)
        try:
            cur = self.sink.conn.execute(
                "DELETE FROM audit_log WHERE ts < ?", (horizon,)
            )
            removed = cur.rowcount or 0
            self.sink.conn.commit()
        except sqlite3.Error:
            log.exception("audit.retention.failed horizon=%s", horizon)
            raise
        if removed > 0:
            self.sink.record(
                CODE_AUDIT_PRUNED,
                subject="audit_log",
                detail=f"removed={removed} horizon={horizon}",
            )
        log.info("audit.retention.pruned removed=%s horizon=%s", removed, horizon)
        return removed
