"""File-based IPC producer/consumer.

Implements `spec/21-app/76-cli-log-and-ipc.md` §"IPC protocol": one message
per file at `<APP_IPC_ROOT>/<dir>/<ulid>.msg.json`, written atomically via
`<ulid>.tmp` then `os.replace`. Consumers rename to `.msg.ack.json` after
processing.

Public surface (per Plan 90 Step 23):

- `send(root, dir, kind, payload, *, run_id, from_, to, seq=0, envelope=None)`
- `receive(root, dir, kind_filter=None)`
- `ack(path)`

All validation failures raise `AppError` with `E_IPC_*` codes. No fallbacks,
no silent skips: an invalid Kind or non-PascalCase / non-JSON-safe payload
is a programmer error and must surface at the boundary.
"""

from __future__ import annotations

import json
import os
import re
import secrets
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Iterator, Mapping

from pydantic import BaseModel, ValidationError

from BE.cli.common.ipc_models import PAYLOAD_MODELS
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

# --- Kind registry -----------------------------------------------------------

# Single source of truth: typed models drive known Kinds; `Error` is
# envelope-only per spec §"Payload shapes" line 114.
KINDS: frozenset[str] = frozenset(set(PAYLOAD_MODELS.keys()) | {"Error"})

_PASCAL_KEY = re.compile(r"^[A-Z][A-Za-z0-9]*$")
_DIR_NAME = re.compile(r"^[a-z][a-z0-9\-]*$")


@dataclass(frozen=True)
class Message:
    """A parsed IPC message with its on-disk path (for ack)."""

    path: Path
    msg_id: str
    kind: str
    from_: str
    to: str
    run_id: str
    seq: int
    ts: str
    payload: dict[str, Any] | None
    envelope: dict[str, Any] | None


# --- Helpers -----------------------------------------------------------------


def _ulid() -> str:
    """Monotonic-ish 26-char id: 16 hex of time_ns + 10 hex of entropy."""
    return f"{time.time_ns():016x}{secrets.token_hex(5)}"


def _iso_utc() -> str:
    return (
        datetime.now(timezone.utc)
        .isoformat(timespec="microseconds")
        .replace("+00:00", "Z")
    )


def _validate_payload_keys(payload: Mapping[str, Any], path: str = "") -> None:
    for k, v in payload.items():
        if not isinstance(k, str) or not _PASCAL_KEY.match(k):
            raise AppError(
                ErrorCode.E_IPC_PAYLOAD_INVALID,
                f"Payload key must be PascalCase alphanumeric: {path}{k!r}",
                details={"Key": str(k), "Path": path or "<root>"},
            )
        if isinstance(v, Mapping):
            _validate_payload_keys(v, path=f"{path}{k}.")
        elif isinstance(v, (list, tuple)):
            for i, item in enumerate(v):
                if isinstance(item, Mapping):
                    _validate_payload_keys(item, path=f"{path}{k}[{i}].")


def _ensure_json_safe(obj: Any) -> None:
    try:
        json.dumps(obj, allow_nan=False)
    except (TypeError, ValueError) as e:
        raise AppError(
            ErrorCode.E_IPC_PAYLOAD_INVALID,
            f"Payload not JSON-serializable: {e}",
            details={"Reason": str(e)},
        ) from e


# --- Public API --------------------------------------------------------------


