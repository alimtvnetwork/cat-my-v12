"""Plan 90 Step 110 - Persist per-pass retention outcomes to a rotated JSONL audit stream.

Owning specs:
- ``spec/21-app/78-retention-schedule.md`` §"Observability" (per-pass rows
  must survive process exit so operators can answer "did last night's pass
  run?" without shell-tailing stderr).
- ``spec/21-app/76-cli-log-and-ipc.md`` (JSONL machine-readable audit
  streams; rotate at a bounded size; never lose oldest generation
  silently).

Root cause guarded (one sentence): before Step 110, ``bin/retention-run.py``
returned per-pass outcomes only via stdout/stderr and the in-memory list,
so a crash mid-loop lost every pass since the last envelope and the
future ``GET /observability/retention`` (Step 111) had no source to read.

Design invariants (do not weaken without a spec bump):

1. **Best-effort, never fatal.** ``append_pass`` catches ``OSError`` /
   ``ValueError`` from the primitive, logs ERROR ``retention.audit.write_failed``
   with the path + errno, and returns ``None``. Retention already unlinked
   files and committed the DB deletes; failing the CLI now would strand
   the operator with "did it actually run?" and no answer worse than a
   missing audit row.
2. **One row per pass.** Each call appends exactly one JSONL row so
   ``read_pair`` order == pass order (older previous.log first, then
   current.log). Multi-row writes would break the ordering guarantee
   the reader (``bin/log-tail.py``) relies on.
3. **Rotation ceiling.** ``_MAX_BYTES`` = 1 MiB. At ~400 bytes/row that
   is ~2500 passes/generation, so a daily loop keeps ~7 years of history
   across current + previous before the oldest generation drops. Bigger
   ceilings just delay the same drop; smaller lose recent history.
4. **PascalCase wire keys.** The row shape matches Universal Envelope
   conventions (spec 03 §"Universal Response Envelope") so a future
   ``GET /observability/retention`` can pass rows through unchanged.
5. **UTC ISO-8601 timestamps.** ``TimestampUtc`` is ``YYYY-MM-DDTHH:MM:SSZ``
   so lexical sort == chronological sort inside a generation.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Final

from BE.app.jsonl_rotator import RollOutcome, append_and_roll
from BE.app.retention import RetentionOutcome
from BE.errors.apperror import AppError


__all__ = [
    "AUDIT_FILENAME",
    "PREVIOUS_FILENAME",
    "ALLOWED_MODES",
    "append_pass",
    "append_halt",
    "audit_paths",
    "build_row",
    "build_halt_row",
]


_log = logging.getLogger(__name__)

AUDIT_FILENAME: Final = "retention.log"
PREVIOUS_FILENAME: Final = "retention.log.1"

# 1 MiB per generation, mirrors the installer manifest ceiling in
# ``BE.app.install_log_rotator`` so operators have one number to remember.
_MAX_BYTES: Final = 1 * 1024 * 1024

# The three ``Mode`` values that may appear in a row. Kept here (not in
# the endpoint) so the writer and the reader agree on one source of truth.
# ``single-shot`` / ``loop`` come from ``append_pass``; ``loop-halt`` is
# emitted by ``append_halt`` when the scheduler stops on a domain error.
ALLOWED_MODES: Final = ("single-shot", "loop", "loop-halt")



def audit_paths(logs_root: Path) -> tuple[Path, Path]:
    """Return ``(current, previous)`` under ``logs_root``.

    Callers pass the fully-resolved logs directory (usually
    ``resolve_root("log", ...)``). We deliberately do NOT ``mkdir`` here:
    ``append_and_roll`` handles parent creation, and a read-only status
    endpoint (Step 111) must not create directories as a side effect.
    """
    return logs_root / AUDIT_FILENAME, logs_root / PREVIOUS_FILENAME


def build_row(
    outcome: RetentionOutcome,
    *,
    mode: str,
    pass_index: int,
    timestamp_utc: str | None = None,
) -> dict[str, object]:
    """Serialize one pass into a wire-shape row.

    ``mode`` is ``"single-shot"`` or ``"loop"``; ``pass_index`` is
    1-based (matches the CLI's stderr line numbers).
    """
    if mode not in ("single-shot", "loop"):
        raise ValueError(
            f"mode must be 'single-shot' or 'loop' for build_row, got {mode!r}. "
            "Use build_halt_row for 'loop-halt'."
        )

    if not isinstance(pass_index, int) or pass_index < 1:
        raise ValueError(f"pass_index must be >= 1, got {pass_index!r}.")
    ts = timestamp_utc or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    row: dict[str, object] = {
        "TimestampUtc": ts,
        "Mode": mode,
        "PassIndex": pass_index,
    }
    # Merge the outcome's wire shape; keys are already PascalCase and
    # disjoint from the audit envelope keys above.
    row.update(outcome.to_wire())
    return row


def append_pass(
    logs_root: Path,
    outcome: RetentionOutcome,
    *,
    mode: str,
    pass_index: int,
    timestamp_utc: str | None = None,
) -> RollOutcome | None:
    """Append one pass row to ``retention.log``. Never raises.

    Returns the ``RollOutcome`` on success or ``None`` on I/O failure
    (already logged ERROR). Retention itself already committed; the CLI
    must not exit non-zero just because an audit row failed to persist.
    """
    current, previous = audit_paths(logs_root)
    try:
        row = build_row(
            outcome, mode=mode, pass_index=pass_index, timestamp_utc=timestamp_utc,
        )
        return append_and_roll(current, previous, [row], max_bytes=_MAX_BYTES)
    except (OSError, ValueError) as exc:
        _log.error(
            "retention.audit.write_failed path=%s err=%s",
            current, exc,
        )
        return None


def build_halt_row(
    err: "AppError",
    *,
    pass_index: int,
    timestamp_utc: str | None = None,
) -> dict[str, object]:
    """Serialize a scheduler halt into a wire-shape row.

    Plan 90 Step 112. Emitted by ``bin/retention-run.py`` when
    ``run_scheduled`` returns ``(outcomes, err)`` with ``err is not None``
    so the ``GET /observability/retention`` view (Step 111) can surface
    failed passes alongside successful ones. ``pass_index`` is the 1-based
    index of the pass that failed (typically ``len(outcomes) + 1``).

    Row shape is intentionally disjoint from ``build_row``: no
    ``RetentionOutcome`` fields, and PascalCase error keys mirror the
    Universal Envelope error contract (spec 03) so a downstream renderer
    can format the same way it formats an envelope error.
    """
    if not isinstance(err, AppError):
        raise ValueError(
            f"err must be AppError, got {type(err).__name__}."
        )

    if not isinstance(pass_index, int) or pass_index < 1:
        raise ValueError(f"pass_index must be >= 1, got {pass_index!r}.")
    ts = timestamp_utc or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    details = err.details if isinstance(err.details, dict) else {}
    return {
        "TimestampUtc": ts,
        "Mode": "loop-halt",
        "PassIndex": pass_index,
        "ErrorCode": err.code.name,
        "ErrorMessage": str(err),
        "ErrorDetails": dict(details),
    }


def append_halt(
    logs_root: Path,
    err: "AppError",
    *,
    pass_index: int,
    timestamp_utc: str | None = None,
) -> RollOutcome | None:
    """Append one loop-halt row to ``retention.log``. Never raises.

    Best-effort, symmetric with ``append_pass``: on I/O failure, log ERROR
    ``retention.audit.halt_write_failed`` and return ``None``. The CLI
    is already about to exit non-zero with the original ``AppError``; a
    missing audit row must not change the exit code.
    """
    current, previous = audit_paths(logs_root)
    try:
        row = build_halt_row(err, pass_index=pass_index, timestamp_utc=timestamp_utc)
        return append_and_roll(current, previous, [row], max_bytes=_MAX_BYTES)
    except (OSError, ValueError) as exc:
        _log.error(
            "retention.audit.halt_write_failed path=%s err=%s",
            current, exc,
        )
        return None

