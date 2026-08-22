"""Plan 90 Step 71 - enumerate CLI session log files on disk.

Anchor: `spec/21-app/76-cli-log-and-ipc.md` §Layout. Complements the
Root-DB-backed `/observability/sessions` route (Step 72) which only sees
invocations that reached the DB writer. This reader answers the honest
question "what JSONL files actually exist under `APP_LOG_ROOT`?" so the
CLI-observability UI (Steps 75-77) can surface sessions even when the
Root-DB tier is unavailable, wedged, or lagging behind the writer.

Filename contract (from `BE/cli/common/logger.py:52`):
    <APP_LOG_ROOT>/<source>/YYYY-MM-DD/HHMMSS-<pid>-<subcmd>.jsonl

`RunId` is peeked from the first JSONL line (the writer emits it on every
record, so any non-empty session has it in line 1). Peek failures are
recorded as `RunId=None` rather than swallowed: we never fabricate a RunId
and we never drop the session from the listing.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import asdict, dataclass
from pathlib import Path

logger = logging.getLogger("BE.cli.common.log_reader")

_KNOWN_SOURCES: tuple[str, ...] = ("worker-cli", "processing-cli", "be")
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_FILE_RE = re.compile(r"^(?P<hms>\d{6})-(?P<pid>\d+)-(?P<subcmd>[A-Za-z0-9_.-]+)\.jsonl$")
_RESERVED_DIRS = frozenset({"index"})


@dataclass(frozen=True, slots=True)
class SessionSummary:
    Source: str
    Date: str        # YYYY-MM-DD
    StartedAt: str   # ISO-8601 UTC, HHMMSS resolution, no ms
    Pid: int
    Subcmd: str
    LogPath: str     # absolute, POSIX-normalised
    RunId: str | None
    SizeBytes: int

    def to_wire(self) -> dict:
        return asdict(self)


def _peek_run_id(path: Path) -> str | None:
    """Read the first non-empty JSONL line and return its `RunId`.

    Returns `None` (never raises) on any read/parse failure; the session
    still gets listed with `RunId=None` so operators can see the file
    exists even if it is truncated or corrupt.
    """
    try:
        with path.open("r", encoding="utf-8", errors="replace") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    return None
                rid = obj.get("RunId")
                return rid if isinstance(rid, str) and rid else None
    except OSError as exc:
        logger.warning(
            "log_reader.peek_failed",
            extra={"CorrelationId": None, "operation": "peek_run_id", "Path": str(path), "Reason": str(exc)},
        )
    return None


def list_sessions(
    log_root: Path,
    *,
    source: str | None = None,
    limit: int = 50,
) -> list[SessionSummary]:
    """Enumerate sessions on disk, newest first.

    - Non-existent `log_root` -> empty list (not an error; the writer may
      simply have never run yet on this host).
    - `source` restricts to one CLI folder; unknown source -> empty list
      (never raises; caller validates against the whitelist for 400s).
    - `limit` is clamped to `[1, 500]` by the caller/route; this function
      trusts the bound and does no clamping itself.
    """
    if limit <= 0:
        return []
    if log_root.exists() is False or log_root.is_dir() is False:
        return []

    if source is not None:
        source_dirs = [log_root / source] if (log_root / source).is_dir() else []
    else:
        source_dirs = [
            p for p in log_root.iterdir()
            if p.is_dir() and p.name in _KNOWN_SOURCES
        ]

    found: list[SessionSummary] = []
    for src_dir in source_dirs:
        for date_dir in src_dir.iterdir():
            if date_dir.is_dir() is False or date_dir.name in _RESERVED_DIRS:
                continue
            if not _DATE_RE.match(date_dir.name):
                continue
            for file in date_dir.iterdir():
                if file.is_file() is False:
                    continue
                m = _FILE_RE.match(file.name)
                if m is None:
                    continue
                hms = m.group("hms")
                started_at = f"{date_dir.name}T{hms[0:2]}:{hms[2:4]}:{hms[4:6]}Z"
                try:
                    size = file.stat().st_size
                except OSError:
                    size = 0
                found.append(
                    SessionSummary(
                        Source=src_dir.name,
                        Date=date_dir.name,
                        StartedAt=started_at,
                        Pid=int(m.group("pid")),
                        Subcmd=m.group("subcmd"),
                        LogPath=str(file.resolve()).replace("\\", "/"),
                        RunId=_peek_run_id(file),
                        SizeBytes=size,
                    )
                )

    found.sort(key=lambda s: (s.StartedAt, s.Source, s.Pid), reverse=True)
    return found[:limit]


__all__ = ["SessionSummary", "list_sessions"]
