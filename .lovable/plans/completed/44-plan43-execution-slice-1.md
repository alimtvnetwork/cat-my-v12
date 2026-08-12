# Plan 43 execution slice 1, app-mode + error dialog foundation

Slug: plan43-execution-slice-1
Steps: 5
Status: done
Created: 2026-07-16

## Context

First executable slice of `.lovable/plans/pending/43-coding-quality-error-dialog-and-mode-flag.md`. Lands the `AppMode` flag, the shared-constants barrel, and the `ErrorDialogProvider` skeleton so the rest of plan 43 can rename call sites against real modules. No renames of existing identifiers in this slice; scaffolding only. Related commands: `.lovable/spec/commands/19-error-dialog-dev-mode.md`, `.lovable/spec/commands/20-pascalcase-no-magic-strings.md`, `.lovable/spec/commands/21-code-quality-boolean-and-flow.md`.

## Steps

1. Add `src/lib/app-mode.ts` exporting `AppMode = { Dev, Test, Prod } as const`, `getAppMode()` reading `import.meta.env.VITE_APP_MODE` (default `Dev`), and `isDialogVisibleMode(mode)`; wire `VITE_APP_MODE` env default in `vite.config.ts` and add `.env.development` / `.env.test`.
2. Create `src/lib/constants/` barrel with `http.ts`, `storage.ts`, `events.ts`, `ipc.ts`, `error-codes.ts`, `camera.ts`, `sample-library.ts`, and `index.ts` re-export; populate each with the literals inventoried by plan 43 steps 10-15 (no call-site edits yet).
3. Add `src/lib/errors/error-record.ts` (`ErrorRecord` type) and `src/lib/errors/error-bus.ts` (`reportError`, subscribe/unsubscribe, `window.onerror` + `window.onunhandledrejection` binders exported as `installGlobalErrorHandlers()`).
4. Add `src/components/errors/ErrorDialog.tsx` and `src/components/errors/ErrorDialogProvider.tsx`; mount the provider in `src/routes/__root.tsx` around `<Outlet />`, gated by `isDialogVisibleMode(getAppMode())`, with a generic toast fallback in `Prod`.
5. Verify: run `bunx tsgo --noEmit` and `bunx vitest run`, then Playwright script `tests/e2e/error_dialog.py` that dispatches a synthetic error and asserts the modal is visible when `VITE_APP_MODE=Dev` and hidden when `VITE_APP_MODE=Prod`; store screenshots at `tests/reports/error-dialog-dev.png` and `tests/reports/error-dialog-prod.png`.

## Verification

- `bunx tsgo --noEmit` exits 0 after step 4.
- `bunx vitest run` exits 0 after step 4.
- Playwright script in step 5 passes both `Dev` and `Prod` assertions; both PNGs exist under `tests/reports/`.
- `getAppMode()` returns `Dev` when no env override is set (dev server) and the injected value under `.env.test` / publish override.
- No existing identifier is renamed in this slice (grep diff limited to new files plus `__root.tsx` and `vite.config.ts`).

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
