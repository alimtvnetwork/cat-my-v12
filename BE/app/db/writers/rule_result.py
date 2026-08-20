"""RuleResult Task-DB writer (Plan 90 Step 97).

Owning specs:
  - `spec/21-app/24-results-json.md` §4 "Per-Judgment Shape" (one row per
    evaluated rule; Inactive rules never land here).
  - `spec/21-app/22-image-verdict.md` §4 (per-rule verdict is durable in
    the Task DB; JSONL is a reproducible export).
  - `spec/04-database-conventions/01-naming-conventions.md`.
  - `spec/coding-guidelines/python.md`: typed dataclasses, positive `if`,
    every `except` logs once with operation + subject id.

Root cause (pre-Step-97): Step 96 landed `RunSession` but per-rule
verdicts still lived only in the JSONL export, so the FE per-run detail
drawer, the Step 98 `FrameArtifact` writer (which FKs on `RuleResultId`),
and the Step 100 observability route had no queryable per-rule table.

Contract
--------
`write_rule_results(conn, *, run_session_id, judgments,
rule_ordering=None, now_epoch=None) -> WriteBatchOutcome`:

  * Task-tier only (grep-guarded).
  * Idempotent by `(RunSessionId, RuleId)`: replaying the same batch
    inserts nothing new; `WasInserted` per-row shows the skip.
  * Accepts BOTH PascalCase (canonical wire) and lowercase (legacy) field
    aliases so the writer survives an evaluator caller that still uses
    the spec-24 lowercase JSON keys directly.
  * Rejects malformed batches at the Python boundary with
    `E_BE_BAD_REQUEST`; only Real DB failures raise `E_BE_INTERNAL`.
  * One transaction per call (`BEGIN IMMEDIATE` .. `COMMIT`) so a mid-
    batch validation failure never leaves a partial run in the DB.
  * Never fabricates a verdict; a missing/invalid `Verdict` on any entry
    aborts the whole batch (Honesty rule mirrored from `evaluate.py`).
"""

from __future__ import annotations

import contextlib
import json
import logging
import sqlite3
import time
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from typing import Any

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_log = logging.getLogger(__name__)

_ALLOWED_VERDICTS: frozenset[str] = frozenset({"Pass", "Fail", "Error"})


@dataclass(frozen=True)
class RuleResultRow:
    RuleResultId: int
    RuleId: str
    Verdict: str
    WasInserted: bool
    ErrorCode: str | None


@dataclass(frozen=True)
class WriteBatchOutcome:
    RunSessionId: int
    InsertedCount: int
    SkippedCount: int
    Rows: tuple[RuleResultRow, ...] = field(default_factory=tuple)


def _pick(rec: Mapping[str, Any], *keys: str) -> Any:
    """Return the first present, non-None value for any of `keys`.

    Accepts PascalCase (canonical) then camelCase (legacy spec-24 JSON
    keys) so this writer works whether the caller reads from the DB row
    shape or straight from the on-disk JSONL export.
    """
    for k in keys:
        v = rec.get(k)
        if v is not None:
            return v
    return None


def _require_str(rec: Mapping[str, Any], *keys: str) -> str:
    v = _pick(rec, *keys)
    if not isinstance(v, str) or not v:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"RuleResult judgment missing required string {keys[0]!r}",
            {"Field": keys[0]},
        )
    return v


def _coerce_verdict(rec: Mapping[str, Any]) -> str:
    v = _require_str(rec, "Verdict", "verdict")
    if v not in _ALLOWED_VERDICTS:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"RuleResult Verdict must be one of {sorted(_ALLOWED_VERDICTS)}; got {v!r}",
            {"Field": "Verdict", "Value": v},
        )
    return v


def _coerce_bool(rec: Mapping[str, Any], *keys: str, default: bool = False) -> bool:
    v = _pick(rec, *keys)
    if v is None:
        return default
    if isinstance(v, bool):
        return v
    if isinstance(v, int) and v in (0, 1):
        return bool(v)
    raise AppError(
        ErrorCode.E_BE_BAD_REQUEST,
        f"RuleResult field {keys[0]!r} must be bool (got {type(v).__name__})",
        {"Field": keys[0]},
    )


