"""Atomic pending-image writer (spec 14 §Atomicity, §File Naming).

Writes `pending/<seq>.<ext>.part`, fsyncs, then rename-atomic to the final
name. Dispatcher ignores any `.part` suffix.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

log = logging.getLogger(__name__)

PART_SUFFIX = ".part"
SEQ_WIDTH = 9


class PendingWriteError(RuntimeError):
    code = "E_CAP_PENDING_WRITE"


def _seq_name(sequence_no: int, ext: str) -> str:
    if sequence_no < 1:
        raise ValueError(f"sequence_no must be positive: {sequence_no}")
    return f"{sequence_no:0{SEQ_WIDTH}d}.{ext}"


def write_pending(pending_dir: Path, sequence_no: int, ext: str, payload: bytes) -> Path:
    """Write `payload` atomically into `pending_dir`. Returns final path."""
    pending_dir.mkdir(parents=True, exist_ok=True)
    final = pending_dir / _seq_name(sequence_no, ext)
    tmp = final.with_name(final.name + PART_SUFFIX)
    flags = os.O_CREAT | os.O_EXCL | os.O_WRONLY
    try:
        fd = os.open(tmp, flags, 0o644)
    except FileExistsError as err:
        log.error("capture.pending.partCollision path=%s", tmp)
        raise PendingWriteError(f"part exists: {tmp}") from err
    try:
        _flush_and_close(fd, payload)
        os.replace(tmp, final)
    except OSError as err:
        log.error("capture.pending.writeFailed seq=%d err=%s", sequence_no, err)
        _cleanup(tmp)
        raise PendingWriteError(str(err)) from err
    log.debug("capture.pending.wrote path=%s bytes=%d", final, len(payload))
    return final


def _flush_and_close(fd: int, payload: bytes) -> None:
    try:
        os.write(fd, payload)
        os.fsync(fd)
    finally:
        os.close(fd)


def _cleanup(tmp: Path) -> None:
    if tmp.exists() is False:
        return
    try:
        tmp.unlink()
    except OSError as err:
        log.warning("capture.pending.cleanupFailed path=%s err=%s", tmp, err)
