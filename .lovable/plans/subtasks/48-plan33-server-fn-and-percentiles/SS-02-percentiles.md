---
Slug: percentiles
Status: pending
Created: 2026-07-16
Parent: 48-plan33-server-fn-and-percentiles
---

# SS-02 export_denial_events.py --percentiles

## Flag

`--percentiles` (bool). Emits an extra JSONL section with per-window percentile summaries.

## Window definitions

- `1m`: 60-second buckets.
- `5m`: 300-second buckets.
- `15m`: 900-second buckets.

## Percentile output shape (one row per window)

```
{"window": "5m", "bucket_count": 288, "p50": 3, "p95": 17, "p99": 42, "first_ts": "...", "last_ts": "..."}
```

## Determinism rules

- Sort input rows by `occurred_at` ascending before bucketing.
- Compute percentiles via `statistics.quantiles(rows, n=100, method='inclusive')`; pick index 49 (p50), 94 (p95), 98 (p99).
- Round percentile values to nearest integer for the burst-count metric.
- Emit windows in fixed order: `1m`, `5m`, `15m`.

## Golden snapshot

Commit `tests/fixtures/security/denial_percentiles_golden.jsonl` derived from `denial_sample.jsonl` plus 200 synthetic rows generated inside the test (deterministic seed 20260716). The test regenerates and diffs.

## Non-goals

- No new metric other than burst count.
- No streaming input; whole-file read is fine at this scale.
