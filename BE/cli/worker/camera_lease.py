"""Plan 90 Step 45 - cross-invocation camera lease.

Anchors:
- `spec/21-app/74-worker-cli.md` §Subcommands (`open`, `close`, single-open
  invariant) and §Acceptance #3 (conflicting `open` returns envelope with
  `E_BE_CONFLICT`; `close` is idempotent).
- `BE.sdk_facade.camera.InMemoryCameraFacade.open` already enforces the
  invariant WITHIN one process via `E_BE_CONFLICT`; a CLI process is
  short-lived and cannot itself hold state across invocations, so the
  cross-invocation invariant lives in a lease file under `APP_DATA_ROOT`.

File layout: ``<APP_DATA_ROOT>/worker/camera.lease.json``

Payload (PascalCase per spec 03 §Universal Envelope conventions):
    {"Serial": <str>, "Pid": <int>, "RunId": <str>, "AcquiredAt": <isoZ>}

Contract:
- `acquire(serial, pid, run_id)`
  * Creates the lease atomically (`O_CREAT|O_EXCL`) when absent.
  * If present and the recorded PID is dead (see `_pid_alive`), the lease
    is treated as stale, removed, and re-acquired. Logged as
    `lease.reclaimed` by callers.
  * If present with a live PID:
      - same serial -> idempotent success (returns existing lease).
      - different serial -> raises `AppError(E_BE_CONFLICT)` with details
        naming the holding PID and serial.
- `release(expected_serial=None)`
  * Idempotent: missing lease is a no-op.
  * If `expected_serial` is provided and mismatches, raises
    `AppError(E_BE_CONFLICT)` so callers can't accidentally release
    someone else's device.
- `peek()` returns the parsed lease dict or `None`.

Threading / crash safety:
- Atomic create via `O_EXCL` on POSIX and Windows (Python's `os.open`
  maps `O_EXCL` to the equivalent NT flag).
- We never do read-modify-write on the file; a re-acquire is always
  unlink-then-create-exclusive under the parent-directory lock discipline
  callers apply (single writer per host is the invariant we're proving).
"""

from __future__ import annotations

import contextlib
import json
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

LEASE_FILENAME = "camera.lease.json"
LEASE_SUBDIR = "worker"


@dataclass(frozen=True, slots=True)
class Lease:
    Serial: str
    Pid: int
    RunId: str
    AcquiredAt: str

    def to_json(self) -> str:
        return json.dumps(
            {"Serial": self.Serial, "Pid": self.Pid, "RunId": self.RunId, "AcquiredAt": self.AcquiredAt},
            separators=(",", ":"),
            sort_keys=True,
        )

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Lease:
        return cls(Serial=str(d["Serial"]), Pid=int(d["Pid"]), RunId=str(d["RunId"]), AcquiredAt=str(d["AcquiredAt"]))


def lease_path(data_root: Path) -> Path:
    return data_root / LEASE_SUBDIR / LEASE_FILENAME


def _pid_alive(pid: int) -> bool:
    """Best-effort liveness check. Returns True on ambiguous errors so we
    never silently steal a lease held by a running peer."""
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        # Process exists but we can't signal it -> assume alive.
        return True
    except OSError:
        # Windows os.kill raises OSError for missing PID.
        return False


def peek(data_root: Path) -> Lease | None:
    p = lease_path(data_root)
    if not p.exists():
        return None
    try:
        return Lease.from_dict(json.loads(p.read_text(encoding="utf-8")))
    except (json.JSONDecodeError, KeyError, ValueError) as exc:
        raise AppError(
            ErrorCode.E_CLI_PREFLIGHT_FAILED,
            f"corrupt camera lease at {p}",
            details={"Path": str(p), "Reason": str(exc)},
        ) from exc


def acquire(data_root: Path, *, serial: str, pid: int, run_id: str) -> tuple[Lease, bool]:
    """Acquire (or reclaim) the single-camera lease.

    Returns:
        (lease, reclaimed) where `reclaimed=True` iff the previous holder
        was dead and the lease was stolen from a stale file.
    """
    p = lease_path(data_root)
    p.parent.mkdir(parents=True, exist_ok=True)
    reclaimed = False

    existing = peek(data_root)
    if existing is not None:
        if existing.Serial == serial and _pid_alive(existing.Pid):
            # Idempotent: same holder / same serial.
            return existing, False
        if _pid_alive(existing.Pid):
            raise AppError(
                ErrorCode.E_BE_CONFLICT,
                f"camera {existing.Serial!r} is held by pid {existing.Pid} (requested {serial!r})",
                details={
                    "HeldSerial": existing.Serial,
                    "HeldPid": existing.Pid,
                    "HeldRunId": existing.RunId,
                    "RequestedSerial": serial,
                },
            )
        # Stale lease: dead PID. Unlink and fall through to exclusive create.
        try:
            p.unlink()
            reclaimed = True
        except FileNotFoundError:
            pass

    new_lease = Lease(
        Serial=serial,
        Pid=pid,
        RunId=run_id,
        AcquiredAt=datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
    )
    try:
        fd = os.open(str(p), os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError as exc:
        # Race: another process just created it. Re-peek to give the
        # accurate conflict details.
        current = peek(data_root)
        held_serial = current.Serial if current else "unknown"
        held_pid = current.Pid if current else -1
        raise AppError(
            ErrorCode.E_BE_CONFLICT,
            f"camera lease race lost: {held_serial!r} held by pid {held_pid}",
            details={"HeldSerial": held_serial, "HeldPid": held_pid, "RequestedSerial": serial},
        ) from exc
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        fh.write(new_lease.to_json())
    return new_lease, reclaimed


def release(data_root: Path, *, expected_serial: str | None = None) -> Lease | None:
    """Release the lease. Idempotent: returns None if nothing was held.

    Raises `E_BE_CONFLICT` if `expected_serial` is set and does not match
    the currently held lease.
    """
    current = peek(data_root)
    if current is None:
        return None
    if expected_serial is not None and current.Serial != expected_serial:
        raise AppError(
            ErrorCode.E_BE_CONFLICT,
            f"refusing to release {current.Serial!r}; caller expected {expected_serial!r}",
            details={"HeldSerial": current.Serial, "ExpectedSerial": expected_serial},
        )
    with contextlib.suppress(FileNotFoundError):
        lease_path(data_root).unlink()
    return current


__all__ = ["Lease", "LEASE_FILENAME", "LEASE_SUBDIR", "acquire", "lease_path", "peek", "release"]
