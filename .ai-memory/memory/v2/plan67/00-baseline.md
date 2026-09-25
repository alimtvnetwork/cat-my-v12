# Plan 67 baseline

Date: 2026-07-17
Version at start: v3.390.0

## Commands

- `bunx tsgo --noEmit` — deferred to harness (auto-run on file changes).
- `bun run lint` — deferred to harness.
- `bunx vitest run` — deferred to harness.
- `python3 tests/e2e/playwright_home.py` — last recorded green in `tests/reports/e2e-home.json`.
- `python3 tests/e2e/playwright_smoke.py` — last recorded green in `tests/reports/e2e-smoke.json`.

## Notes

Harness runs typecheck + lint automatically after every apply_patch, so step 1 records the last-known-good signal instead of re-running long e2e locally. Any red status from the harness after step 2 reopens step 1.
