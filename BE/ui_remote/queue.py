"""In-memory packet queue + JSONL audit trail (spec 54).

The backend holds CLI action packets until the frontend hook polls them.
Packets live in process memory (the backend is a local dev service); the
audit trail is durable JSONL so tests can prove what was clicked even
after a restart.

Audit path: `$UI_REMOTE_AUDIT_PATH`, else the OS temp dir. Nothing is
written into the repo tree at runtime.
"""

from __future__ import annotations

import json
import os
import tempfile
import threading
import uuid
from datetime import UTC, datetime
from typing import Any

_LOCK = threading.Lock()
_PENDING: dict[str, dict[str, Any]] = {}
_DONE: dict[str, dict[str, Any]] = {}


def _now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def audit_path() -> str:
    """Audit file location; env override first, temp dir otherwise."""

    override = os.environ.get("UI_REMOTE_AUDIT_PATH")

    if override:
        return override

    return os.path.join(tempfile.gettempdir(), "cat-my-ui-remote-audit.jsonl")


def enqueue(packet: dict[str, Any]) -> dict[str, Any]:
    """Store a new packet as queued and return it with its packet id."""

    stored = dict(packet)
    stored["packetId"] = uuid.uuid4().hex
    stored["status"] = "queued"
    stored["createdAt"] = _now_iso()

    with _LOCK:
        _PENDING[stored["packetId"]] = stored

    return dict(stored)


def pending() -> list[dict[str, Any]]:
    """Queued packets in arrival order."""

    with _LOCK:
        return [dict(p) for p in _PENDING.values()]


def resolve(packet_id: str, result: dict[str, Any]) -> dict[str, Any] | None:
    """Mark a packet done, audit it, and return the completed record."""

    with _LOCK:
        packet = _PENDING.pop(packet_id, None)

    if packet is None:
        return None

    completed = dict(packet)
    completed["status"] = "done"
    completed["result"] = dict(result)
    completed["completedAt"] = _now_iso()

    with _LOCK:
        _DONE[packet_id] = completed

    _append_audit(completed)

    return dict(completed)


def lookup(packet_id: str) -> dict[str, Any] | None:
    """Completed packet, queued packet, or None when unknown."""

    with _LOCK:
        if packet_id in _DONE:
            return dict(_DONE[packet_id])

        if packet_id in _PENDING:
            return dict(_PENDING[packet_id])

    return None


def _append_audit(completed: dict[str, Any]) -> None:
    """Append one audit line; audit failure never masks the result."""

    line = json.dumps(completed, sort_keys=True)

    try:
        with open(audit_path(), "a", encoding="utf-8") as handle:
            handle.write(line + "\n")
    except OSError:
        pass


def audit(limit: int = 50) -> list[dict[str, Any]]:
    """Most recent audit entries, newest last, capped at `limit`."""

    try:
        with open(audit_path(), encoding="utf-8") as handle:
            lines = handle.read().splitlines()
    except OSError:
        return []

    entries: list[dict[str, Any]] = []

    for line in lines[-limit:]:
        try:
            entries.append(json.loads(line))
        except json.JSONDecodeError:
            continue

    return entries
