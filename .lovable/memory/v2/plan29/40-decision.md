# Plan 29 Threshold Decision

Threshold derivation based on `20-windows.json` fixture.

Selected approach: p95(1m) 

## Selected Thresholds

- 1m window: p95 (4)
- 5m window: p95 (4)
- 15m window: p95 (4)

## Constants Update

Old value: `denial_threshold: 5, denial_window_seconds: 60`
New value: `denial_threshold: 4, denial_window_seconds: 60`

## Rollback Plan
Revert to 5 if any false positive rate increases in the first 2 release cycles.