def _coerce_elapsed(rec: Mapping[str, Any]) -> float | None:
    v = _pick(rec, "ElapsedMs", "elapsedMs", "LatencyMs")
    if v is None:
        return None
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "RuleResult ElapsedMs must be a real number",
            {"Field": "ElapsedMs"},
        )
    f = float(v)
    if f != f or f in (float("inf"), float("-inf")) or f < 0:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "RuleResult ElapsedMs must be finite and non-negative",
            {"Field": "ElapsedMs", "Value": f},
        )
    return f


def _optional_str(rec: Mapping[str, Any], *keys: str) -> str | None:
    v = _pick(rec, *keys)
    return v if isinstance(v, str) and v else None


def _extract_metrics(rec: Mapping[str, Any]) -> tuple[str | None, dict[str, Any]]:
    """Return (metrics_json, details_dict).

    `details_dict` is the merged (`Details` U `details`) mapping used to
    resolve `RuleKind` / `ErrorCode` fields that spec-24 nests inside
    `metrics` but the evaluator today puts under `Details`.
    """
    details = _pick(rec, "Details", "details") or {}
    if not isinstance(details, dict):
        details = {}
    metrics = _pick(rec, "Metrics", "metrics")
    if metrics is None:
        return None, details
    if not isinstance(metrics, dict):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "RuleResult metrics must be an object",
            {"Field": "Metrics"},
        )
    try:
        return json.dumps(metrics, ensure_ascii=False, sort_keys=True, separators=(",", ":")), details
    except (TypeError, ValueError) as exc:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"RuleResult metrics not JSON-serializable: {exc}",
            {"Field": "Metrics"},
        ) from exc


def _order_index_for(
    rule_id: str, rule_ordering: Mapping[str, int] | None,
) -> int | None:
    if rule_ordering is None:
        return None
    idx = rule_ordering.get(rule_id)
    if idx is None:
        return None
    if isinstance(idx, bool) or not isinstance(idx, int):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "rule_ordering values must be int",
            {"Field": "OrderIndex", "RuleId": rule_id},
        )
    return idx


