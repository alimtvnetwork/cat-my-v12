"""RunSession Task-DB writer (Plan 90 Step 96).

Owning specs:
  - `spec/21-app/24-results-json.md` §1 "Two Files per RunSession" (task.db
    row is authoritative; JSONL is a reproducible export).
  - `spec/21-app/76-cli-log-and-ipc.md` §"Database ownership" (Task tier
    owns per-invocation run bookkeeping; RunId is the cross-tier join key).
  - `spec/04-database-conventions/01-naming-conventions.md` (PascalCase
    columns; INTEGER epoch for `*At`; no cross-tier FKs).

Root cause (pre-Step-96): `evaluate` only appended JSONL to disk; no Task
DB row was written, so downstream `RuleResult` (Step 97), FrameArtifact
(Step 98), `GET /observability/runs` (Step 100), and the FE history view
(Step 141+) had nothing to key off.

Contract
--------
`write_run_session(conn, record, *, mode, results_jsonl_path=None,
now_epoch=None) -> WriteOutcome`:

  * Pure transformation of the evaluator's result-record dict (see
    `BE/cli/processing/commands/evaluate.py::_empty_result_record`) into
    ONE `RunSession` row.
  * Idempotent by `RunId` via `INSERT OR IGNORE`: replaying the same
    JSONL through the writer yields `WasInserted=False` and returns the
    existing `RunSessionId` so the caller can still link child rows.
  * Never fabricates counters or verdicts: missing / non-int counts raise
    `AppError(E_BE_BAD_REQUEST)` with the offending field named; the DB
    CHECK constraints reject self-inconsistent counter sums (`active +
    inactive + silent == total`; `pass + fail + error == active`).
  * Transaction: wraps INSERT + SELECT in `BEGIN IMMEDIATE` .. `COMMIT`;
    any `sqlite3.Error` is surfaced as `AppError(E_BE_INTERNAL)` with the
    original message in `Details`.
  * Logging: single INFO on insert with `RunId`, `RunSessionId`, `Verdict`;
    single WARNING on idempotent skip; single ERROR + re-raise on DB
    failure. No silent swallowing.

The writer is Task-tier only: it never imports Root/Rules connection
factories, and the accompanying grep test pins that.
"""

from __future__ import annotations

import logging
import sqlite3
import time
from dataclasses import dataclass
from typing import Any, Mapping

from rule_kernel.dashboard import aggregate_runs
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_log = logging.getLogger(__name__)

_ALLOWED_VERDICTS: frozenset[str] = frozenset({"Pass", "Fail", "Error"})
_REQUIRED_COUNTS: tuple[str, ...] = (
    "RuleCount", "ActiveCount", "InactiveCount", "SilentCount",
    "PassCount", "FailCount", "ErrorCount",
)


@dataclass(frozen=True)
class WriteOutcome:
    """Result of a single `write_run_session` call.

    `WasInserted=False` means the RunId already existed; `RunSessionId`
    still points at the pre-existing row so callers can link child data.
    """

    RunSessionId: int
    RunId: str
    WasInserted: bool
    TimeoutCount: int
    PromotedErrorCode: str | None


def _require_str(rec: Mapping[str, Any], key: str) -> str:
    v = rec.get(key)
    if not isinstance(v, str) or not v:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"RunSession record missing required string field {key!r}",
            {"Field": key},
        )
    return v


def _require_int(source: Mapping[str, Any], key: str, *, allow_zero: bool = True) -> int:
    v = source.get(key)
    if isinstance(v, bool) or not isinstance(v, int):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"RunSession record field {key!r} must be int (got {type(v).__name__})",
            {"Field": key},
        )
    if v < 0 or (not allow_zero and v == 0):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"RunSession record field {key!r} must be non-negative (got {v})",
            {"Field": key, "Value": v},
        )
    return v


def _optional_str(rec: Mapping[str, Any], key: str) -> str | None:
    v = rec.get(key)
    return v if isinstance(v, str) and v else None


def _coerce_captured_at(rec: Mapping[str, Any]) -> int | None:
    """`CapturedAt` in the JSONL is ISO-8601 (spec 24 §3); the DB stores
    epoch seconds. Non-parseable inputs return None rather than crashing
    the write, but a WARNING is logged so drift is visible."""
    v = rec.get("CapturedAt")
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return int(v)
    if isinstance(v, str) and v:
        try:
            from datetime import datetime
            iso = v.replace("Z", "+00:00")
            return int(datetime.fromisoformat(iso).timestamp())
        except ValueError:
            _log.warning(
                "run_session.captured_at.unparseable value=%r; storing NULL", v,
            )
    return None


