# SS-05 Perf harness (median FPS >= 77)

Slug: perf-harness
Parent: 25-v2.0.7-vendor-sdk-hardening
Status: pending
Created: 2026-07-14

## Goal

Measure end-to-end capture throughput and prove the 77 fps SLO named in `spec/21-app/50-capture-modules.md`.

## Method

1. Add `scripts/perf/capture_bench.py` that runs N=600 frames per adapter, reports median and p95 FPS.
2. When hardware is absent, replay a fixture stream from `assets/perf-fixtures/` so CI-lite has a reproducible baseline (mark output as `replay=true`).
3. Fail the run if median < 77 fps against a physical camera; warn (do not fail) when running against replay fixture.
4. Pin results to `.lovable/memory/v2/plan25/05-perf-run-<date>.md`.

## Output

Harness script + fixture manifest + at least one recorded run per adapter. Result table copied into `spec/25-app-audit/latest/` on Step 9.
