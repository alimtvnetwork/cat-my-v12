# CLI Automation & Headless Verification Specification
# Directory: 02-spec/21-app/03-app-bug-fixes-and-ui-enhancements/05-cli-automation-and-e2e-verification-spec.md
# Status: draft

## 1. CLI Automation Interface
Inspired by Antigravity Tools, `scripts/cli-ui-test-runner.ts` provides programmatic execution across application screens:
- `bun run test:cli -- --target home` -> Navigates to home and asserts window controls and version badge.
- `bun run test:cli -- --target recorder` -> Starts recording, triggers click snapshots, verifies ZIP export modal.
- `bun run test:cli -- --target simulation` -> Launches simulation, verifies 2s-10s dwell slider, tests Next/Prev without glitches.
- `bun run test:cli -- --target roi` -> Tunes ROI on workpiece image, asserts persistence across reloads.
- `bun run test:cli -- --target camera` -> Asserts live camera dropdown CSS positioning without overflow.

## 2. Automated Quality Gates
All test cases run via Playwright Chromium in headless mode, capturing screenshots to `reports/e2e-screenshots/` and asserting 100% pass rates.
