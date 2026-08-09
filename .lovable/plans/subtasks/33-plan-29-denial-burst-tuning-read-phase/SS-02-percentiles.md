# SS-02 - Exporter --percentiles flag

Slug: percentiles
Parent: 33-plan-29-denial-burst-tuning-read-phase
Status: pending
Created: 2026-07-15

## Scope

Extend `scripts/security/export_denial_events.py` with a `--percentiles` flag that computes p50/p95/p99 of denial-burst counts across three fixed windows: 1-min, 5-min, 15-min.

## Behavior

- Input: same JSONL source the CLI already reads.
- Bucketing: floor timestamps to window boundary; count rows per bucket per code.
- Output: JSON to stdout (or `--out <path>`) with shape:
  ```json
  {
    "window_1m": {"p50": n, "p95": n, "p99": n, "buckets": n, "first_ts": "...", "last_ts": "..."},
    "window_5m": {...},
    "window_15m": {...}
  }
  ```
- Determinism: sort input by ts before bucketing; use `statistics.quantiles(..., n=100, method='inclusive')`.

## Error rules (Python, per `spec/coding-guidelines/python.md` + error-manage folder)

- Missing input file -> raise typed `DenialExportError('E_INPUT_MISSING', path=...)`.
- Malformed JSONL row -> log at WARN with row number, skip, count in summary; do not abort.
- Empty input -> exit 2 with `E_INPUT_EMPTY` message to stderr.
- No bare `except:`; every catch logs cid + operation.

## File plan

- Edit: `scripts/security/export_denial_events.py` (add argparse flag + pure `compute_percentiles()` fn, <=15 lines each).
- New test: `tests/unit/export_denial_percentiles_test.py`.
