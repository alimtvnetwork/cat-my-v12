"""Plan 90 Step 46 - cross-invocation streaming state marker.

Anchors:
- `spec/21-app/74-worker-cli.md` §Subcommands (`stream start|stop`).
- `spec/21-app/76-cli-log-and-ipc.md` §Session lifecycle.
- Companion to `BE.cli.worker.camera_lease` (Step 45).

File layout: ``<APP_DATA_ROOT>/worker/stream.state.json``

Payload (PascalCase, spec 03 envelope conventions):
    {"Serial": <str>, "Pid": <int>, "RunId": <str>, "StartedAt": <isoZ>}

The marker records that a streaming session is nominally active on the
lease-holding host so `capture` (Step 47) and future `status` verbs can
observe activity across invocations. The in-memory facade has no
detached grab loop; the marker itself IS the observable state until the
vendor adapter (Phase 12) replaces it with a real PID/handle.

Contract:
- `start(data_root, serial, pid, run_id)` writes the marker atomically
  via `O_CREAT|O_EXCL`. Same-serial re-entry is idempotent and returns
  the existing marker with `already=True`. A different serial while a
  marker exists raises `E_BE_CONFLICT`.
- `stop(data_root, expected_serial=None)` is idempotent. Missing marker
  returns `None`. Mismatched `expected_serial` raises `E_BE_CONFLICT`.
- `peek(data_root)` returns the parsed marker or `None`; corrupt JSON
  raises `E_CLI_PREFLIGHT_FAILED` so operators see the exact path.
"""

from __future__ import annotations

import contextlib
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

MARKER_FILENAME = "stream.state.json"
MARKER_SUBDIR = "worker"


@dataclass(frozen=True, slots=True)
class StreamState:
    Serial: str
    Pid: int
    RunId: str
    StartedAt: str

    def to_json(self) -> str:
        return json.dumps(
            {"Serial": self.Serial, "Pid": self.Pid, "RunId": self.RunId, "StartedAt": self.StartedAt},
            separators=(",", ":"), sort_keys=True,
        )

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> StreamState:
        return cls(
            Serial=str(d["Serial"]), Pid=int(d["Pid"]),
            RunId=str(d["RunId"]), StartedAt=str(d["StartedAt"]),
        )


def marker_path(data_root: Path) -> Path:
    return data_root / MARKER_SUBDIR / MARKER_FILENAME


def peek(data_root: Path) -> StreamState | None:
    p = marker_path(data_root)
    if not p.exists():
        return None
    try:
        return StreamState.from_dict(json.loads(p.read_text(encoding="utf-8")))
    except (json.JSONDecodeError, KeyError, ValueError) as exc:
        raise AppError(
            ErrorCode.E_CLI_PREFLIGHT_FAILED,
            f"corrupt stream marker at {p}",
            details={"Path": str(p), "Reason": str(exc)},
        ) from exc


def start(data_root: Path, *, serial: str, pid: int, run_id: str, started_at: str) -> tuple[StreamState, bool]:
    """Write the streaming marker.

    Returns:
        (state, already) where `already=True` iff a same-serial marker
        already existed (idempotent re-entry).
    """
    p = marker_path(data_root)
    p.parent.mkdir(parents=True, exist_ok=True)

    existing = peek(data_root)
    if existing is not None:
        if existing.Serial == serial:
            return existing, True
        raise AppError(
            ErrorCode.E_BE_CONFLICT,
            f"stream already active on {existing.Serial!r} (requested {serial!r})",
            details={
                "HeldSerial": existing.Serial, "HeldPid": existing.Pid,
                "HeldRunId": existing.RunId, "RequestedSerial": serial,
            },
        )

    state = StreamState(Serial=serial, Pid=pid, RunId=run_id, StartedAt=started_at)
    fd = os.open(str(p), os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    try:
        os.write(fd, state.to_json().encode("utf-8"))
    finally:
        os.close(fd)
    return state, False


def stop(data_root: Path, *, expected_serial: str | None = None) -> StreamState | None:
    """Clear the marker. Idempotent."""
    existing = peek(data_root)
    if existing is None:
        return None
    if expected_serial is not None and existing.Serial != expected_serial:
        raise AppError(
            ErrorCode.E_BE_CONFLICT,
            f"stream marker holds {existing.Serial!r}, refuse to stop as {expected_serial!r}",
            details={"HeldSerial": existing.Serial, "ExpectedSerial": expected_serial},
        )
    with contextlib.suppress(FileNotFoundError):
        marker_path(data_root).unlink()
    return existing


__all__ = ["StreamState", "marker_path", "peek", "start", "stop", "MARKER_FILENAME", "MARKER_SUBDIR"]
