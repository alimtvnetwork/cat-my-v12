# 15 — Processing Pipeline

**Status:** Locked (Plan 04 Step 15). Complements `14-capture-pipeline.md` (producer) and `13-worker-pattern.md` (consumer).

## 1. Scope

Everything that happens **after** an image lands (atomically renamed) in `images/pending/` and **before** its `Judgment` rows are durable in `task.db`. The Dispatcher owns this pipeline.

Out of scope: capture (see 14), rule math (see 13/core-rules), UI rendering (Phase D).

## 2. Directory Contract

Per `TaskId`:

```
images/
  pending/    # Capture writes here (atomic .part → final rename)
  inflight/   # Dispatcher owns; one file per assigned image
  processed/  # Terminal OK: Judgment persisted
  failed/     # Terminal NG at pipeline level (decode/IO/rule-raise)
```

Rules:

- A file exists in exactly **one** directory at any moment.
- Movement is **rename-only** (same filesystem, atomic). No copy, no partial.
- Dispatcher is the **only** writer to `inflight/`, `processed/`, `failed/`.

## 3. Dispatcher Loop

Single process. Single thread for state; worker pool for compute (see 13).

```
loop:
  1. drain worker outbox (JudgmentEmitted / JudgmentFailed)
     → write Judgment row (task.db)
     → rename inflight/<file> → processed/<file>  (on ok)
                             → failed/<file>      (on failure) + write FailureReason
  2. if in-flight < WorkerCount * BatchSize (=24 default):
       pick up to (capacity) oldest files from pending/  (mtime asc, tiebreak by name)
       rename each pending/<file> → inflight/<file>
       send AssignImage{path=inflight/<file>, ruleSnapshotRef} to next free worker
  3. sleep 2 ms if idle; otherwise no sleep
```

Ordering: FIFO by capture sequence (filename is 9-digit monotonic → lexical sort == capture order). Not a strict guarantee across worker completion — see §5.

## 4. Failure Taxonomy (Pipeline-Level)

| Class            | Origin                           | Terminal folder                                          | `FailureReason.code` |
| ---------------- | -------------------------------- | -------------------------------------------------------- | -------------------- |
| Decode           | Worker cannot read file          | `failed/`                                                | `E_IMG_DECODE`       |
| Rule raise       | Rule engine throws               | `failed/`                                                | `E_RULE_RAISE`       |
| DB write         | SQLite error persisting Judgment | `failed/` (retry once first)                             | `E_DB_WRITE`         |
| Worker crash     | Missed heartbeat (see 11)        | `failed/` (image reclaimed)                              | `E_WORKER_CRASH`     |
| Dispatcher crash | Supervisor restart               | leave in `inflight/`; on boot, rename back to `pending/` | n/a (recovered)      |

Recovery on Dispatcher boot: every file in `inflight/` is renamed back to `pending/` before the loop starts. This is the only place `inflight → pending` transitions are legal.

## 5. Ordering Guarantees

- **Assignment order:** FIFO by capture sequence.
- **Completion order:** Not guaranteed (workers finish at different speeds).
- **Persistence order:** `Judgment.CapturedAt` and `Judgment.ImageSequence` are the source of truth for downstream sort; `ProcessedAt` reflects wall-clock completion.

UI (37-run-monitor) MUST sort by `ImageSequence`, not by insert order.

## 6. Back-Pressure Contract

Producer (Capture, see 14) checks `pending/` count:

| `count(pending)` | State    | Capture behavior                                   |
| ---------------- | -------- | -------------------------------------------------- |
| < 500            | NORMAL   | full fps                                           |
| 500 – 1999       | WARN     | fps unchanged, log + UI badge                      |
| ≥ 2000           | DEGRADED | Capture drops frames at trigger source (see 14 §4) |

Dispatcher never signals Capture directly. Coupling is via the shared `pending/` directory count only.

## 7. Metrics (per second, per Task)

Written to `AppSetting` rolling window — consumed by `37-run-monitor-screen.md`.

- `dispatcher.captured_fps` (from Capture)
- `dispatcher.processed_fps` (Judgments persisted this second)
- `dispatcher.queue_depth` (`count(pending) + count(inflight)`)
- `dispatcher.ok_count` / `ng_count` / `fail_count`
- `dispatcher.avg_latency_ms` (rename-in-pending → Judgment.PersistedAt)

## 8. Non-Goals

- No batch commits: each Judgment is written independently (per 13).
- No re-processing: a file in `failed/` stays there; re-inspection requires a new Task run.
- No cross-Task queueing: each Task has its own Dispatcher scope; the Supervisor owns Task-level scheduling.

## 9. Open Issues

None new. Existing `AI-05` (worker/batch defaults) resolved in 04 §. Existing `AI-04` (region shapes) does not affect this file.

## Acceptance Checklist

- [ ] Rule evaluation order matches `spec/21-app/33-rule-catalog.md`.
- [ ] Every judgment carries `metrics.tolerance` inline per memory 09.
- [ ] Silent rules never contribute to image verdict.
