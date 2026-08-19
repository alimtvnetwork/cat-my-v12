"""FrameArtifact Task-DB writer (Plan 90 Step 98).

Owning specs:
  - `spec/21-app/24-results-json.md` §"safe-zone evidence" (each judgment
    may reference one or more binary artifacts; DB row is the durable
    pointer, JSONL is a reproducible export).
  - `spec/21-app/72-audit-persistence.md` §72.10 (facade owns the only
    write path; retention worker is the only delete path).
  - `spec/04-database-conventions/01-naming-conventions.md` (singular
    PascalCase, INTEGER epoch `*At`, no cross-tier FKs).
  - `spec/coding-guidelines/python.md`: typed dataclasses, positive `if`,
    every `except` logs once with operation + subject id.

Root cause guarded (pre-Step-98): `RuleResult` (Step 97) recorded per-rule
verdicts, but the ROI crop / annotated overlay / reference image that let
a human confirm a failure lived only as loose files under
`results/<RunId>/artifacts/`. Without a queryable table keyed on
`(RunSessionId, RuleResultId, RelPath, Sha256, Bytes)`, the FE detail
drawer, retention GC, and the Step 100 observability route had no way to
enumerate a rule's evidence.

Contract
--------
`write_frame_artifacts(conn, *, run_session_id, artifacts, now_epoch=None)
-> WriteBatchOutcome`:

  * Task-tier only (grep-guarded by `test_split_isolation.py`).
  * Idempotent by `(RunSessionId, RelPath)`: replaying inserts nothing
    new; `WasInserted` per-row shows the skip.
  * Accepts BOTH PascalCase (canonical wire) and camelCase (legacy
    spec-24 JSON keys) via `_pick` so evaluator + JSONL callers both work.
  * Pre-validates the ENTIRE batch (Kind, RelPath shape, Sha256 hex64,
    Bytes non-negative int, RuleResultId int-or-None, no duplicate
    RelPath in batch) BEFORE opening `BEGIN IMMEDIATE`, so any bad row
    aborts atomically without leaving a partial batch in the DB.
  * Rejects unknown parent `RunSessionId` up-front as `E_BE_NOT_FOUND`.
  * Rejects unknown `RuleResultId` (when provided) up-front as
    `E_BE_NOT_FOUND`, and rejects `RuleResultId` whose `RunSessionId`
    differs from the batch parent as `E_BE_BAD_REQUEST` (mis-linkage).
  * One INFO/ERROR log per batch; never silent.
"""

from __future__ import annotations

import contextlib
import logging
import re
import sqlite3
import time
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from typing import Any

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_log = logging.getLogger(__name__)

_ALLOWED_KINDS: frozenset[str] = frozenset({
    "SourceFrame", "RoiCrop", "Overlay", "Reference", "DebugMask",
})
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
# POSIX relative path guard: no leading '/', no drive letter, no '..' segment,
# no NUL, no backslash. Mirrors the storage_facade path policy so the DB and
# the on-disk layout agree on identity.
_REL_PATH_BAD = re.compile(r"(^/)|(^[A-Za-z]:)|(\\)|(\x00)")


@dataclass(frozen=True)
class FrameArtifactRow:
    FrameArtifactId: int
    RelPath: str
    ArtifactKind: str
    RuleResultId: int | None
    Sha256: str
    Bytes: int
    WasInserted: bool


@dataclass(frozen=True)
class WriteBatchOutcome:
    RunSessionId: int
    InsertedCount: int
    SkippedCount: int
    Rows: tuple[FrameArtifactRow, ...] = field(default_factory=tuple)


def _pick(rec: Mapping[str, Any], *keys: str) -> Any:
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
            f"FrameArtifact missing required string {keys[0]!r}",
            {"Field": keys[0]},
        )
    return v


def _coerce_kind(rec: Mapping[str, Any]) -> str:
    v = _require_str(rec, "ArtifactKind", "artifactKind", "Kind", "kind")
    if v not in _ALLOWED_KINDS:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"FrameArtifact ArtifactKind must be one of {sorted(_ALLOWED_KINDS)}; got {v!r}",
            {"Field": "ArtifactKind", "Value": v},
        )
    return v


def _coerce_rel_path(rec: Mapping[str, Any]) -> str:
    v = _require_str(rec, "RelPath", "relPath", "Path", "path")
    if _REL_PATH_BAD.search(v) or ".." in v.split("/"):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "FrameArtifact RelPath must be a POSIX relative path (no '..', no '/', no drive letter, no backslash, no NUL)",
            {"Field": "RelPath", "Value": v},
        )
    return v


def _coerce_sha256(rec: Mapping[str, Any]) -> str:
    v = _require_str(rec, "Sha256", "sha256")
    v = v.lower()
    if not _SHA256_RE.match(v):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "FrameArtifact Sha256 must be 64 lowercase hex chars",
            {"Field": "Sha256"},
        )
    return v


def _coerce_bytes(rec: Mapping[str, Any]) -> int:
    v = _pick(rec, "Bytes", "bytes", "SizeBytes", "sizeBytes")
    if isinstance(v, bool) or not isinstance(v, int):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"FrameArtifact Bytes must be int (got {type(v).__name__})",
            {"Field": "Bytes"},
        )
    if v < 0:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "FrameArtifact Bytes must be non-negative",
            {"Field": "Bytes", "Value": v},
        )
    return v