def write_run_session(
    conn: sqlite3.Connection,
    record: Mapping[str, Any],
    *,
    mode: str,
    results_jsonl_path: str | None = None,
    now_epoch: int | None = None,
) -> WriteOutcome:
    if not isinstance(record, Mapping):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "RunSession record must be a mapping",
            {"Type": type(record).__name__},
        )
    if not isinstance(mode, str) or not mode:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "RunSession `mode` must be a non-empty string",
            {"Field": "mode"},
        )

    run_id = _require_str(record, "RunSessionId")
    verdict = _require_str(record, "Verdict")
    if verdict not in _ALLOWED_VERDICTS:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"RunSession Verdict must be one of {sorted(_ALLOWED_VERDICTS)}; got {verdict!r}",
            {"Field": "Verdict", "Value": verdict},
        )

    rule_set = record.get("RuleSet")
    if not isinstance(rule_set, Mapping):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "RunSession record missing RuleSet object",
            {"Field": "RuleSet"},
        )
    counts = {k: _require_int(rule_set, k) for k in _REQUIRED_COUNTS}
    # Match the DB CHECK constraints at the Python boundary so callers get
    # E_BE_BAD_REQUEST (client contract) rather than the generic sqlite
    # CHECK failure (which would surface as E_BE_INTERNAL).
    if counts["ActiveCount"] + counts["InactiveCount"] + counts["SilentCount"] != counts["RuleCount"]:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "RunSession counter invariant violated: "
            "ActiveCount + InactiveCount + SilentCount != RuleCount",
            {"Counts": counts},
        )
    if counts["PassCount"] + counts["FailCount"] + counts["ErrorCount"] != counts["ActiveCount"]:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "RunSession counter invariant violated: "
            "PassCount + FailCount + ErrorCount != ActiveCount",
            {"Counts": counts},
        )

    agg = aggregate_runs([record])
    timeout_count = agg.TimeoutCount
    # Priority mirrors evaluate._ERROR_CODE_PRIORITY; timeouts alert first.
    promoted: str | None = None
    for pref in ("E_RULE_TIMEOUT", "E_TOLERANCE_INCOMPATIBLE",
                 "E_TOLERANCE_UNRESOLVED", "E_RULE_EVAL_FAILED",
                 "E_RULE_BUNDLE_INVALID"):
        if pref in agg.ErrorCodeCounts:
            promoted = pref
            break
    if promoted is None and agg.ErrorCodeCounts:
        promoted = sorted(agg.ErrorCodeCounts.keys())[0]

    captured_at = _coerce_captured_at(record)
    persisted_at = int(now_epoch if now_epoch is not None else time.time())
    task_id = _optional_str(record, "TaskId")
    instruction_id = _optional_str(record, "InstructionId")
    image_file_path = _optional_str(record, "ImageFilePath")

    try:
        conn.execute("BEGIN IMMEDIATE")
        cur = conn.execute(
            """
            INSERT OR IGNORE INTO RunSession (
              RunId, TaskId, InstructionId, Verdict, Mode,
              ImageFilePath, ResultsJsonlPath,
              RuleCount, ActiveCount, InactiveCount, SilentCount,
              PassCount, FailCount, ErrorCount,
              TimeoutCount, PromotedErrorCode,
              CapturedAt, PersistedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id, task_id, instruction_id, verdict, mode,
                image_file_path, results_jsonl_path,
                counts["RuleCount"], counts["ActiveCount"],
                counts["InactiveCount"], counts["SilentCount"],
                counts["PassCount"], counts["FailCount"], counts["ErrorCount"],
                timeout_count, promoted,
                captured_at, persisted_at,
            ),
        )
        was_inserted = cur.rowcount == 1
        row = conn.execute(
            "SELECT RunSessionId FROM RunSession WHERE RunId = ?", (run_id,),
        ).fetchone()
        conn.execute("COMMIT")
    except sqlite3.Error as exc:
        try:
            conn.execute("ROLLBACK")
        except sqlite3.Error:
            pass
        _log.error(
            "run_session.write.db_error run_id=%s verdict=%s error=%s",
            run_id, verdict, exc,
        )
        raise AppError(
            ErrorCode.E_BE_INTERNAL,
            f"RunSession write failed: {exc}",
            {"RunId": run_id, "Verdict": verdict, "SqliteError": str(exc)},
        ) from exc

    if row is None:
        # SELECT after successful INSERT OR IGNORE should always find the row;
        # if not, the DB is corrupt or a concurrent DELETE fired. Surface it
        # loudly instead of returning a bogus id.
        raise AppError(
            ErrorCode.E_BE_INTERNAL,
            "RunSession write: INSERT succeeded but row not found on read-back",
            {"RunId": run_id},
        )
    run_session_id = int(row[0])

    if was_inserted:
        _log.info(
            "run_session.write.inserted run_id=%s run_session_id=%d verdict=%s "
            "rules=%d pass=%d fail=%d error=%d timeouts=%d",
            run_id, run_session_id, verdict,
            counts["RuleCount"], counts["PassCount"], counts["FailCount"],
            counts["ErrorCount"], timeout_count,
        )
    else:
        _log.warning(
            "run_session.write.duplicate run_id=%s run_session_id=%d "
            "(idempotent; existing row returned)",
            run_id, run_session_id,
        )

    return WriteOutcome(
        RunSessionId=run_session_id,
        RunId=run_id,
        WasInserted=was_inserted,
        TimeoutCount=timeout_count,
        PromotedErrorCode=promoted,
    )


__all__ = ["WriteOutcome", "write_run_session"]
