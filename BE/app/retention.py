"""Plan 90 Step 101 - Task-DB retention/vacuum pass.

Owning specs:
  - ``spec/21-app/72-audit-persistence.md`` §"Retention" (facade owns the
    only write path; retention worker is the only delete path; audit
    window is bounded).
  - ``spec/21-app/24-results-json.md`` §"Two Files per RunSession" (the
    Task-DB row is authoritative; JSONL sidecars are reproducible
    exports and MAY be unlinked when the parent RunSession is purged).
  - ``spec/05-split-db-architecture/`` (Task-tier only; no cross-tier
    ATTACH; guarded connection).
  - ``spec/coding-guidelines/python.md`` (typed dataclasses, positive
    `if`, every `except` logs once with operation + subject id).

Root cause guarded (pre-Step-101): Steps 96-100 built the full write and
read path but the DB and the on-disk ``results/<RunId>/artifacts/`` tree
grow forever. Without a bounded retention pass:

  1. ``GET /observability/runs`` degrades to seconds per query once the
     row count crosses a few million;
  2. the artifact folder eventually fills the OS partition and every
     subsequent ``evaluate`` fails on disk write;
  3. spec 72's compliance retention window is not enforceable.

The critical ordering rule this module enforces: walk
``FrameArtifact.RelPath`` for every doomed ``RunSession`` **before**
issuing the ``DELETE FROM RunSession`` that cascades child rows away.
If we deleted the parent first, ``ON DELETE CASCADE`` would erase the
``RelPath`` list we need to unlink the files, orphaning them on disk
forever.

Failure model
-------------
* File unlink is idempotent: missing file logs INFO and counts as
  unlinked (the durable record was the DB row we are about to delete).
* Partial file-unlink failure NEVER rolls back the DB delete. The DB
  is the source of truth for "should exist"; the files are a
  rebuildable cache. Every orphan is logged ERROR
  ``retention.file.unlink_failed`` with the RelPath and errno.
* Path traversal in ``RelPath`` (absolute, ``..``, drive-letter) is
  refused BEFORE any filesystem call; the row is still DB-deleted so
  a poisoned artifact row cannot pin retention forever, but the file
  is logged ERROR ``retention.file.traversal_refused`` and skipped.
"""

from __future__ import annotations

import logging
import sqlite3
import time
from collections.abc import Iterable
from dataclasses import dataclass, field
from pathlib import Path, PurePosixPath

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_log = logging.getLogger(__name__)

# Deletes happen in batches so a huge purge does not hold a write lock
# for minutes. 500 rows/batch keeps each transaction <100ms in practice.
_DELETE_BATCH = 500


@dataclass(frozen=True)
class RetentionOutcome:
    """Result of one retention pass. All counters are monotonically
    non-negative and reflect what actually happened on disk + in DB.

    ``DryRun=True`` means no DELETE or unlink was issued; ``*Deleted``
    and ``*Unlinked`` counters then describe what WOULD have happened.
    """

    RetentionDays: int
    CutoffEpoch: int
    DryRun: bool
    RunSessionsScanned: int = 0
    RunSessionsDeleted: int = 0
    ArtifactsScanned: int = 0
    ArtifactsUnlinked: int = 0
    JsonlSidecarsUnlinked: int = 0
    BytesReclaimed: int = 0
    UnlinkFailures: tuple[str, ...] = field(default_factory=tuple)
    TraversalRefusals: tuple[str, ...] = field(default_factory=tuple)

    def to_wire(self) -> dict[str, object]:
        return {
            "RetentionDays": self.RetentionDays,
            "CutoffEpoch": self.CutoffEpoch,
            "DryRun": self.DryRun,
            "RunSessionsScanned": self.RunSessionsScanned,
            "RunSessionsDeleted": self.RunSessionsDeleted,
            "ArtifactsScanned": self.ArtifactsScanned,
            "ArtifactsUnlinked": self.ArtifactsUnlinked,
            "JsonlSidecarsUnlinked": self.JsonlSidecarsUnlinked,
            "BytesReclaimed": self.BytesReclaimed,
            "UnlinkFailures": list(self.UnlinkFailures),
            "TraversalRefusals": list(self.TraversalRefusals),
        }


def _is_safe_rel(rel: str) -> bool:
    """Reject absolute paths, drive letters, and any ``..`` segment.

    We use ``PurePosixPath`` because ``RelPath`` is spec-defined POSIX.
    The check is intentionally strict: a poisoned row must NOT let the
    retention worker unlink an arbitrary host path.
    """
    if not rel or rel != rel.strip():
        return False
    if rel.startswith("/") or rel.startswith("\\"):
        return False
    # Windows drive letter (e.g. ``C:foo``).
    if len(rel) >= 2 and rel[1] == ":":
        return False
    parts = PurePosixPath(rel).parts
    return not any(p == ".." for p in parts)


