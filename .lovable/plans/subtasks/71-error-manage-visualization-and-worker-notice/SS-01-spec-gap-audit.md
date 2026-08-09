---
Slug: spec-gap-audit
Parent: 71-error-manage-visualization-and-worker-notice
Status: completed
Created: 2026-07-17
---

# SS-01 Spec gap audit

Scope of spec read: every `.md` under `spec/03-error-manage/{01-error-resolution,02-error-architecture,03-error-code-registry}` (110+ files). Below is the compliance gap between the spec and the shipped app.

## Canonical shapes required by spec

- `CapturedError` interface with 40+ fields (identity, frontend location, API request, trigger, backend logs, PHP frames, click path, execution logs, envelope). Source: `02-error-architecture/04-error-modal/03-error-modal-reference/01-data-model.md`.
- Zustand `errorStore` with `captureError`, `captureException`, `openErrorModal`, `openErrorQueue`, `navigateQueue`, `closeErrorModal`, `recentErrors`, `errorQueue`, `pendingSync`. Source: `02-react-components/02-error-store.md`.
- `GlobalErrorModal` component tree under `src/components/errors/` (14 files: modal shell, Backend/Frontend/Delegated sections, tabs, actions, badge, drawer, boundary, report generator, log adapter). Source: `02-react-components/05-component-hierarchy.md`.
- Notification color tokens: `--toast-{base,success,error,warning,info}-{bg,fg,border,desc,shadow}` in `src/index.css` / `src/styles.css`. Source: `02-error-architecture/03-notification-colors.md`.
- Design tokens: `--destructive`, `--warning`, `--success`, `--info` (light and dark). Source: `04-color-themes/01-design-tokens.md`.
- `suppressGlobalError` React Query meta wiring at `QueryClient` construction with `QueryCache`/`MutationCache` `onError` calling `showGlobalError()` that dispatches to `errorStore`. Source: `04-error-modal/06-suppress-global-error.md`.
- Error history persistence (IndexedDB) with CRUD hooks + sync queue. Source: `04-error-modal/05-error-history-persistence.md`.
- Error code registry loaded from `error-codes-master.json` with typed lookup + collision validator + integration hooks. Source: `03-error-code-registry/{01,02,05}`.
- Global error handler policy: `toast.error(message, { action: { label: "View Details", onClick: openErrorModal } })`; `E9005` auto-opens the modal without a toast; durations `10s` normal, `15s` on 5xx. Source: `03-notification-colors.md` §3.
- Floating notices must never be half-clipped. Source: our own command `.lovable/spec/commands/25-hide-clipped-floating-notices.md`.

## What ships today

- `src/components/BugErrorModal.tsx` (107 lines): a minimal `alertdialog` that listens for `ca:bug-error` `CustomEvent`, shows `Code`, `CorrelationId`, and a Copy button. No tabs, no queue, no store, no history, no registry integration.
- `src/lib/error-capture.ts` (27 lines): global window `error` and `unhandledrejection` listeners that record the last error into a module-level variable with a 5s TTL for `server.ts` recovery. Not wired to a store or modal.
- `src/components/editor/validation/WorkerHealthBanner.tsx` (138 lines): fixed `top-16 right-4 max-w-xs` card. Uses ad-hoc `ca-*` tokens, not the spec notification tokens. No integration with `errorStore` or `ErrorModal`. Not guarded against viewport clipping (root cause of the user's screenshot: at narrow widths `right-4` still overflows because parent stacking contexts and page scroll do not reserve space).
- `src/routes/__root.tsx` mounts `<BugErrorModal />` once. Sonner `<Toaster />` mounted globally. No `GlobalErrorModal`, no `ErrorHistoryDrawer`, no `ErrorQueueBadge`.
- Toast callers across `src/routes/setup.rules.tsx`, `setup.functions.tsx`, `setup.chain-events.tsx`, `src/components/hmi/DeviceDiscoveryPanel.tsx`: call `toast.error/success/warning` directly with strings; no `action: { label: "View Details" }` wiring, no registry code, no capture.
- No `errorStore.ts`, no `errors/` component folder, no `error-codes-master.json` import, no `suppressGlobalError` meta usage, no error history table.

## Gap summary (per spec area)

| Spec area                  | Required                            | Present                             | Delta                      |
| -------------------------- | ----------------------------------- | ----------------------------------- | -------------------------- |
| Data model `CapturedError` | interface + supporting types        | none                                | missing entirely           |
| Error store                | Zustand store, 10 actions           | none                                | missing entirely           |
| Global modal               | 14-file tree                        | `BugErrorModal.tsx` only            | ~93% missing               |
| Notification tokens        | 25+ CSS vars                        | none in `src/styles.css` for toasts | missing entirely           |
| `suppressGlobalError`      | Query/Mutation cache onError wiring | none                                | missing entirely           |
| Error history              | IndexedDB store + drawer + hooks    | none                                | missing entirely           |
| Registry                   | JSON import + lookup + validator    | none                                | missing entirely           |
| Clipping guard             | hide when off-screen                | not implemented                     | root cause of reported bug |

## Root cause of the reported screenshot (one sentence)

`WorkerHealthBanner` positions itself at `fixed top-16 right-4` with no guard for horizontal overflow relative to the header's inner content or viewport width, so at the current split-view width the card is drawn partially outside the visible layout instead of being suppressed as the command requires.

## Priority order for Plan 71 execution

1. Ship `useViewportSafe` + `WorkerHealthBanner` clipping guard (fixes user's immediate bug).
2. Restyle worker notice using notification tokens (visual alignment to spec).
3. Land `errorStore` + `CapturedError` types + registry lookup (foundation for everything else).
4. Land `GlobalErrorModal` shell with Frontend section first (JS-only surfaces are what we currently render), then error history drawer.
5. Wire `suppressGlobalError` and `showGlobalError` helper.
6. Replace direct `toast.error` at call sites with `showApiError(err)` helper.
