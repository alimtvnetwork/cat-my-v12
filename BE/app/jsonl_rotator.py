"""Plan 90 Step 108 - shared JSONL append + single-generation roll primitive.

Extracted from ``BE/app/install_log_rotator.py`` (Step 107) so any long-lived
JSONL audit stream (installer manifest overflow, future retention loop
summaries, future IPC audit tails) reuses the SAME ordering and durability
guarantees instead of re-deriving them.

Root cause guarded (one sentence): Step 107 baked the roll-first / append-second
/ fsync-per-write policy inside the installer module, so any other subsystem
that wanted the same guarantees had to copy the code (drift risk) or roll its
own weaker version (silent data loss risk).

Design invariants (do not weaken without a spec change):

1. **Roll BEFORE append.** If ``current`` exists and its size >=
   ``max_bytes`` at call time, atomically rename ``current -> previous``
   (replacing any prior ``previous``) BEFORE opening ``current`` for
   append. That guarantees the newly appended rows always land in the
   fresh generation and the size cap is hard, not "eventually".
2. **Append is fsync'd.** Every ``append_and_roll`` call ``flush() +
   fsync()`` the file descriptor before returning, so a power cut after
   return can lose no committed rows.
3. **Neutral errors.** This primitive is dependency-free from the
   installer / retention / IPC error taxonomies: it raises stdlib
   ``OSError`` on I/O trouble and ``ValueError`` on bad input, and lets
   callers wrap those into their own ``AppError`` code (e.g.
   ``E_INSTALL_MANIFEST_UNWRITABLE``). The primitive itself does not
   import ``AppError`` / ``ErrorCode``.
4. **Poison-line safe reads.** ``read_jsonl`` surfaces unparseable lines
   as ``{"_Raw": <line>, "_ParseError": <msg>}`` so a corrupt tail can
   never silently truncate an audit view.
5. **Deterministic order.** ``read_pair`` returns ``previous`` entries
   first (older) then ``current`` (newer). Callers combining these with
   a live tail (e.g. the installer manifest suffix) must append their
   live tail LAST to preserve monotonic time.
6. **Empty inputs are a no-op.** ``append_and_roll`` with zero rows
   never opens the file, never rolls, never fsyncs.
"""

from __future__ import annotations

import json
import os
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Final

__all__ = [
    "RollOutcome",
    "append_and_roll",
    "read_jsonl",
    "read_pair",
]


@dataclass(frozen=True)
class RollOutcome:
    """Outcome of one ``append_and_roll`` call.

    Fields use PascalCase so callers can drop this straight into a
    Universal Envelope ``Data`` block without re-shaping.
    """

    IsRolled: bool
    AppendedCount: int
    BytesAppended: int


_NEWLINE: Final[bytes] = b"\n"


def _validate_max_bytes(max_bytes: int) -> None:
    if isinstance(max_bytes, bool) or not isinstance(max_bytes, int) or max_bytes <= 0:
        raise ValueError(f"max_bytes must be a positive int, got {max_bytes!r}")


def _roll_if_oversize(current: Path, previous: Path, max_bytes: int) -> bool:
    """Rename ``current -> previous`` when current is at/over the cap."""
    if not current.exists():
        return False
    if current.stat().st_size < max_bytes:
        return False
    # ``os.replace`` is atomic on POSIX and Windows; it clobbers any prior
    # single-generation archive on purpose (spec: single-generation ring).
    if previous.exists():
        previous.unlink()
    os.replace(current, previous)
    return True


def append_and_roll(
    current: Path,
    previous: Path,
    rows: Iterable[dict[str, Any]],
    *,
    max_bytes: int,
) -> RollOutcome:
    """Roll ``current`` when oversize, then append ``rows`` as JSONL.

    Raises ``ValueError`` for bad ``max_bytes`` and ``OSError`` for any
    filesystem trouble. Zero rows short-circuits with no I/O.
    """
    _validate_max_bytes(max_bytes)
    row_list = list(rows)
    if not row_list:
        return RollOutcome(IsRolled=False, AppendedCount=0, BytesAppended=0)
    is_rolled = _roll_if_oversize(current, previous, max_bytes)
    current.parent.mkdir(parents=True, exist_ok=True)
    payload = b"".join(
        (json.dumps(r, ensure_ascii=False, sort_keys=True).encode("utf-8") + _NEWLINE)
        for r in row_list
    )
    with open(current, "ab") as f:
        f.write(payload)
        f.flush()
        os.fsync(f.fileno())
    return RollOutcome(
        IsRolled=is_rolled, AppendedCount=len(row_list), BytesAppended=len(payload)
    )


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    """Return one dict per line. Missing file -> []. Bad line -> _ParseError."""
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    out: list[dict[str, Any]] = []
    for line in text.splitlines():
        if not line.strip():
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError as exc:
            out.append({"_Raw": line, "_ParseError": exc.msg})
    return out


def read_pair(current: Path, previous: Path) -> list[dict[str, Any]]:
    """Return ``previous`` entries (older) followed by ``current`` (newer)."""
    return read_jsonl(previous) + read_jsonl(current)
