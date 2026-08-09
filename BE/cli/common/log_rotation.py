"""Plan 90 Step 15 - retention pruner for CLI JSONL logs.

Anchor: `spec/21-app/76-cli-log-and-ipc.md` §"Rotation":
    "nightly cleanup keeps 14 days by default (config)."

Layout the pruner expects (written by `BE/cli/common/logger.py`, Step 14):

    <APP_LOG_ROOT>/<source>/YYYY-MM-DD/<file>.jsonl

Rules:
- Prune per source-folder: a source with no dated dirs is left alone.
- The `index/` directory (spec 76 §"Index file", Step 17) is NEVER pruned.
- Directory name that does not match YYYY-MM-DD is skipped, not deleted.
  A stray file is unusual but ignored; we never `rm` outside dated dirs.
- Empty dated dir (after prune or by accident) is removed.
- `keep_days` counts from `today` (UTC, inclusive), so `keep_days=14`
  keeps today + 13 previous days.
- All errors surface as `AppError(E_LOG_ROOT_UNWRITABLE)` so `doctor`
  (Step 41) can present them via the Universal Envelope.
"""

from __future__ import annotations

import re
import shutil
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_RESERVED_DIRS = frozenset({"index"})
DEFAULT_KEEP_DAYS = 14


@dataclass(frozen=True, slots=True)
class PruneReport:
    """Summary suitable for embedding as `Ctx` in a log line."""

    ScannedDirs: int
    RemovedDirs: int
    RemovedFiles: int
    RemovedBytes: int
    KeptDirs: int
    CutoffDate: str

    def to_ctx(self) -> dict[str, object]:
        return {
            "ScannedDirs": self.ScannedDirs,
            "RemovedDirs": self.RemovedDirs,
            "RemovedFiles": self.RemovedFiles,
            "RemovedBytes": self.RemovedBytes,
            "KeptDirs": self.KeptDirs,
            "CutoffDate": self.CutoffDate,
        }


def _today_utc() -> date:
    return datetime.now(timezone.utc).date()


def _parse_dated_name(name: str) -> date | None:
    if not _DATE_RE.match(name):
        return None
    try:
        return datetime.strptime(name, "%Y-%m-%d").date()
    except ValueError:
        return None


def _dir_size(path: Path) -> tuple[int, int]:
    files = 0
    total = 0
    for entry in path.rglob("*"):
        if entry.is_file():
            files += 1
            try:
                total += entry.stat().st_size
            except OSError:
                pass
    return files, total


def _remove_dir(path: Path) -> None:
    try:
        shutil.rmtree(path)
    except OSError as exc:
        raise AppError(
            ErrorCode.E_LOG_ROOT_UNWRITABLE,
            f"Cannot remove log directory {path}: {exc}",
            details={"Path": str(path)},
        ) from exc


def _prune_source(source_dir: Path, cutoff: date) -> tuple[int, int, int, int, int]:
    scanned = removed_dirs = removed_files = removed_bytes = kept = 0
    for child in sorted(source_dir.iterdir()):
        if not child.is_dir():
            continue
        parsed = _parse_dated_name(child.name)
        if parsed is None:
            continue
        scanned += 1
        if parsed >= cutoff:
            kept += 1
            continue
        files, size = _dir_size(child)
        _remove_dir(child)
        removed_dirs += 1
        removed_files += files
        removed_bytes += size
    return scanned, removed_dirs, removed_files, removed_bytes, kept


def prune_logs(
    log_root: Path | str,
    *,
    keep_days: int = DEFAULT_KEEP_DAYS,
    today: date | None = None,
) -> PruneReport:
    """Delete date-directories older than `today - (keep_days - 1)` in every source.

    `today` defaults to UTC today; tests pin it. Root missing = no-op report.
    """
    if keep_days < 1:
        raise AppError(
            ErrorCode.E_CLI_PREFLIGHT_FAILED,
            f"keep_days must be >= 1, got {keep_days}",
            details={"KeepDays": keep_days},
        )
    root = Path(log_root)
    ref = today or _today_utc()
    cutoff = ref - timedelta(days=keep_days - 1)
    totals = [0, 0, 0, 0, 0]
    if not root.exists():
        return PruneReport(0, 0, 0, 0, 0, cutoff.strftime("%Y-%m-%d"))
    for source_dir in sorted(root.iterdir()):
        if not source_dir.is_dir() or source_dir.name in _RESERVED_DIRS:
            continue
        result = _prune_source(source_dir, cutoff)
        totals = [a + b for a, b in zip(totals, result)]
    return PruneReport(
        ScannedDirs=totals[0],
        RemovedDirs=totals[1],
        RemovedFiles=totals[2],
        RemovedBytes=totals[3],
        KeptDirs=totals[4],
        CutoffDate=cutoff.strftime("%Y-%m-%d"),
    )


__all__ = ["DEFAULT_KEEP_DAYS", "PruneReport", "prune_logs"]