def _coerce_optional_int(rec: Mapping[str, Any], *keys: str) -> int | None:
    v = _pick(rec, *keys)
    if v is None:
        return None
    if isinstance(v, bool) or not isinstance(v, int):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"FrameArtifact field {keys[0]!r} must be int-or-null (got {type(v).__name__})",
            {"Field": keys[0]},
        )
    if v <= 0:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"FrameArtifact field {keys[0]!r} must be positive when set",
            {"Field": keys[0], "Value": v},
        )
    return v


def _optional_str(rec: Mapping[str, Any], *keys: str) -> str | None:
    v = _pick(rec, *keys)
    return v if isinstance(v, str) and v else None


def write_frame_artifacts(
    conn: sqlite3.Connection,
    *,
    run_session_id: int,
    artifacts: Sequence[Mapping[str, Any]] | Iterable[Mapping[str, Any]],
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

    art_list = list(artifacts) if artifacts is not None else []
    for i, a in enumerate(art_list):
        if not isinstance(a, Mapping):
            raise AppError(
                ErrorCode.E_BE_BAD_REQUEST,
                f"artifacts[{i}] must be a mapping",
                {"Index": i, "Type": type(a).__name__},
            )

    prepared: list[dict[str, Any]] = []
    seen_paths: set[str] = set()
    for i, a in enumerate(art_list):
        rel_path = _coerce_rel_path(a)
        if rel_path in seen_paths:
            raise AppError(
                ErrorCode.E_BE_BAD_REQUEST,
                f"artifacts[{i}] duplicate RelPath {rel_path!r} in batch",
                {"Index": i, "RelPath": rel_path},
            )
        seen_paths.add(rel_path)
        prepared.append({
            "RelPath": rel_path,
            "ArtifactKind": _coerce_kind(a),
            "RuleResultId": _coerce_optional_int(a, "RuleResultId", "ruleResultId"),
            "Sha256": _coerce_sha256(a),
            "Bytes": _coerce_bytes(a),
            "MimeType": _optional_str(a, "MimeType", "mimeType"),
            "CapturedAt": _coerce_optional_int(a, "CapturedAt", "capturedAt"),
        })

    persisted_at = int(now_epoch if now_epoch is not None else time.time())

    try:
        conn.execute("BEGIN IMMEDIATE")
        parent = conn.execute(
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

        # Verify every referenced RuleResultId belongs to this run BEFORE
        # any insert so a mis-linked batch aborts cleanly.
        for row in prepared:
            rr_id = row["RuleResultId"]
            if rr_id is None:
                continue
            found = conn.execute(
                "SELECT RunSessionId FROM RuleResult WHERE RuleResultId = ?",
                (rr_id,),
            ).fetchone()
            if found is None:
                conn.execute("ROLLBACK")
                raise AppError(
                    ErrorCode.E_BE_NOT_FOUND,
                    f"RuleResult {rr_id} does not exist",
                    {"RuleResultId": rr_id},
                )
            if int(found[0]) != run_session_id:
                conn.execute("ROLLBACK")
                raise AppError(
                    ErrorCode.E_BE_BAD_REQUEST,
                    f"RuleResult {rr_id} belongs to a different RunSession",
                    {
                        "RuleResultId": rr_id,
                        "ExpectedRunSessionId": run_session_id,
                        "ActualRunSessionId": int(found[0]),
                    },
                )

        rows: list[FrameArtifactRow] = []
        inserted = 0
        skipped = 0
        for row in prepared:
            cur = conn.execute(
                """
                INSERT OR IGNORE INTO FrameArtifact (
                  RunSessionId, RuleResultId, ArtifactKind, RelPath,
                  Sha256, Bytes, MimeType, CapturedAt, PersistedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_session_id, row["RuleResultId"], row["ArtifactKind"],
                    row["RelPath"], row["Sha256"], row["Bytes"],
                    row["MimeType"], row["CapturedAt"], persisted_at,
                ),
            )
            was_inserted = cur.rowcount == 1
            id_row = conn.execute(
                "SELECT FrameArtifactId FROM FrameArtifact "
                "WHERE RunSessionId = ? AND RelPath = ?",
                (run_session_id, row["RelPath"]),
            ).fetchone()
            if id_row is None:
                conn.execute("ROLLBACK")
                raise AppError(
                    ErrorCode.E_BE_INTERNAL,
                    "FrameArtifact write: INSERT succeeded but row not found on read-back",
                    {"RunSessionId": run_session_id, "RelPath": row["RelPath"]},
                )
            rows.append(FrameArtifactRow(
                FrameArtifactId=int(id_row[0]),
                RelPath=row["RelPath"],
                ArtifactKind=row["ArtifactKind"],
                RuleResultId=row["RuleResultId"],
                Sha256=row["Sha256"],
                Bytes=row["Bytes"],
                WasInserted=was_inserted,
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
            "frame_artifact.write.db_error RunSessionId=%s Count=%d: %s",
            run_session_id, len(prepared), exc,
        )
        raise AppError(
            ErrorCode.E_BE_INTERNAL,
            "FrameArtifact write failed",
            {"RunSessionId": run_session_id, "SqliteError": str(exc)},
        ) from exc

    _log.info(
        "frame_artifact.write.ok RunSessionId=%d Inserted=%d Skipped=%d",
        run_session_id, inserted, skipped,
    )
    return WriteBatchOutcome(
        RunSessionId=run_session_id,
        InsertedCount=inserted,
        SkippedCount=skipped,
        Rows=tuple(rows),
    )
