"""Dispatcher assignment loop skeleton (spec 11, 13, 15).

Watches `pending/` for atomically-renamed images and assigns them round-robin
to workers with `inFlight < BatchSize`. Ignores any file ending in `.part`.
Full inotify wiring and IPC transport land in M4/M5; this file locks the
public API and the round-robin invariant.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

from app.capture.pending_writer import PART_SUFFIX
from app.dispatcher.lifecycle import DispatcherLifecycleError, move_to_inflight

log = logging.getLogger(__name__)



@dataclass
class WorkerSlot:
    worker_id: int
    batch_size: int
    in_flight: int = 0


@dataclass
class DispatchState:
    workers: list[WorkerSlot]
    cursor: int = 0
    assigned: list[tuple[int, Path]] = field(default_factory=list)


def build_state(worker_count: int, batch_size: int) -> DispatchState:
    if worker_count < 1 or batch_size < 1:
        raise ValueError(f"invalid pool: workers={worker_count} batch={batch_size}")
    slots = [WorkerSlot(worker_id=i + 1, batch_size=batch_size) for i in range(worker_count)]
    return DispatchState(workers=slots)


def list_ready(pending_dir: Path) -> list[Path]:
    """Return committed pending images, sorted by name; `.part` files skipped."""
    if pending_dir.exists() is False:
        return []
    ready = [p for p in pending_dir.iterdir() if p.name.endswith(PART_SUFFIX) is False]
    ready.sort(key=lambda p: p.name)
    return ready


def next_worker(state: DispatchState) -> WorkerSlot | None:
    total = len(state.workers)
    for step in range(total):
        idx = (state.cursor + step) % total
        slot = state.workers[idx]
        if slot.in_flight < slot.batch_size:
            state.cursor = (idx + 1) % total
            return slot
    return None


def assign_one(
    state: DispatchState,
    image_path: Path,
    inflight_dir: Path | None = None,
) -> WorkerSlot | None:
    """Assign a pending image to a worker.

    When `inflight_dir` is provided, atomically renames `pending/<file>` →
    `inflight/<file>` before bookkeeping, enforcing the one-writer invariant
    (spec 15 §36). The tracked path in `state.assigned` is the post-move path.
    Legacy callers omitting `inflight_dir` get the pre-lifecycle behaviour.
    """
    slot = next_worker(state)
    if slot is None:
        log.warning("dispatcher.assign.poolSaturated image=%s", image_path.name)
        return None
    tracked = image_path
    if inflight_dir is not None:
        try:
            tracked = move_to_inflight(image_path, inflight_dir)
        except DispatcherLifecycleError:
            # Move failed → do NOT charge the slot; surface upstream via logs.
            return None
    slot.in_flight += 1
    state.assigned.append((slot.worker_id, tracked))
    log.debug("dispatcher.assign workerId=%d image=%s", slot.worker_id, tracked.name)
    return slot

