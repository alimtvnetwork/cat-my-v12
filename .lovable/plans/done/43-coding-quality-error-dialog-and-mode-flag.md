# Coding quality pass, UI error dialog, and publish-time mode flag

Slug: coding-quality-error-dialog-and-mode-flag
Steps: 100
Status: pending
Created: 2026-07-16

## Context

Two-track improvement: (1) enforce the coding guideline and error-manage spec across `src/**` with no logic changes (PascalCase, no magic strings, boolean/flow readability, shared constants), and (2) ship a UI error dialog gated by a new `AppMode` flag (`Dev` default, `Test`, `Prod`) selectable at publish time. Spec docs under `spec/02-coding-guidelines/**` and `spec/03-error-manage/**` are updated to match every rename.

Captured commands:

- `.lovable/spec/commands/19-error-dialog-dev-mode.md`
- `.lovable/spec/commands/20-pascalcase-no-magic-strings.md`
- `.lovable/spec/commands/21-code-quality-boolean-and-flow.md`

Prior pending tasks pulled into the appendix are listed at the bottom.

Subtasks (deep):

- `./subtasks/43-coding-quality-error-dialog-and-mode-flag/SS-01-boolean-and-flow-audit.md`
- `./subtasks/43-coding-quality-error-dialog-and-mode-flag/SS-02-shared-constants-module.md`
- `./subtasks/43-coding-quality-error-dialog-and-mode-flag/SS-03-error-dialog-provider.md`
- `./subtasks/43-coding-quality-error-dialog-and-mode-flag/SS-04-build-mode-flag.md`
- `./subtasks/43-coding-quality-error-dialog-and-mode-flag/SS-05-pascalcase-rename-and-spec-sync.md`

## Steps

