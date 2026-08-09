# Plan 43 execution slice 2, call-site migration + readability sweep

Slug: plan43-execution-slice-2
Steps: 5
Status: pending
Created: 2026-07-16

## Context

Second executable slice of `.lovable/plans/pending/43-coding-quality-error-dialog-and-mode-flag.md`, running after slice 1 (`44-plan43-execution-slice-1.md`) lands the `AppMode` flag and `src/lib/constants/**` scaffolding. This slice migrates existing call sites to the shared constants, applies the boolean/control-flow readability rules, and syncs the affected spec docs. No feature or logic change. Related commands: `.lovable/spec/commands/20-pascalcase-no-magic-strings.md`, `.lovable/spec/commands/21-code-quality-boolean-and-flow.md`.

## Steps

1. Migrate `src/**/*.{ts,tsx}` call sites off inline literals to `HttpMethod`, `StorageKey`, `AppEvent`, `IpcChannel`, `ErrorCode`, `CameraPov`, and `SampleId` from `src/lib/constants/*`; keep diffs mechanical (import + swap), no behaviour change; run `bunx tsgo --noEmit` after each category.
2. Apply the boolean and control-flow rules from `.lovable/spec/commands/21-code-quality-boolean-and-flow.md` across `src/**`: replace `!!x` with `Boolean(x)` or explicit compare, collapse `if/else return true/false`, extract mixed-negation predicates into `is*`/`has*`/`can*`/`should*` helpers, add exhaustive `never` guards on discriminated-union switches, flatten 3+ level nesting into early returns.
3. Add ESLint rules `no-restricted-syntax` forbidding literal HTTP methods, direct `localStorage.getItem`/`setItem` with a string literal, and inline error-code strings outside `src/lib/constants/error-codes.ts`; wire `scripts/check-magic-strings.sh` and add it to `.github/workflows/ci.yml`.
4. Sync spec files touched by the renames: `spec/02-coding-guidelines/02-typescript/**`, `spec/02-coding-guidelines/08-file-folder-naming/**`, `spec/03-error-manage/02-error-architecture/04-error-modal/*`, `spec/24-app-ui-design-system/03-canvas.md`, and `spec/21-app/61-sample-images-and-focus.md`; cross-link every renamed identifier to its constants module.
5. Verify: `bunx tsgo --noEmit`, `bunx vitest run`, `scripts/check-magic-strings.sh`, and Playwright regression on `tests/e2e/editor_happy_path.py` + `tests/e2e/error_dialog.py`; grep confirms zero remaining inline literals for the seven categories in step 1.

## Verification

- Zero grep hits after step 1 for `"GET"|"POST"|"PUT"|"PATCH"|"DELETE"` outside `src/lib/constants/http.ts`, and for camera POV / sample id string literals outside their constants files.
- `bunx tsgo --noEmit` and `bunx vitest run` exit 0 after step 2 and step 5.
- `scripts/check-magic-strings.sh` exits 0 in CI after step 3.
- Spec diff after step 4 references the new constants module paths and PascalCase identifiers.
- Playwright suites in step 5 pass with no snapshot drift.

## Appended from prior pending tasks

- 29-denial-burst-threshold-tuning.md
- 32-sg-31-01-pattern-edge.md
- 33-plan-29-denial-burst-tuning-read-phase.md
- 35-ui-ux-photoshop-layers-overhaul.md
- 36-ui-app-shell-and-src-v3-port.md
- 37-home-dexter-ui-repair.md
- 38-read-memory-onboarding-and-audit.md
- 39-read-spec-code-and-memorize.md
- 40-tools-images-spec-docs.md
- 41-keyboard-dnd-and-code-quality-pass.md
- 42-rule-conditions-and-validation-order.md
- 43-coding-quality-error-dialog-and-mode-flag.md (parent)
- 44-plan43-execution-slice-1.md (predecessor slice)
