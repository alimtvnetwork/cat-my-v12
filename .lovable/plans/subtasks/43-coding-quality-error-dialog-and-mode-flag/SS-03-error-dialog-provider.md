---
Slug: error-dialog-provider
Status: pending
Created: 2026-07-16
Parent: 43-coding-quality-error-dialog-and-mode-flag
---

# SS-03 ErrorDialogProvider

## Goal

Ship a single error-dialog surface driven by AppMode.

## Files

- `src/lib/errors/error-bus.ts` -> `reportError(err, context)`, subscribe API.
- `src/lib/errors/error-record.ts` -> `ErrorRecord` type (code, message, correlationId, stack, timestamp, mode).
- `src/components/errors/ErrorDialogProvider.tsx` -> React context + modal.
- `src/components/errors/ErrorDialog.tsx` -> visual dialog (copy button, stack, code chip, "dismiss all").
- Wire into `src/routes/__root.tsx` around `<Outlet />`.

## Behaviour matrix

| Mode | Uncaught error                        | reportError() | Toast   |
| ---- | ------------------------------------- | ------------- | ------- |
| Dev  | modal + toast                         | modal         | full    |
| Test | modal + toast                         | modal         | full    |
| Prod | silent modal (hidden) + generic toast | log only      | generic |

## Wiring

- Global handlers: `window.onerror`, `window.onunhandledrejection`, React error boundary at `__root`.
- Read mode from `getAppMode()` in `src/lib/app-mode.ts`.

## Spec sync

Update `spec/03-error-manage/02-error-architecture/04-error-modal/02-react-components.md` to describe the new provider, mode gating, and PascalCase names.