1. Read every file in `.lovable/coding-guidelines/` and log delta vs current `src/`.
2. Read every file in `spec/02-coding-guidelines/**` and record binding rules.
3. Read every file in `spec/03-error-manage/**` including `02-error-architecture/04-error-modal/*`.
4. Read `.lovable/memory/02-naming.md`, `03-error-manage.md`, `22-coding-guidelines-digest.md`, `24-coding-and-error-rulebook.md`.
5. Produce a written rulebook digest at `.lovable/memory/25-plan43-digest.md` (not a mirror, canonical only if new rules emerge).
6. Grep `src/**/*.{ts,tsx}` for `!!` coercions; list occurrences.
7. Grep for `if \(!.*&&` and `if \(!.*\|\|` mixed-negation predicates.
8. Grep for `return true;` / `return false;` blocks that can collapse.
9. Grep for `switch` statements without exhaustive `never` guards.
10. Grep for inline string literals that duplicate HTTP methods (`"GET"`, `"POST"`, `"PUT"`, `"PATCH"`, `"DELETE"`).
11. Grep for inline `localStorage.setItem(".*"` / `getItem(".*"` keys and list unique keys.
12. Grep for `dispatchEvent(new .*Event\("` custom event names.
13. Grep for worker IPC channel string literals (`"capture."`, `"settings."`, `"setup."`, `"run."`).
14. Grep for error-code string literals matching `E_[A-Z_]+`, `W_[A-Z_]+`, `I_[A-Z_]+`.
15. Grep for POV / sample id string literals (`"top-down"`, `"tilt-30"`, `"carrier-tape-*"`).
16. Grep for enum-like unions declared inline (`type X = "a" | "b"`) that should live under `src/lib/constants/`.
17. Grep for React components not in PascalCase file names.
18. Grep for hooks not prefixed `use` and non-hook helpers prefixed `use`.
19. Grep for interfaces prefixed `I` (banned) and types suffixed `Type` (banned).
20. Compile the audit findings into `.lovable/plans/subtasks/43-coding-quality-error-dialog-and-mode-flag/audit-findings.md`.
21. Create `src/lib/constants/index.ts` as barrel export.
22. Create `src/lib/constants/http.ts` with `HttpMethod` const object + inferred union. See ./subtasks/43-coding-quality-error-dialog-and-mode-flag/SS-02-shared-constants-module.md.
23. Create `src/lib/constants/storage.ts` with every localStorage key discovered.
24. Create `src/lib/constants/events.ts` for custom DOM event names.
25. Create `src/lib/constants/ipc.ts` for worker IPC channel names.
26. Create `src/lib/constants/error-codes.ts` mirroring `spec/03-error-manage/03-error-code-registry`.
27. Create `src/lib/constants/camera.ts` for `CameraPov` and camera-control keys.
28. Create `src/lib/constants/sample-library.ts` bridging existing `SAMPLE_LIBRARY` to a typed record.
29. Add ESLint `no-restricted-syntax` rule forbidding literal `"GET"|"POST"|...` outside `src/lib/constants/http.ts`.
30. Add ESLint rule forbidding `localStorage.getItem`/`setItem` with a literal string.
31. Replace inline HTTP method literals across `src/**` with `HttpMethod.*`.
32. Replace inline localStorage keys with `StorageKey.*`.
33. Replace inline custom event names with `AppEvent.*`.
34. Replace inline IPC channel strings with `IpcChannel.*`.
35. Replace inline error-code strings with `ErrorCode.*`.
36. Replace inline POV/sample ids with `CameraPov.*` / `SampleId.*`.
37. Typecheck: `bunx tsgo --noEmit` and fix any breakage from renames.
38. Run `bunx vitest run` and fix any snapshot drift.
39. Create `src/lib/app-mode.ts` exporting `AppMode`, `getAppMode()`, `isDialogVisibleMode()`. See ./subtasks/43-coding-quality-error-dialog-and-mode-flag/SS-04-build-mode-flag.md.
40. Wire `VITE_APP_MODE` in `vite.config.ts` with default `Dev`.
41. Add `.env.development`, `.env.test`, and document publish-time override.
42. Add `AppModeBanner` component that renders in header when mode is not `Prod`.
43. Insert `AppModeBanner` into `src/routes/__root.tsx` above `<Outlet />`.
44. Create `src/lib/errors/error-record.ts` with `ErrorRecord` type.
45. Create `src/lib/errors/error-bus.ts` with `reportError()`, subscribe/unsubscribe. See ./subtasks/43-coding-quality-error-dialog-and-mode-flag/SS-03-error-dialog-provider.md.
46. Create `src/components/errors/ErrorDialog.tsx` (copyable stack, error code chip, correlation id, dismiss all).
47. Create `src/components/errors/ErrorDialogProvider.tsx` context + modal host.
48. Register `window.onerror` and `window.onunhandledrejection` inside the provider.
49. Wrap `<Outlet />` in `src/routes/__root.tsx` with `ErrorBoundary` + `ErrorDialogProvider`.
50. Gate dialog visibility via `isDialogVisibleMode(getAppMode())`.
51. In `Prod` mode, replace dialog with a generic toast + `console.error` log.
52. Add unit tests: `src/lib/errors/__tests__/error-bus.test.ts`.
53. Add unit tests: `src/lib/app-mode.test.ts` covering `Dev`, `Test`, `Prod` resolution.
54. Add Playwright e2e in `tests/e2e/error_dialog.py` triggering a synthetic error and asserting modal visible in `Dev`.
55. Add Playwright e2e asserting the modal is hidden in `Prod` build.
56. Convert `if/else` return-boolean blocks to direct expression returns.
57. Extract nested negated predicates into named `is*`/`has*`/`can*`/`should*` helpers.
58. Replace `!!x` with `Boolean(x)` or explicit comparison.
59. Add exhaustive `never` guards in all discriminated-union switches.
60. Flatten 3+ level nested `if` into early returns.
61. Rename interfaces prefixed `I` to bare PascalCase.
62. Rename types suffixed `Type` to bare PascalCase.
63. Rename `type` aliases used as enums into `as const` objects under `src/lib/constants/`.
64. Update every consumer of renamed identifiers.
65. Verify no `type X = "a" | "b"` inline union remains outside `src/lib/constants/`.
66. Sync `spec/02-coding-guidelines/02-typescript/*` with the boolean, magic-string, and PascalCase rules. See ./subtasks/43-coding-quality-error-dialog-and-mode-flag/SS-05-pascalcase-rename-and-spec-sync.md.
67. Sync `spec/02-coding-guidelines/08-file-folder-naming/*` with file naming rules used in the audit.
68. Sync `spec/03-error-manage/02-error-architecture/04-error-modal/02-react-components.md` with the new provider.
69. Sync `spec/03-error-manage/02-error-architecture/04-error-modal/00-overview.md` with mode gating.
70. Add `spec/03-error-manage/02-error-architecture/04-error-modal/07-mode-gating.md` describing `Dev`/`Test`/`Prod`.
71. Add cross-links from spec `21-app/61-sample-images-and-focus.md` to `CameraPov` and `SampleId` constants.
72. Update `spec/24-app-ui-design-system/03-canvas.md` where identifiers changed.
73. Update `.lovable/memory/02-naming.md` with the finalized PascalCase rules.
74. Update `.lovable/memory/03-error-manage.md` with the dialog + mode gating.
75. Update `.lovable/memory/index.md` to reference the new memory entries.
76. Run `linter-scripts/run.sh` and fix any new violations.
77. Run `python linter-scripts/check-forbidden-strings.py` and add new forbidden literals.
78. Run `python linter-scripts/check-mws-error-codes.py` and align new codes with the registry.
79. Add a lint script `scripts/check-magic-strings.sh` that fails when banned literals reappear.
80. Wire the new lint script into `.github/workflows/ci.yml`.
81. Run `bun run build` and confirm bundle size delta is negligible in `Prod`.
82. Run `bunx tsgo --noEmit` end-to-end; must be clean.
83. Run `bunx vitest run` end-to-end; must be clean.
84. Run Playwright suite (`tests/e2e/*`) via `scripts/check-editor-budgets.sh` where applicable.
85. Take a screenshot of the error dialog in `Dev` mode and store under `tests/reports/error-dialog-dev.png`.
86. Take a screenshot of the header banner showing `Test` mode and store it under `tests/reports/mode-banner-test.png`.
87. Verify no `console.error` fires in `Prod` build for the synthetic error scenario used in step 55.
88. Sweep remaining `.lovable/issues/` entries touched by this plan and mark resolved ones.
89. Cross-check every completed step against `spec/02-coding-guidelines/97-acceptance-criteria.md`.
90. Cross-check every completed step against `spec/03-error-manage/97-acceptance-criteria.md`.
91. Update `RELEASE_NOTES.md` with the new mode flag and error dialog entries.
92. Update `README.md` publish section to describe the `VITE_APP_MODE` selector.
93. Update `.lovable/spec/commands/19-error-dialog-dev-mode.md` status once shipped.
94. Update `.lovable/spec/commands/20-pascalcase-no-magic-strings.md` status once shipped.
95. Update `.lovable/spec/commands/21-code-quality-boolean-and-flow.md` status once shipped.
96. Move each completed subtask file to `.lovable/plans/subtasks/43-coding-quality-error-dialog-and-mode-flag/completed/` (or flip `Status:` in place).
97. Flip this plan's `Status:` frontmatter to `completed`.
98. `mv .lovable/plans/pending/43-coding-quality-error-dialog-and-mode-flag.md .lovable/plans/completed/43-coding-quality-error-dialog-and-mode-flag.md` (creating `completed/` if missing).
99. Confirm no duplicate exists in `pending/` after the move.
100. Post a short release summary in the chat referencing the moved plan file.

## Verification

- `bunx tsgo --noEmit` clean after step 37, step 64, and step 82.
- `bunx vitest run` clean after step 38 and step 83.
- Playwright e2e (`tests/e2e/error_dialog.py`) passes after step 55.
- `scripts/check-magic-strings.sh` returns 0 after step 79.
- Screenshots (`tests/reports/error-dialog-dev.png`, `mode-banner-test.png`) exist after steps 85-86.
- Bundle produced by `bun run build` in `Prod` does not include `ErrorDialog` render code (verified via source-map inspection at step 81).
- Spec files listed in steps 66-72 diff-match the renamed identifiers.

## Appended from prior pending tasks

Pulled from `.lovable/plans/pending/` and left untouched by this plan; they remain owned by their own files and must not be re-scoped here:

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
