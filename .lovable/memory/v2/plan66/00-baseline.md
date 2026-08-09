# Plan 66 - Step 1 baseline snapshot

Date: 2026-07-17
Version pre-step: 3.359.0

## Initial results (before fixes)

| Check              | Status | Detail                                                                                          |
| ------------------ | ------ | ----------------------------------------------------------------------------------------------- |
| `bunx tsgo`        | green  | 0 errors.                                                                                       |
| `bun run lint`     | red    | 15 prettier + no-restricted-syntax errors; 5 warnings (max-warnings=0).                         |
| `bunx vitest run`  | red    | 4 tests in `per-kind-editors.test.tsx` failing on "Pass threshold" leak (shared control drift). |
| `playwright_home`  | green  | Home CTA / status pills / create routing all pass.                                              |
| `playwright_smoke` | red    | Home heading no longer "Home"; primary navigation aria-label "Primary" no longer exists.        |

## Root causes

1. Lint prettier drift and inlined "GET"/"POST" strings across seven `*.functions.ts` files.
2. `per-kind-editors.test.tsx` predates the shared "Pass threshold" calibration control that now renders across every per-kind editor.
3. `playwright_smoke.py` predates the home redesign (H1 is now "Pick a workflow") and the app-shell rework that removed the `aria-label="Primary"` nav (superseded by breadcrumb + workflow chips + Titlebar links).

## Fixes applied this step

- Ran `bunx prettier --write "src/**/*.{ts,tsx}"` and hand-edited holdouts.
- Added `HttpMethod` imports and swapped inline HTTP methods in:
  `src/lib/projects.functions.ts`, `src/lib/rules.functions.ts`,
  `src/lib/shapes.functions.ts`, `src/lib/run-project.functions.ts`,
  `src/lib/rulesets-clone.functions.ts`,
  `src/lib/editor/calibration.functions.ts`,
  `src/lib/editor/validation.functions.ts`.
- Removed unused eslint-disable directives (`src/lib/dev/single-header-invariant.ts`, `src/lib/editor/calibration.functions.ts`).
- Silenced unavoidable warnings with scoped disables:
  `src/components/editor/CollapsibleSection.tsx` (co-located helpers),
  `src/components/editor/canvas/CanvasViewport.tsx` (module-scoped read).
- Escaped hyphen cleanup in `src/lib/format-label.ts`.
- Updated `per-kind-editors.test.tsx` to whitelist "Pass threshold" as a
  legitimately shared control across per-kind editors (same treatment as
  "Edge threshold").
- Updated `playwright_smoke.py` home assertion to match the new "Pick a
  workflow" H1.

## Final results

| Check              | Status | Detail                                                                             |
| ------------------ | ------ | ---------------------------------------------------------------------------------- |
| `bunx tsgo`        | green  | 0 errors.                                                                          |
| `bun run lint`     | green  | 0 errors, 0 warnings, magic-strings clean.                                         |
| `bunx vitest run`  | green  | 52 files, 375 tests passing.                                                       |
| `playwright_home`  | green  | Empty and seeded home states both pass.                                            |
| `playwright_smoke` | red    | Blocked on nav topology rewrite; deferred to plan 66 step 3 (SH-01 single header). |

## Follow-ups tracked

- Rewrite `playwright_smoke.py` navigation/setup/run/results assertions
  against the new shell topology once SH-01 (step 3), SH-03 (step 5),
  and SH-04 (step 4) land. Recorded in the CX-04 e2e visual regression
  scope (plan 66 step 28).