def _fetch_doomed(conn: sqlite3.Connection, cutoff_epoch: int) -> list[tuple[int, str | None]]:
    """Return ``[(RunSessionId, ResultsJsonlPath), ...]`` for expired rows.

    Ordered by ``RunSessionId`` so retries observe a deterministic
    prefix already-deleted.
    """
    rows = conn.execute(
        "SELECT RunSessionId, ResultsJsonlPath "
        "FROM RunSession WHERE PersistedAt < ? "
        "ORDER BY RunSessionId ASC",
        (cutoff_epoch,),
    ).fetchall()
    return [(int(r[0]), r[1]) for r in rows]


def _fetch_artifacts(
    conn: sqlite3.Connection, run_session_ids: Iterable[int]
) -> list[tuple[int, str, int]]:
    """Return ``[(RunSessionId, RelPath, Bytes), ...]`` for the given
    parents. Called BEFORE any DELETE so cascade doesn't erase the list.
    """
    ids = list(run_session_ids)
    if not ids:
        return []
    out: list[tuple[int, str, int]] = []
    # Chunk the IN() to avoid SQLite's default 999-parameter ceiling.
    for start in range(0, len(ids), _DELETE_BATCH):
        chunk = ids[start : start + _DELETE_BATCH]
        placeholders = ",".join("?" * len(chunk))
        rows = conn.execute(
            f"SELECT RunSessionId, RelPath, Bytes FROM FrameArtifact "
            f"WHERE RunSessionId IN ({placeholders})",
            tuple(chunk),
        ).fetchall()
        out.extend((int(r[0]), str(r[1]), int(r[2])) for r in rows)
    return out


def _delete_run_sessions(conn: sqlite3.Connection, ids: list[int]) -> int:
    """Delete parents in batches of ``_DELETE_BATCH``. Cascade removes
    ``RuleResult`` + ``FrameArtifact`` children. Returns rows deleted.
    """
    if not ids:
        return 0
    deleted = 0
    for start in range(0, len(ids), _DELETE_BATCH):
        chunk = ids[start : start + _DELETE_BATCH]
        placeholders = ",".join("?" * len(chunk))
        conn.execute("BEGIN IMMEDIATE")
        try:
            cur = conn.execute(
                f"DELETE FROM RunSession WHERE RunSessionId IN ({placeholders})",
                tuple(chunk),
            )
            conn.execute("COMMIT")
            deleted += int(cur.rowcount or 0)
        except sqlite3.Error:
            conn.execute("ROLLBACK")
            raise
    return deleted


def _unlink_file(target: Path) -> tuple[bool, str | None]:
    """Idempotent unlink. Returns ``(unlinked, error_message)``.

    ``unlinked=True`` when either the file existed and was removed, OR
    the file never existed (idempotent). ``error_message`` is set only
    on a real ``OSError`` (permission denied, EBUSY, ...).
    """
    try:
        target.unlink(missing_ok=True)
        return True, None
    except OSError as exc:
        return False, f"{type(exc).__name__}: {exc}"


