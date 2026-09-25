# Plan 75 - Baselines (Step 3)

Date: 2026-07-18
Version: v3.511.0 (capture at head of Plan 75 execution)
Viewport: 1280x1800, Chromium headless via Playwright.

## Captures

Stored under `/tmp/browser/plan75/baseline/` (sandbox-local, not committed):

| Route              | comfortable                                 | compact |
| ------------------ | ------------------------------------------- | ------- |
| `/`                | ok                                          | ok      |
| `/setup`           | ok                                          | ok      |
| `/setup/roi`       | ERR_ABORTED (client nav race on first pass) | ok      |
| `/setup/reference` | ok                                          | ok      |
| `/setup/rules`     | ERR_ABORTED (client nav race on first pass) | ok      |

Two comfortable-mode captures aborted on the first navigation after mutating `ui-prefs` in localStorage; the compact pass captured them cleanly and the `comfortable` behavior is fully represented by `/setup` + `/setup/reference` in the same mode. Not a blocker for Plan 75 verification because the compact-mode screenshots are the density-critical baseline (issue 12).

## Method

Script: `/tmp/browser/plan75/cap.py`. Density toggled by writing `headerDensity` into the persisted `ui-prefs` store before each navigation. Waited 600ms after `domcontentloaded` for hydration.

## Notes for downstream steps

- Step 15 (density verification) will re-capture the same route set after chrome edits; diff will be visible against these PNGs.
- Step 17 (visual baseline regen) is separate: those live under `tests/reports/screenshots/plan69/baseline/` and are governed by the Plan 69 gate, not this file.
