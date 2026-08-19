"""Plan 90 Step 17 - session index writer/reader.

Anchor: `spec/21-app/76-cli-log-and-ipc.md` §"Index file":

    <APP_LOG_ROOT>/index/current.json  (rolling Sessions[] registry)
    <APP_LOG_ROOT>/index/current.json.lock  (mutex, spec 76)

Shape (spec 76, PascalCase, exact):

    { "Sessions": [
        {"RunId","Source","Subcmd","Pid","StartedAt","EndedAt","ExitCode","LogPath"}
      ]
    }

Concurrency model:
- Portable lock via `O_CREAT | O_EXCL` on `current.json.lock` holding the
  owner PID. Works on Windows and POSIX without `fcntl`/`msvcrt` divergence.
- Stale-lock policy: if the lockfile is older than `stale_seconds` AND the
  PID it names is not alive, we steal it. Otherwise wait up to `timeout`.
  Timeout -> `E_LOG_INDEX_LOCKED`.
- Atomic write: temp file + `os.replace`. No partial JSON is ever visible.

The module owns two verbs:
- `open_session(...)`  -> appends a `SessionRef` with `EndedAt=None`.
- `close_session(...)` -> flips `EndedAt` + `ExitCode` on the matching row.

`read_sessions(root)` is the read side used by `doctor` (Step 41) and the
UI Sessions route (Step 131).
"""

from __future__ import annotations

import contextlib
import json
import os
import time
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

INDEX_DIRNAME = "index"
INDEX_FILE = "current.json"
LOCK_FILE = "current.json.lock"
DEFAULT_TIMEOUT_S = 5.0
DEFAULT_STALE_S = 30.0


