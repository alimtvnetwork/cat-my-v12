# Plan 75 - Step 17 (Visual baseline regen)

Date: 2026-07-18
Version: v3.519.0

## Root cause (one sentence)

Baselines under `tests/reports/screenshots/plan69/baseline/` were captured before Plan 75 steps 12-13 shifted `SectionTopBar` chrome (shadow removal + `py-hmi-2` -> `py-hmi-1`), so the gate flagged intentional pixel diffs as regressions.

## What changed

- Regenerated `home.png`, `setup.png`, `run.png` via `VISUAL_UPDATE=1 bun run visual:update` (chromium at `/chromium_headless_shell-1194/chrome-linux/headless_shell`).
- Raised `maxDiffPixelRatio` in `tests/visual/routes.config.ts` from `0.005` to `0.01` to match the Plan 69 spec (1% tolerance). The `/run` route has a live clock and animated "READY TO RUN" hero pulse; even fresh-vs-fresh captures diff at ~0.59%, so a 0.5% threshold was flakier than the spec allowed.
- Fixed a real regression uncovered by the header spec: `src/routes/setup.index.tsx` used a nested `<header>` element which produced `2` `<header>` matches on `/setup`, violating the SS-04 single-header invariant. Converted to `<div role="region" aria-labelledby="setup-hub-heading">` with a bound `<h1>`; semantics preserved, invariant restored.

## Deltas from previous baselines

- `setup.png`: `SectionTopBar` shadow edge removed, vertical padding tightened by ~4px. Setup hub header keeps the same visual, but the DOM element changed from `<header>` to `<div role="region">`.
- `home.png`: no chrome edit; new baseline captures the same layout with the updated tolerance.
- `run.png`: same layout; tolerance widened to accommodate live clock + hero animation.

## Verification

`bun run visual:test`: 36/36 passing (was 34/36 before).

## Follow-on

Step 18 flips issues 09/11/12/13/14/15 to `Status: closed` with a green gate as the citation.
