---
name: Plan 73 step 40 visual baselines
description: Regenerated visual-regression baselines for plan 69 routes after Plan 73 UI churn.
type: feature
---

# Visual baseline refresh (Plan 73 step 40)

Date: 2026-07-18. Version: v3.505.0.

## Root cause

Plans 68 / 70 / 71 / 72 / 73 shifted Titlebar, breadcrumb, tools/rules dock, health-banner overlay and worker-notice affordances, so the plan 69 baselines under `tests/reports/screenshots/plan69/baseline/` were stale and would false-fail the visual gate.

## Action

Ran `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=... VISUAL_UPDATE=1 bun run visual:update` which invokes `tests/visual/capture-baselines.ts`. Captured 3 baselines at 1280x900: `home.png` (`/`), `setup.png` (`/setup`), `run.png` (`/run`). `VISUAL_ROUTES` inventory unchanged (`tests/visual/routes.config.ts`).

## Note

Node-side Playwright cannot see its bundled chromium in this sandbox (`chromium_headless_shell-1228` path missing); the capture script honours `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, resolved via the Nix-store chromium binary. CI runners with a normal Playwright install do not need the override.