def send(
    root: Path,
    dir: str,
    kind: str,
    payload: Mapping[str, Any] | None,
    *,
    run_id: str,
    from_: str,
    to: str,
    seq: int = 0,
    envelope: Mapping[str, Any] | None = None,
) -> Path:
    """Write one IPC message atomically. Returns the final `.msg.json` path."""
    if kind not in KINDS:
        raise AppError(
            ErrorCode.E_IPC_UNKNOWN_KIND,
            f"Unknown IPC Kind: {kind!r}",
            details={"Kind": str(kind), "Known": sorted(KINDS)},
        )
    if not isinstance(dir, str) or not _DIR_NAME.match(dir):
        raise AppError(
            ErrorCode.E_IPC_PAYLOAD_INVALID,
            f"IPC drop-dir name invalid: {dir!r}",
            details={"Dir": str(dir)},
        )

    # Error messages carry the envelope only; payload MUST be null.
    if kind == "Error":
        if payload not in (None, {}):
            raise AppError(
                ErrorCode.E_IPC_PAYLOAD_INVALID,
                "Kind=Error requires Payload=null",
                details={"Kind": kind},
            )
        payload_out: dict[str, Any] | None = None
    else:
        model_cls = PAYLOAD_MODELS[kind]
        # Accept a typed model instance OR a raw mapping. Both go through the
        # Pydantic model so field types, PascalCase spelling, and extra-field
        # rejection are enforced identically.
        if isinstance(payload, BaseModel):
            if not isinstance(payload, model_cls):
                raise AppError(
                    ErrorCode.E_IPC_PAYLOAD_INVALID,
                    f"Payload model mismatch: got "
                    f"{type(payload).__name__}, expected {model_cls.__name__}",
                    details={
                        "Kind": kind,
                        "Got": type(payload).__name__,
                        "Expected": model_cls.__name__,
                    },
                )
            model = payload
        elif isinstance(payload, Mapping):
            _validate_payload_keys(payload)
            try:
                model = model_cls.model_validate(dict(payload))
            except ValidationError as e:
                raise AppError(
                    ErrorCode.E_IPC_PAYLOAD_INVALID,
                    f"Payload does not match {model_cls.__name__}: {e}",
                    details={"Kind": kind, "Errors": e.errors()},
                ) from e
        else:
            raise AppError(
                ErrorCode.E_IPC_PAYLOAD_INVALID,
                f"Payload must be a mapping or {model_cls.__name__} for "
                f"Kind={kind}",
                details={"Kind": kind, "PayloadType": type(payload).__name__},
            )
        payload_out = model.model_dump(mode="json")
        _ensure_json_safe(payload_out)

    if envelope is not None:
        _ensure_json_safe(envelope)

    msg_id = _ulid()
    record = {
        "MsgId": msg_id,
        "Kind": kind,
        "From": from_,
        "To": to,
        "RunId": run_id,
        "Seq": int(seq),
        "Ts": _iso_utc(),
        "Payload": payload_out,
        "Envelope": dict(envelope) if envelope is not None else None,
    }
    body = json.dumps(record, ensure_ascii=False, allow_nan=False)

    drop = root / dir
    try:
        drop.mkdir(parents=True, exist_ok=True)
        tmp = drop / f"{msg_id}.tmp"
        final = drop / f"{msg_id}.msg.json"
        with open(tmp, "w", encoding="utf-8", newline="\n") as f:
            f.write(body)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, final)
        return final
    except OSError as e:
        raise AppError(
            ErrorCode.E_IPC_WRITE_FAILED,
            f"IPC write failed under {drop}: {e}",
            details={"Dir": str(drop), "Errno": getattr(e, "errno", None)},
        ) from e


def receive(
    root: Path,
    dir: str,
    kind_filter: Iterable[str] | None = None,
) -> Iterator[Message]:
    """Yield un-acked messages in the drop-dir, oldest first.

    Unknown-kind files and malformed JSON raise `AppError` immediately so
    corruption cannot be silently skipped.
    """
    if not isinstance(dir, str) or not _DIR_NAME.match(dir):
        raise AppError(
            ErrorCode.E_IPC_PAYLOAD_INVALID,
            f"IPC drop-dir name invalid: {dir!r}",
            details={"Dir": str(dir)},
        )
    drop = root / dir
    if not drop.exists():
        return
    kf = frozenset(kind_filter) if kind_filter is not None else None
    if kf is not None:
        unknown = kf - KINDS
        if unknown:
            raise AppError(
                ErrorCode.E_IPC_UNKNOWN_KIND,
                f"kind_filter references unknown Kinds: {sorted(unknown)}",
                details={"Unknown": sorted(unknown)},
            )
    paths = sorted(drop.glob("*.msg.json"), key=lambda p: p.name)
    for p in paths:
        try:
            with open(p, "r", encoding="utf-8") as f:
                record = json.load(f)
        except (OSError, json.JSONDecodeError) as e:
            raise AppError(
                ErrorCode.E_IPC_PAYLOAD_INVALID,
                f"IPC message unreadable: {p.name}: {e}",
                details={"Path": str(p)},
            ) from e
        kind = record.get("Kind")
        if kind not in KINDS:
            raise AppError(
                ErrorCode.E_IPC_UNKNOWN_KIND,
                f"IPC message has unknown Kind: {kind!r}",
                details={"Path": str(p), "Kind": str(kind)},
            )
        if kf is not None and kind not in kf:
            continue
        yield Message(
            path=p,
            msg_id=record.get("MsgId", ""),
            kind=kind,
            from_=record.get("From", ""),
            to=record.get("To", ""),
            run_id=record.get("RunId", ""),
            seq=int(record.get("Seq", 0)),
            ts=record.get("Ts", ""),
            payload=record.get("Payload"),
            envelope=record.get("Envelope"),
        )


