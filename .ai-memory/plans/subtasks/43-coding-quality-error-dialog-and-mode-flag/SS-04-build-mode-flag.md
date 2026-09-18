---
Slug: build-mode-flag
Status: pending
Created: 2026-07-16
Parent: 43-coding-quality-error-dialog-and-mode-flag
---

# SS-04 Build-mode flag

## Goal

Introduce a compile-time `AppMode` flag with a publish-time selector.

## Files

- `src/lib/app-mode.ts` -> `AppMode`, `getAppMode()`, `isDialogVisibleMode(mode)`.
- `vite.config.ts` -> read `VITE_APP_MODE` env, default `Dev`.
- `.env.development` -> `VITE_APP_MODE=Dev` (default).
- `.env.test` -> `VITE_APP_MODE=Test`.
- `.env.production` -> unset; publish flow injects.

## Publish flow

- The publish dialog (Lovable-managed) accepts a mode via env override; document that operators must set `VITE_APP_MODE` to `Dev`, `Test`, or `Prod` before clicking publish.
- Add a banner in the app header (visible only when mode != `Prod`) showing the current mode.

## Verification

- `getAppMode()` returns the injected value at runtime.
- Dev server always resolves to `Dev`.
- Prod build strips dialog UI dead code via tree-shaking (verify with `bunx vite build` size delta).