def write_rule_results(
    conn: sqlite3.Connection,
    *,
    run_session_id: int,
    judgments: Sequence[Mapping[str, Any]] | Iterable[Mapping[str, Any]],
    rule_ordering: Mapping[str, int] | None = None,
    now_epoch: int | None = None,
) -> WriteBatchOutcome:
    if isinstance(run_session_id, bool) or not isinstance(run_session_id, int):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "run_session_id must be int",
            {"Field": "RunSessionId"},
        )
    if run_session_id <= 0:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "run_session_id must be positive",
            {"Field": "RunSessionId", "Value": run_session_id},
        )
    judgment_list = list(judgments) if judgments is not None else []
    for i, j in enumerate(judgment_list):
        if not isinstance(j, Mapping):
            raise AppError(
                ErrorCode.E_BE_BAD_REQUEST,
                f"judgments[{i}] must be a mapping",
                {"Index": i, "Type": type(j).__name__},
            )

    # Pre-validate all rows before opening the transaction so a bad row
    # never leaves half a batch in the DB.
    prepared: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for i, j in enumerate(judgment_list):
        rule_id = _require_str(j, "RuleId", "ruleId")
        if rule_id in seen_ids:
            raise AppError(
                ErrorCode.E_BE_BAD_REQUEST,
                f"judgments[{i}] duplicate RuleId {rule_id!r} in batch",
                {"Index": i, "RuleId": rule_id},
            )
        seen_ids.add(rule_id)
        metrics_json, details = _extract_metrics(j)
        prepared.append({
            "RuleId": rule_id,
            "RegionId": _optional_str(j, "RegionId", "regionId"),
            "RuleKind": _optional_str(j, "RuleKind", "ruleKind")
                        or _optional_str(details, "RuleKind"),
            "OrderIndex": _order_index_for(rule_id, rule_ordering),
            "IsSilent": 1 if _coerce_bool(j, "IsSilent", "isSilent") else 0,
            "Verdict": _coerce_verdict(j),
            "ReasonCode": _optional_str(j, "ReasonCode", "reasonCode"),
            "ReasonMessage": _optional_str(j, "ReasonMessage", "reasonMessage"),
            "ErrorCode": _optional_str(j, "ErrorCode")
                         or _optional_str(details, "ErrorCode"),
            "ElapsedMs": _coerce_elapsed(j),
            "MetricsJson": metrics_json,
        })

    persisted_at = int(now_epoch if now_epoch is not None else time.time())

    try:
        conn.execute("BEGIN IMMEDIATE")
        # Reject unknown parent up-front so we return E_BE_NOT_FOUND
        # instead of relying on a raw FK constraint failure.
        parent = conn.safe_execute(
            "SELECT RunSessionId FROM RunSession WHERE RunSessionId = ?",
            (run_session_id,),
        ).fetchone()
        if parent is None:
            conn.execute("ROLLBACK")
            raise AppError(
                ErrorCode.E_BE_NOT_FOUND,
                f"RunSession {run_session_id} does not exist",
                {"RunSessionId": run_session_id},
            )

        rows: list[RuleResultRow] = []
        inserted = 0
        skipped = 0
        for row in prepared:
            cur = conn.safe_execute(
                """
                INSERT OR IGNORE INTO RuleResult (
                  RunSessionId, RuleId, RegionId, RuleKind, OrderIndex,
                  IsSilent, Verdict, ReasonCode, ReasonMessage,
                  ErrorCode, ElapsedMs, MetricsJson, PersistedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_session_id, row["RuleId"], row["RegionId"], row["RuleKind"],
                    row["OrderIndex"], row["IsSilent"], row["Verdict"],
                    row["ReasonCode"], row["ReasonMessage"], row["ErrorCode"],
                    row["ElapsedMs"], row["MetricsJson"], persisted_at,
                ),
            )
            was_inserted = cur.rowcount == 1
            id_row = conn.safe_execute(
                "SELECT RuleResultId FROM RuleResult "
                "WHERE RunSessionId = ? AND RuleId = ?",
                (run_session_id, row["RuleId"]),
            ).fetchone()
            if id_row is None:
                conn.execute("ROLLBACK")
                raise AppError(
                    ErrorCode.E_BE_INTERNAL,
                    "RuleResult write: INSERT succeeded but row not found on read-back",
                    {"RunSessionId": run_session_id, "RuleId": row["RuleId"]},
                )
            rows.append(RuleResultRow(
                RuleResultId=int(id_row[0]),
                RuleId=row["RuleId"],
                Verdict=row["Verdict"],
                WasInserted=was_inserted,
                ErrorCode=row["ErrorCode"],
            ))
            if was_inserted:
                inserted += 1
            else:
                skipped += 1
        conn.execute("COMMIT")
    except AppError:
        raise
    except sqlite3.Error as exc:
        with contextlib.suppress(sqlite3.Error):
            conn.execute("ROLLBACK")
        _log.error(
            "rule_result.write.db_error run_session_id=%d count=%d error=%s",
            run_session_id, len(prepared), exc,
        )
        raise AppError(
            ErrorCode.E_BE_INTERNAL,
            f"RuleResult write failed: {exc}",
            {
                "RunSessionId": run_session_id,
                "JudgmentCount": len(prepared),
                "SqliteError": str(exc),
            },
        ) from exc

    _log.info(
        "rule_result.write.done run_session_id=%d inserted=%d skipped=%d",
        run_session_id, inserted, skipped,
    )

    return WriteBatchOutcome(
        RunSessionId=run_session_id,
        InsertedCount=inserted,
        SkippedCount=skipped,
        Rows=tuple(rows),
    )


__all__ = ["RuleResultRow", "WriteBatchOutcome", "write_rule_results"]
