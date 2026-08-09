---
title: Worker Pattern — Vision Inspection App
slug: worker-pattern
source: spec/21-app/12-runtime-processes.md, spec/21-app/07-seedable-config-digest.md
---

# Worker Pattern

Fixed-size worker pool with per-worker in-process batching. Chosen over a thread pool because rule evaluation is CPU-bound and Python GIL would serialize threads; chosen over per-image processes because process spawn cost (~50 ms) blows the 77 fps budget.

## Sizing

- `WorkerCount` — number of OS processes. Default **8**, range 1–32. Source: `AppSetting.WorkerCount` (config layer 2).
- `BatchSize` — per-worker parallel images (async I/O overlap). Default **3**, range 1–16. Source: `AppSetting.BatchSize`.
- Effective in-flight images ≈ `WorkerCount × BatchSize` (24 default). Sizing tied to CPU cores × 1.0–1.5 typical.

## Input / Output Contract (per assignment)

Input (from Dispatcher over IPC):

```json
{
  "type": "AssignImage",
  "taskId": "T-000123",
  "imagePath": "tasks/T-000123/images/pending/000045678.jpg",
  "sequenceNo": 45678,
  "capturedAt": "2026-07-12T14:03:22.541Z"
}
```

Output (Worker → Supervisor over IPC + TaskDb write):

```json
{
  "type": "JudgmentEmitted",
  "taskId": "T-000123",
  "imageId": "I-...",
  "judgmentCode": "OK",
  "reason": null,
  "ruleResults": [{ "ruleRef": "rules:R-01", "passed": true, "score": 0.97 }],
  "processedAt": "2026-07-12T14:03:22.612Z",
  "workerId": 3
}
```

Then move image: `images/pending/*` → `images/processed/*` (OK) or `images/failed/*` (NG with hard error). NG-by-rule stays in `processed/`.

## Batching Semantics

- Each Worker keeps up to `BatchSize` images in flight via `asyncio`.
- Rule evaluation itself is synchronous CPU work; batching overlaps disk read (image decode) with the CPU work on a previous image.
- **No batch-level commit.** Each Judgment is written independently — a slow image never delays a fast one's write.

## Rule Snapshot

- At Task start, Supervisor reads RulesDb, serializes to a compact in-memory struct, and passes a read-only copy to every Worker on spawn.
- Workers **never** re-read RulesDb during a RunSession. Editing rules requires stopTask.
- Snapshot version is stamped into `RunSession.ruleSnapshotVersion` and into every emitted Judgment for traceability.

## Fairness & Ordering

- Dispatcher assigns round-robin by `workerId`, skipping any worker with `inFlight ≥ BatchSize`.
- No global ordering guarantee — Judgments may arrive out of `sequenceNo`. UI/Results screen sorts by `sequenceNo` on read.

## Failure Modes

| Symptom                             | Cause                      | Action                                                                  |
| ----------------------------------- | -------------------------- | ----------------------------------------------------------------------- |
| Worker unresponsive > 5 s heartbeat | Stuck rule / infinite loop | Supervisor SIGKILL, respawn, reassign image                             |
| Image decode fails                  | Corrupt/partial file       | Move to `failed/`, emit `ErrorEvent(code=IMG_DECODE)`, no Judgment row  |
| Rule raises                         | Bug in rule evaluator      | Judgment.code = `ERROR`, reason = exception summary, image → `failed/`  |
| TaskDb write fails                  | Disk full / lock timeout   | Retry 3× with backoff, then Task → `DEGRADED`, Supervisor halts Capture |

## Metrics (emitted per second to Supervisor)

- `workerId`, `inFlight`, `processedTotal`, `avgLatencyMs`, `cpuPct`.

## Cross-Refs

- Defaults source → `04-seedable-config-digest.md`.
- Runtime process spawn → `11-runtime-processes.md`.
- Pipeline flow → Step 15 `15-processing-pipeline.md`.
- Error codes → Step 37 `40-error-manage.md`.

## Acceptance Checklist

- [ ] Worker count bounded by `27.Runtime.WorkerCount`.
- [ ] Per-worker in-flight image cap enforced and unit-tested.
- [ ] Worker restart on crash reference to supervisor spec (12).
