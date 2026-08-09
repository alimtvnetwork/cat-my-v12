# SS-01: Baseline inventory (plan 69 step 1)

Date: 2026-07-17
Parent plan: `.lovable/plans/pending/69-visual-regression-ci-gate.md`

## Root-cause correction to the plan text

Plan 69 (and SS-02 of plan 68) claimed baselines existed under `tests/reports/screenshots/plan67/`. They do not: the filesystem has `tests/reports/screenshots/plan66/` before/after captures only, no `plan67/` folder and no stable route baselines suitable for a gate.

Consequence: step 1 was not a pure inventory, it was a fresh capture.

## Chosen routes

Public routes only (no auth restore in scope). Source of truth: `tests/visual/routes.config.ts::VISUAL_ROUTES`.

| slug  | path   | notes                                                    |
| ----- | ------ | -------------------------------------------------------- |
| home  | /      | Landing / workflow cards                                 |
| setup | /setup | Setup shell (LightingReadout `useShallow` fix, v3.432.0) |
| run   | /run   | Run picker (RulesetPicker, v3.411.0)                     |

Excluded: `/setup/rules`, `/setup/chain-events`, `/setup/functions`. Reason: those routes render project-scoped state that requires an IDB seed. Adding them means seeding the facade before capture, deferred to a follow-up plan.

## Capture parameters

- Viewport: 1280 x 900 (`VISUAL_VIEWPORT`).
- `waitUntil: networkidle`, 30s timeout.
- `fullPage: false` (viewport-only) to keep diffs deterministic against dynamic below-fold content.
- Chromium binary path resolved via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` env when the sandbox does not ship the version @playwright/test expects.

## Thresholds

`VISUAL_DIFF` in `tests/visual/routes.config.ts`:

- `threshold: 0.1` (pixelmatch per-pixel color distance).
- `maxDiffPixelRatio: 0.005` (0.5 % of pixels may drift).

## Artifacts

- Baselines: `tests/reports/screenshots/plan69/baseline/<slug>.png`.
- Actual on run: `tests/reports/screenshots/plan69/actual/<slug>.png`.
- Diff on failure: `tests/reports/screenshots/plan69/diff/<slug>.png`.

## Verification signal

Baseline capture at v3.440.0: 3 files written, sizes non-zero. Gate run against the fresh baselines: 3 passed in 11.8s (`bunx playwright test`).