def ack(path: Path) -> Path:
    """Rename `<ulid>.msg.json` to `<ulid>.msg.ack.json`. Idempotent-ish:
    a missing source that already has the `.ack.json` sibling is a no-op."""
    if path.suffixes[-2:] != [".msg", ".json"]:
        raise AppError(
            ErrorCode.E_IPC_PAYLOAD_INVALID,
            f"ack expects a .msg.json path, got {path.name!r}",
            details={"Path": str(path)},
        )
    ack_path = path.with_name(path.name[: -len(".msg.json")] + ".msg.ack.json")
    if not path.exists() and ack_path.exists():
        return ack_path
    try:
        os.replace(path, ack_path)
    except OSError as e:
        raise AppError(
            ErrorCode.E_IPC_WRITE_FAILED,
            f"IPC ack rename failed: {e}",
            details={"Path": str(path), "Errno": getattr(e, "errno", None)},
        ) from e
    return ack_path


# --- Step 25: 24h retention for acked messages -------------------------------


@dataclass(frozen=True)
class IpcPruneReport:
    """Summary of a prune_ipc() sweep; safe to embed in a log line."""

    ScannedDirs: int
    RemovedAckFiles: int
    RemovedTmpFiles: int
    RemovedBytes: int
    CutoffTs: str


DEFAULT_ACK_MAX_AGE_HOURS = 24


def prune_ipc(
    ipc_root: Path | str,
    *,
    max_age_hours: float = DEFAULT_ACK_MAX_AGE_HOURS,
    now: datetime | None = None,
) -> IpcPruneReport:
    """Delete `.msg.ack.json` files older than `max_age_hours` under every
    drop-dir of `ipc_root`, plus any stale `.tmp` residue from a crashed
    writer (older than the same cutoff). Live `.msg.json` files are NEVER
    touched: they are the unread queue.

    Anchor: `spec/21-app/76-cli-log-and-ipc.md` line 107 (24h retention for
    acked messages).

    Raises `AppError(E_IPC_WRITE_FAILED)` on any OSError so `doctor` can
    surface it through the Universal Envelope.
    """
    if max_age_hours <= 0:
        raise AppError(
            ErrorCode.E_CLI_PREFLIGHT_FAILED,
            f"max_age_hours must be > 0, got {max_age_hours}",
            details={"MaxAgeHours": max_age_hours},
        )
    root = Path(ipc_root)
    ref = now or datetime.now(timezone.utc)
    cutoff_ts = ref.timestamp() - (max_age_hours * 3600.0)
    scanned = removed_ack = removed_tmp = removed_bytes = 0
    if not root.exists():
        return IpcPruneReport(0, 0, 0, 0, ref.isoformat().replace("+00:00", "Z"))
    for drop in sorted(root.iterdir()):
        if not drop.is_dir():
            continue
        if not _DIR_NAME.match(drop.name):
            # Unknown top-level dir under IPC root: leave it alone. Never
            # rm outside directories that look like our drop-dirs.
            continue
        scanned += 1
        for entry in drop.iterdir():
            if not entry.is_file():
                continue
            name = entry.name
            is_ack = name.endswith(".msg.ack.json")
            is_tmp = name.endswith(".tmp")
            if not (is_ack or is_tmp):
                continue
            try:
                st = entry.stat()
            except OSError as e:
                raise AppError(
                    ErrorCode.E_IPC_WRITE_FAILED,
                    f"stat failed for {entry}: {e}",
                    details={"Path": str(entry)},
                ) from e
            if st.st_mtime >= cutoff_ts:
                continue
            size = st.st_size
            try:
                entry.unlink()
            except OSError as e:
                raise AppError(
                    ErrorCode.E_IPC_WRITE_FAILED,
                    f"unlink failed for {entry}: {e}",
                    details={"Path": str(entry)},
                ) from e
            removed_bytes += size
            if is_ack:
                removed_ack += 1
            else:
                removed_tmp += 1
    return IpcPruneReport(
        ScannedDirs=scanned,
        RemovedAckFiles=removed_ack,
        RemovedTmpFiles=removed_tmp,
        RemovedBytes=removed_bytes,
        CutoffTs=datetime.fromtimestamp(cutoff_ts, tz=timezone.utc)
        .isoformat()
        .replace("+00:00", "Z"),
    )
