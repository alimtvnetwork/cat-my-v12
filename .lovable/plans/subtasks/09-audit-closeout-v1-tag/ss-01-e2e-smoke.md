---
Slug: e2e-smoke
Parent: 09-audit-closeout-v1-tag
Status: pending
Created: 2026-07-12
---

# SS-01 — Playwright E2E smoke (boot → setup → run → results)

## Goal

Prove the four core routes wire together end-to-end against the built app, and give CI a regression gate for the flows the audit calls "Tests area = 68".

## Setup

- Install `@playwright/test` (dev). Do NOT run `playwright install` — sandbox Chromium is preinstalled at `PLAYWRIGHT_BROWSERS_PATH=/`.
- Config: `playwright.config.ts` at repo root, `testDir: tests/e2e`, `use: { baseURL: 'http://localhost:8080', viewport: { width: 1280, height: 1800 } }`, `webServer` disabled (dev server already running).
- Add `bunx playwright test` to `package.json` scripts as `test:e2e`.

## Scenarios (one spec file each under `tests/e2e/`)

1. `boot.spec.ts` — GET `/`, expect self-test to finish, expect "Ready" chip, expect nav visible.
2. `setup.spec.ts` — navigate `/` → Setup, create a task via UI, assert ULID-shaped id in URL, assert form persistence on reload.
3. `run.spec.ts` — start run, assert nav is aria-disabled (F-27), assert `ca.capture.fps` sample logged via `/api/public/health/ready` metrics dump, stop run.
4. `results.spec.ts` — open `/results/:runId` for the run just executed, assert at least one row rendered, assert JSONL row count matches UI count.

## Fixtures

- `tests/e2e/fixtures/reset-db.ts` — server-fn helper to truncate `tasks`, `runs`, `results`, `consent` between tests. Guarded by `NODE_ENV !== 'production'`.
- `tests/e2e/fixtures/ulid.ts` — assertion helper wrapping `assertUlid`.

## Pass criteria

- All 4 specs green locally and in CI.
- Report artifact `tests/reports/playwright/` uploaded to `.lovable/memory/audit/evidence/v0.105.0/`.
- Total wall time < 60s.

## Failure mapping

- Route param crash → step 1 of parent plan regressed.
- Run-lock nav still clickable → step 2 of parent plan regressed.
- Missing fps sample → step 4 of parent plan regressed.