def run_retention(
    conn: sqlite3.Connection,
    *,
    results_root: Path,
    retention_days: int,
    now_epoch: int | None = None,
    dry_run: bool = False,
) -> RetentionOutcome:
    """Purge ``RunSession`` rows older than ``retention_days`` and unlink
    their on-disk ``FrameArtifact`` files.

    Parameters
    ----------
    conn:
        Guarded Task-tier connection (``BE.db.connections.get_task_conn``).
    results_root:
        Absolute filesystem root under which ``FrameArtifact.RelPath``
        resolves. Every unlink path is anchored here; any RelPath that
        would escape via ``..`` or absolute path is refused and logged.
    retention_days:
        Rows with ``PersistedAt < now - retention_days*86400`` are
        eligible. Must be >= 1; ``0`` is rejected because it would
        purge in-flight runs.
    now_epoch:
        Injectable clock (tests). Defaults to ``int(time.time())``.
    dry_run:
        When ``True`` no DELETE and no unlink is issued; counters
        describe what WOULD have happened.

    Raises
    ------
    AppError(E_BE_BAD_REQUEST):
        ``retention_days`` < 1.
    AppError(E_BE_INTERNAL):
        Task-DB not bootstrapped (missing table) or SQL failure.
    """
    if retention_days < 1:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "retention_days must be >= 1 (0 would purge in-flight runs).",
            details={"RetentionDays": retention_days},
        )

    now = int(now_epoch if now_epoch is not None else time.time())
    cutoff = now - (retention_days * 86400)
    root_abs = Path(results_root).expanduser().resolve()

    try:
        doomed = _fetch_doomed(conn, cutoff)
    except sqlite3.OperationalError as exc:
        # Missing table is loud, not a silent zero-count success.
        _log.error(
            "retention.query_failed op=%s cutoff=%d err=%s",
            "fetch_doomed", cutoff, exc,
        )
        raise AppError(
            ErrorCode.E_BE_INTERNAL,
            f"Task-DB RunSession query failed: {exc}",
            details={"Hint": "python bin/db-bootstrap.py", "CutoffEpoch": cutoff},
        ) from exc

    doomed_ids = [rid for rid, _ in doomed]
    jsonl_paths = [p for _, p in doomed if p]

    # CRITICAL: fetch artifact RelPaths BEFORE cascade delete erases them.
    artifact_rows = _fetch_artifacts(conn, doomed_ids)

    if not doomed_ids:
        outcome = RetentionOutcome(
            RetentionDays=retention_days,
            CutoffEpoch=cutoff,
            DryRun=dry_run,
        )
        _log.info(
            "retention.pass.completed dry_run=%s cutoff=%d scanned=0 deleted=0",
            dry_run, cutoff,
        )
        return outcome

    unlink_failures: list[str] = []
    traversal_refusals: list[str] = []
    artifacts_unlinked = 0
    bytes_reclaimed = 0
    jsonl_unlinked = 0

    if not dry_run:
        # Files first, DB second: even if the DB delete raises later,
        # we've already documented every unlink attempt in the log.
        for _rid, rel, nbytes in artifact_rows:
            if not _is_safe_rel(rel):
                traversal_refusals.append(rel)
                _log.error(
                    "retention.file.traversal_refused rel=%r",
                    rel,
                )
                continue
            target = (root_abs / rel).resolve()
            # Second-line defense: after resolve(), ensure we're still
            # under root_abs (symlink games).
            try:
                target.relative_to(root_abs)
            except ValueError:
                traversal_refusals.append(rel)
                _log.error(
                    "retention.file.escape_refused rel=%r resolved=%s",
                    rel, target,
                )
                continue
            ok, err = _unlink_file(target)
            if ok:
                artifacts_unlinked += 1
                bytes_reclaimed += max(0, nbytes)
            else:
                unlink_failures.append(rel)
                _log.error(
                    "retention.file.unlink_failed rel=%r err=%s",
                    rel, err,
                )

        for jp in jsonl_paths:
            if not jp:
                continue
            target = Path(jp).expanduser()
            ok, err = _unlink_file(target)
            if ok:
                jsonl_unlinked += 1
            else:
                unlink_failures.append(jp)
                _log.error(
                    "retention.file.unlink_failed kind=jsonl path=%r err=%s",
                    jp, err,
                )

        try:
            rows_deleted = _delete_run_sessions(conn, doomed_ids)
        except sqlite3.Error as exc:
            _log.error(
                "retention.db.delete_failed op=%s ids=%d err=%s",
                "delete_run_sessions", len(doomed_ids), exc,
            )
            raise AppError(
                ErrorCode.E_BE_INTERNAL,
                f"Task-DB RunSession delete failed: {exc}",
                details={"AttemptedIds": len(doomed_ids)},
            ) from exc
    else:
        # dry_run: report the theoretical numbers without touching disk.
        for _rid, rel, nbytes in artifact_rows:
            if not _is_safe_rel(rel):
                traversal_refusals.append(rel)
                continue
            artifacts_unlinked += 1
            bytes_reclaimed += max(0, nbytes)
        jsonl_unlinked = sum(1 for jp in jsonl_paths if jp)
        rows_deleted = len(doomed_ids)

    outcome = RetentionOutcome(
        RetentionDays=retention_days,
        CutoffEpoch=cutoff,
        DryRun=dry_run,
        RunSessionsScanned=len(doomed_ids),
        RunSessionsDeleted=rows_deleted,
        ArtifactsScanned=len(artifact_rows),
        ArtifactsUnlinked=artifacts_unlinked,
        JsonlSidecarsUnlinked=jsonl_unlinked,
        BytesReclaimed=bytes_reclaimed,
        UnlinkFailures=tuple(unlink_failures),
        TraversalRefusals=tuple(traversal_refusals),
    )
    _log.info(
        "retention.pass.completed dry_run=%s cutoff=%d scanned=%d deleted=%d "
        "artifacts=%d bytes=%d failures=%d refusals=%d",
        dry_run, cutoff, len(doomed_ids), rows_deleted,
        artifacts_unlinked, bytes_reclaimed,
        len(unlink_failures), len(traversal_refusals),
    )
    return outcome


__all__ = ["RetentionOutcome", "run_retention"]
