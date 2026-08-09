"""Dispatcher filesystem lifecycle (spec 15 §Recovery, §Terminal moves).

Owns the one-writer invariant for `inflight/`, `processed/`, `failed/`.
All transitions use `os.replace` for atomicity. `reclaim_on_boot` is the
only legal `inflight → pending` transition, per spec 15 line 55–57.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

from app.capture.pending_writer import PART_SUFFIX
from app.core.errors.codes import ErrorCode

log = logging.getLogger(__name__)

INFLIGHT_DIR_NAME = "inflight"
PROCESSED_DIR_NAME = "processed"
FAILED_DIR_NAME = "failed"


class DispatcherLifecycleError(RuntimeError):
    code = ErrorCode.E_DISPATCH_LIFECYCLE_MOVE


class DispatcherReclaimError(RuntimeError):
    code = ErrorCode.E_DISPATCH_RECLAIM


def _atomic_move(src: Path, dst_dir: Path, tag: str) -> Path:
    dst_dir.mkdir(parents=True, exist_ok=True)
    dst = dst_dir / src.name
    try:
        os.replace(src, dst)
    except OSError as err:
        log.error("dispatcher.lifecycle.moveFailed tag=%s src=%s dst=%s err=%s", tag, src, dst, err)
        raise DispatcherLifecycleError(f"{tag}: {src} → {dst}") from err
    log.debug("dispatcher.lifecycle.move tag=%s file=%s", tag, src.name)
    return dst


def move_to_inflight(pending_path: Path, inflight_dir: Path) -> Path:
    """pending/<file> → inflight/<file>. Sole legal writer to inflight/."""
    return _atomic_move(pending_path, inflight_dir, tag="pending→inflight")


def mark_processed(inflight_path: Path, processed_dir: Path) -> Path:
    """inflight/<file> → processed/<file>. Terminal OK (spec 15 §36)."""
    return _atomic_move(inflight_path, processed_dir, tag="inflight→processed")


def mark_failed(inflight_path: Path, failed_dir: Path) -> Path:
    """inflight/<file> → failed/<file>. Terminal NG (spec 15 §37, §51-54)."""
    return _atomic_move(inflight_path, failed_dir, tag="inflight→failed")


def reclaim_on_boot(inflight_dir: Path, pending_dir: Path) -> list[Path]:
    """Rename every inflight/<file> back to pending/. Idempotent (spec 15 §57)."""
    if inflight_dir.exists() is False:
        return []
    reclaimed: list[Path] = []
    for orphan in sorted(inflight_dir.iterdir(), key=lambda p: p.name):
        if orphan.name.endswith(PART_SUFFIX):
            continue
        reclaimed.append(_reclaim_one(orphan, pending_dir))
    log.info("dispatcher.lifecycle.reclaim count=%d", len(reclaimed))
    return reclaimed


def _reclaim_one(orphan: Path, pending_dir: Path) -> Path:
    pending_dir.mkdir(parents=True, exist_ok=True)
    dst = pending_dir / orphan.name
    try:
        os.replace(orphan, dst)
    except OSError as err:
        log.error("dispatcher.lifecycle.reclaimFailed src=%s err=%s", orphan, err)
        raise DispatcherReclaimError(f"reclaim: {orphan}") from err
    return dst