@dataclass(slots=True)
class SessionRef:
    RunId: str
    Source: str
    Subcmd: str
    Pid: int
    StartedAt: str
    LogPath: str
    EndedAt: str | None = None
    ExitCode: int | None = None

    def to_json(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class IndexPaths:
    root: Path
    index: Path = field(init=False)
    lock: Path = field(init=False)

    def __post_init__(self) -> None:
        d = self.root / INDEX_DIRNAME
        self.index = d / INDEX_FILE
        self.lock = d / LOCK_FILE


def _paths(log_root: Path | str) -> IndexPaths:
    return IndexPaths(root=Path(log_root))


def _utc_now_iso() -> str:
    now = datetime.now(UTC)
    return now.strftime("%Y-%m-%dT%H:%M:%S.") + f"{now.microsecond // 1000:03d}Z"


def _pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except OSError:
        return False
    return True


def _try_create_lock(lock_path: Path, owner_pid: int) -> bool:
    try:
        fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
    except FileExistsError:
        return False
    except OSError as exc:
        raise AppError(
            ErrorCode.E_LOG_ROOT_UNWRITABLE,
            f"Cannot create lock {lock_path}: {exc}",
            details={"Path": str(lock_path)},
        ) from exc
    with os.fdopen(fd, "w") as fp:
        fp.write(str(owner_pid))
    return True


def _is_lock_stale(lock_path: Path, stale_seconds: float) -> bool:
    try:
        st = lock_path.stat()
    except FileNotFoundError:
        return False
    if time.time() - st.st_mtime < stale_seconds:
        return False
    try:
        owner = int(lock_path.read_text(encoding="utf-8").strip() or "0")
    except (OSError, ValueError):
        return True
    return not _pid_alive(owner)


def _acquire_lock(paths: IndexPaths, timeout: float, stale_seconds: float) -> None:
    paths.index.parent.mkdir(parents=True, exist_ok=True)
    deadline = time.monotonic() + timeout
    owner_pid = os.getpid()
    while True:
        if _try_create_lock(paths.lock, owner_pid):
            return
        if _is_lock_stale(paths.lock, stale_seconds):
            with contextlib.suppress(FileNotFoundError):
                paths.lock.unlink()
            continue
        if time.monotonic() >= deadline:
            raise AppError(
                ErrorCode.E_LOG_INDEX_LOCKED,
                f"Timed out after {timeout}s waiting for {paths.lock}",
                details={"Path": str(paths.lock), "TimeoutSeconds": timeout},
            )
        time.sleep(0.05)


def _release_lock(paths: IndexPaths) -> None:
    try:
        paths.lock.unlink()
    except FileNotFoundError:
        pass
    except OSError as exc:
        raise AppError(
            ErrorCode.E_LOG_ROOT_UNWRITABLE,
            f"Cannot release lock {paths.lock}: {exc}",
            details={"Path": str(paths.lock)},
        ) from exc


def _load(paths: IndexPaths) -> dict[str, Any]:
    if not paths.index.exists():
        return {"Sessions": []}
    try:
        data = json.loads(paths.index.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise AppError(
            ErrorCode.E_LOG_ROOT_UNWRITABLE,
            f"Corrupt index at {paths.index}: {exc}",
            details={"Path": str(paths.index)},
        ) from exc
    if not isinstance(data, dict) or not isinstance(data.get("Sessions"), list):
        raise AppError(
            ErrorCode.E_LOG_ROOT_UNWRITABLE,
            f"Index shape invalid at {paths.index}",
            details={"Path": str(paths.index)},
        )
    return data


def _atomic_write(paths: IndexPaths, data: dict[str, Any]) -> None:
    tmp = paths.index.with_suffix(".json.tmp")
    payload = json.dumps(data, ensure_ascii=False, indent=2)
    tmp.write_text(payload, encoding="utf-8")
    os.replace(tmp, paths.index)


def _mutate(
    log_root: Path | str,
    fn,
    *,
    timeout: float = DEFAULT_TIMEOUT_S,
    stale_seconds: float = DEFAULT_STALE_S,
) -> Any:
    paths = _paths(log_root)
    _acquire_lock(paths, timeout, stale_seconds)
    try:
        data = _load(paths)
        result = fn(data)
        _atomic_write(paths, data)
        return result
    finally:
        _release_lock(paths)


def open_session(
    log_root: Path | str,
    *,
    source: str,
    subcmd: str,
    pid: int,
    run_id: str,
    log_path: Path | str,
    timeout: float = DEFAULT_TIMEOUT_S,
    stale_seconds: float = DEFAULT_STALE_S,
) -> SessionRef:
    """Append a new session entry to the index. Returns the SessionRef written."""
    ref = SessionRef(
        RunId=run_id,
        Source=source,
        Subcmd=subcmd,
        Pid=pid,
        StartedAt=_utc_now_iso(),
        LogPath=str(log_path),
    )

    def _apply(data: dict[str, Any]) -> None:
        if any(s.get("RunId") == run_id for s in data["Sessions"]):
            raise AppError(
                ErrorCode.E_LOG_INDEX_LOCKED,
                f"RunId {run_id} already present in index",
                details={"RunId": run_id},
            )
        data["Sessions"].append(ref.to_json())

    _mutate(log_root, _apply, timeout=timeout, stale_seconds=stale_seconds)
    return ref


def close_session(
    log_root: Path | str,
    *,
    run_id: str,
    exit_code: int,
    timeout: float = DEFAULT_TIMEOUT_S,
    stale_seconds: float = DEFAULT_STALE_S,
) -> SessionRef:
    """Set EndedAt + ExitCode on the matching row. Returns the updated row."""

    def _apply(data: dict[str, Any]) -> dict[str, Any]:
        for row in data["Sessions"]:
            if row.get("RunId") == run_id:
                row["EndedAt"] = _utc_now_iso()
                row["ExitCode"] = int(exit_code)
                return row
        raise AppError(
            ErrorCode.E_CLI_PREFLIGHT_FAILED,
            f"RunId {run_id} not found in index",
            details={"RunId": run_id},
        )

    row = _mutate(log_root, _apply, timeout=timeout, stale_seconds=stale_seconds)
    return SessionRef(**row)


def read_sessions(log_root: Path | str) -> list[SessionRef]:
    """Read side. No lock: JSON is written atomically via `os.replace`."""
    paths = _paths(log_root)
    if not paths.index.exists():
        return []
    data = _load(paths)
    return [SessionRef(**row) for row in data["Sessions"]]


__all__ = [
    "DEFAULT_STALE_S",
    "DEFAULT_TIMEOUT_S",
    "INDEX_DIRNAME",
    "INDEX_FILE",
    "LOCK_FILE",
    "SessionRef",
    "close_session",
    "open_session",
    "read_sessions",
]
