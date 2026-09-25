# 16 — Parallelism Guarantees

**Status:** Locked (Plan 04 Step 16). Anchors the concurrency contract across Capture (14), Processing (15), and Workers (13).

## 1. The One Rule

**Capture never blocks Processing. Processing never blocks Capture.**

They are coupled only by the `images/pending/` directory. Neither reads the other's memory. Neither holds a lock the other waits on.

## 2. Concurrency Model per Task

```
Capture Process ──[atomic rename]──▶ images/pending/ ──[atomic rename]──▶ Worker Pool
     (1 process, N SDK threads)         (filesystem)         (8 workers × 3 in-flight = 24)
```

- **Capture:** 1 OS process. Internally may use SDK-owned threads. Writes only to `pending/` (via `.part` → rename). Never reads any DB. Never reads `inflight/`, `processed/`, `failed/`.
- **Dispatcher:** 1 OS process, 1 state thread. Owns `inflight/` transitions. Writes `Judgment` to `task.db`. Never touches `.part` files.
- **Workers:** 8 OS processes. Read image bytes from `inflight/<file>`. Never write to disk. Return `JudgmentEmitted` via IPC.
- **UI Shell:** 1 OS process. Read-only on `task.db` (WAL reader). Never writes.

## 3. Lock / Contention Matrix

| Resource                | Writer(s)                  | Reader(s)                  | Contention risk                         |
| ----------------------- | -------------------------- | -------------------------- | --------------------------------------- |
| `pending/`              | Capture (rename-in)        | Dispatcher (rename-out)    | None — rename is atomic, distinct names |
| `inflight/`             | Dispatcher                 | Workers (read image bytes) | None — one file per worker slot         |
| `processed/`, `failed/` | Dispatcher                 | UI (list)                  | None — append-only                      |
| `task.db` (WAL)         | Dispatcher (single writer) | UI, Dispatcher             | SQLite WAL: readers never block writer  |
| `root.db`               | Supervisor only            | Dispatcher, UI (read)      | Single writer by construction           |
| `rules.db` (per Task)   | Author flow only (offline) | Workers (read at snapshot) | None during run — snapshotted (see 13)  |
| Worker IPC socket       | Dispatcher ↔ Worker[i]     | dedicated                  | Per-worker channel, no fan-in           |

**One writer per DB file** is a hard invariant (per 11 §Runtime, 12 §core/io). Violation = data corruption.

## 4. Back-Pressure (Summary)

Reference: 14 §4 and 15 §6. The single signal is `count(pending)`.

- Capture is authoritative on frame drop (drops at trigger, not mid-write).
- Dispatcher never throttles Capture. It only drains as fast as workers allow.
- If workers stall (crash storm), `pending/` grows → Capture enters `DEGRADED` → frames dropped upstream. **No image is ever half-written; no queue in RAM.**

## 5. Ordering (Summary)

- **Capture order** = `ImageSequence` (9-digit monotonic).
- **Assignment order** = FIFO by `ImageSequence` (Dispatcher picks oldest first).
- **Completion order** = arbitrary (workers finish at different speeds).
- Any UI sort by chronology MUST use `ImageSequence` or `CapturedAt`, never `PersistedAt`.

## 6. Failure Isolation

| Failure            | Blast radius                                            | Recovery                                                            |
| ------------------ | ------------------------------------------------------- | ------------------------------------------------------------------- |
| One worker crashes | 1 in-flight image → `failed/`                           | Supervisor restarts worker (3× / 60 s per 11)                       |
| All workers crash  | Dispatcher stalls; `pending/` grows; Capture → DEGRADED | Supervisor restarts pool; images re-picked from `pending/`          |
| Dispatcher crashes | Workers idle; `inflight/` frozen                        | Supervisor restarts; `inflight/` → `pending/` on boot (15 §4)       |
| Capture crashes    | New frames stop; existing `pending/` drains normally    | Supervisor restarts Capture; no data loss for already-renamed files |
| `task.db` locked   | Retry once (per 15 §4); then `E_DB_WRITE` → `failed/`   | Manual: WAL checkpoint; log surfaced (per 41)                       |
| Disk < 500 MB      | Capture halts (14 §4)                                   | Operator frees space; Supervisor auto-resumes                       |

## 7. Performance Envelope (Reference)

- Capture: sustained 77 fps (13 ms budget).
- Processing: 8 × 3 = 24 in-flight; per-image budget ≤ 312 ms to keep steady-state at 77 fps (24 / 77 ≈ 312 ms).
- Exceeding 312 ms per image over a rolling 5 s window → `DEGRADED` (queue grows).

These numbers are the design envelope, not per-frame SLAs. `45-testing-strategy.md` owns measurement.

## 8. What This File Forbids

- No thread-shared queue between Capture and Dispatcher.
- No in-memory image buffers passed between processes (bytes travel via the filesystem or via the IPC image-read done inside the worker).
- No cross-worker synchronization for rule evaluation. Each `Judgment` is independent.
- No global lock. No stop-the-world checkpoint. WAL checkpoints are opportunistic and non-blocking.

## 9. Open Issues

None new.

## Acceptance Checklist

- [ ] No shared mutable state across workers except append-only sinks.
- [ ] Ordering guarantee per RunSession stated with test reference.
- [ ] Fairness / starvation bounds cited from `27.Runtime.*`.
