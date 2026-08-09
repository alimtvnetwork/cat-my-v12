---
Slug: code-inventory
Parent: 71-error-manage-visualization-and-worker-notice
Status: completed
Created: 2026-07-17
---

# SS-02 Current error/notification surface inventory

Every file under `src/` that renders, captures, dispatches, or forwards an error or toast. Grouped by role.

## Rendering surfaces (visual chrome)

| File                                                              | Kind                | Notes                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/editor/validation/WorkerHealthBanner.tsx`         | Fixed floating card | `top-16 right-4 max-w-xs`. No clipping guard. Ad-hoc `ca-*` tone tokens. Not the spec's `--toast-error-*` tokens. Mounted twice: floating in `src/routes/__root.tsx`, compact in `src/components/editor/validation/ValidateAgainstImageDialog.tsx`. |
| `src/components/BugErrorModal.tsx`                                | Modal (alertdialog) | Global bug surface via `ca:bug-error` event. Missing tabs, queue, history, registry integration required by spec. Mounted in `src/routes/__root.tsx`.                                                                                               |
| `src/components/ui/sonner.tsx`                                    | Toaster host        | Renders sonner globally; no spec token classes on toast variants.                                                                                                                                                                                   |
| `src/components/editor/validation/ValidateAgainstImageDialog.tsx` | Dialog              | Consumes compact `WorkerHealthBanner`.                                                                                                                                                                                                              |

## Toast callers (per spec §3.3, must gain `action: View Details` where they surface API failures)

| File                                          | Lines                                                                     | Types                            |
| --------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------- |
| `src/routes/setup.rules.tsx`                  | 158, 162, 178, 189, 229, 239, 252, 261, 274, 279, 289, 296, 300, 522, 526 | success, error, warning, message |
| `src/routes/setup.functions.tsx`              | 42, 45, 81, 91, 110, 118, 120                                             | error, success, warning          |
| `src/routes/setup.chain-events.tsx`           | 57, 63, 114                                                               | error                            |
| `src/components/hmi/DeviceDiscoveryPanel.tsx` | 83-84                                                                     | error (with dismiss chain)       |

None currently pass `{ action: { label: "View Details", onClick: openErrorModal } }`.

## Capture / dispatch layer

| File                                     | Role                                                                                                           | Gap                                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/lib/error-capture.ts`               | Global `error` + `unhandledrejection` listener, stashes last error for SSR handler recovery (`src/server.ts`). | Does not build a `CapturedError` or feed the store; TTL-scoped side channel only. |
| `src/lib/constants/events.ts`            | Exports `AppEvent.BugError` used by `surfaceBugError`.                                                         | Fine as-is; keep for backwards compat, wrap in `errorStore.captureException`.     |
| `src/lib/editor/validation.functions.ts` | Worker health probe path; errors reduced to `WorkerHealthBanner` state.                                        | Not routed to `errorStore` today.                                                 |
| `src/server.ts`                          | Uses `consumeLastCapturedError()` when h3 swallows the throw.                                                  | Keep, but also stream to registry-coded log.                                      |

## Root mounts

`src/routes/__root.tsx` currently mounts, in order:

- `<Toaster />` (sonner)
- `<BugErrorModal />`
- `<WorkerHealthBanner />`
- `<Outlet />`

Plan 71 additions must mount `<GlobalErrorModal />` and `<ErrorHistoryDrawer />` here after the existing modal, and move the `WorkerHealthBanner` render behind the viewport-safe guard (Step 3).

## Files that will be created (per Plan 71 Steps 3-16)

- `src/hooks/useViewportSafe.ts` (+ `__tests__/`)
- `src/stores/errorStore.ts`
- `src/types/errors.ts`
- `src/lib/errors/registry.ts` (imports the spec JSON)
- `src/lib/errors/notify.ts` (`showApiError`)
- `src/components/errors/{GlobalErrorModal,FrontendSection,BackendSection,DelegatedLogsSection,ErrorModalActions,ErrorQueueBadge,ErrorHistoryDrawer,AppErrorBoundary,errorReportGenerator,ErrorModalTypes}.tsx|ts`

## Files that will be modified

- `src/components/editor/validation/WorkerHealthBanner.tsx` (clipping guard + token restyle)
- `src/components/ui/sonner.tsx` (spec token classes)
- `src/styles.css` (add `--toast-*` tokens)
- `src/routes/__root.tsx` (mount new modal + drawer)
- All 4 toast-caller files above (route error toasts through `showApiError`)

Nothing else should change surface behavior outside these files.
