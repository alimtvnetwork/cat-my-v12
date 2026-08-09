---
title: Visual regression CI gate (I-CX-04)
slug: visual-regression-ci-gate
status: pending
created: 2026-07-17
owner: agent
parent_row: I-CX-04 in `spec/24-app-ui-design-system/99d-ui-improvements-v2-enhancement.md`
---

# Plan 69: Visual regression CI gate

Only V2-enhancement pending row that has no blocking ambiguity. Baselines already exist under `tests/reports/screenshots/plan67/` (SS-02). Goal: wire a screenshot diff step into `bun run ci` so drift fails the build.

## Non-goals

- Do not re-capture baselines. Reuse plan-67 output.
- Do not add per-PR review UI. Command-line diff is enough for now.
- No new pending items get unblocked here; this row is standalone.

## Steps

1. Inventory current baselines under `tests/reports/screenshots/plan67/` and pick the routes that are stable enough for a gate (home, `/setup`, `/setup/rules`, `/run`). Record chosen route list in `SS-01-baseline-inventory.md`.
2. Add a playwright test file `tests/visual/routes.spec.ts` that opens the chosen routes on `http://localhost:8080` and asserts a pixelmatch diff against the baseline. Threshold: 0.5% pixels, `maxDiffPixelRatio: 0.005`.
3. Wire the test into `bun run ci`: extend the existing script chain so a failing visual diff fails CI. Do NOT run visual tests in `bun run test` (kept fast).
4. Emit diff artifacts to `tests/reports/screenshots/diff/<route>.png` when a mismatch occurs, and print the artifact path in the CI log line so the failure is actionable.
5. Add a `bun run visual:update` script that overwrites baselines from a clean local run, guarded by an env flag `VISUAL_UPDATE=1` to prevent accidental writes in CI.
6. Update `99d-ui-improvements-v2-enhancement.md`: move I-CX-04 from Pending to Done with plan 69 as the closer.
7. Bump minor version, changelog, release notes, README pin; move this plan to `done/`.

## Definition of done

- `bun run ci` runs visual diff and fails on drift.
- Diff artifacts land under `tests/reports/screenshots/diff/` with predictable names.
- 99d row for I-CX-04 flipped to Done with version + verification signal.
- No changes to app code beyond adding test files and the two npm scripts.

## Risks

- Font/antialiasing drift between local and CI. Mitigate with a fixed viewport (1280x1800), `waitFor networkidle`, and a small pixel threshold above.
- Auth-gated routes need the session-restore snippet from `<browser-use>`. Scope this plan to public routes only; extend later.
