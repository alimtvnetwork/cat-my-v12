---
Slug: error-manage-visualization-and-worker-notice
Status: pending
Steps: 20
Created: 2026-07-17
---

# Error-manage visualization + worker notice fix

## Context

Worker-offline floating card is visibly clipped and overall error UI does not follow `spec/03-error-manage/`. This plan aligns notifications, error modal, error history, and error-code registry with the spec, and enforces "hide when clipped" for floating notices.

Linked:

- Issue: `.lovable/issues/25-worker-notice-cut-and-poor-error-visualization.md`
- Command: `.lovable/spec/commands/25-hide-clipped-floating-notices.md`
- Spec root: `spec/03-error-manage/`

## Steps

1. Read every file under `spec/03-error-manage/01-error-resolution/`, `02-error-architecture/`, `03-error-code-registry/` and produce a short compliance-gap note at `./subtasks/71-error-manage-visualization-and-worker-notice/SS-01-spec-gap-audit.md`.
2. Inventory current error/notification surfaces in `src/` (toasts, banners, dialogs, `WorkerHealthBanner`, sonner setup, error boundaries) into `./subtasks/71-.../SS-02-code-inventory.md`.
3. Add a `useViewportSafe(ref)` hook that returns `false` when a fixed element's bounding rect would clip the viewport; place under `src/hooks/useViewportSafe.ts` with unit test.
4. Refactor `src/components/editor/validation/WorkerHealthBanner.tsx` to hide entirely when clipped (per command 25) and only render on `unreachable` state after data loaded.
5. Restyle the worker notice using notification tokens from `spec/03-error-manage/02-error-architecture/03-notification-colors.md` (`--toast-error-*`) instead of ad-hoc classes.
6. Wire the notice's "Retry" and "Details" actions to open the Error Modal per `04-error-modal/03-error-modal-reference.md`.
7. Implement/adopt the Zustand error store described in `04-error-modal/02-react-components/02-error-store.md` at `src/stores/errorStore.ts` (or align existing store).
8. Implement TypeScript interfaces from `04-error-modal/02-react-components/01-typescript-interfaces.md` in `src/types/errors.ts`.
9. Build `ErrorModal` component tree per `05-component-hierarchy.md` + `06-component-source.md` under `src/components/errors/` (tabs: Summary, Stack, Context, History).
10. Mount `<ErrorModal />` once in `src/routes/__root.tsx` below `<Outlet />`, driven by the error store.
11. Integrate error-code registry: import `spec/03-error-manage/03-error-code-registry/error-codes-master.json` into `src/lib/errors/registry.ts` with typed lookup.
12. Map worker-health failure to a registry code (e.g. `E9003` network) and pass through the modal on Details.
13. Add `suppressGlobalError` React Query meta support per `06-suppress-global-error.md` in the shared `QueryClient` config.
14. Replace hand-rolled toast styling with spec tokens in `src/components/ui/sonner.tsx` (success/error/warning/info/base) and remove leftover in-header banners.
15. Add error history persistence per `05-error-history-persistence.md` (IndexedDB via existing facade) with CRUD hooks.
16. Add "View Details" affordance to every `toast.error` call site via a shared helper `showApiError(err)` in `src/lib/errors/notify.ts`.
17. Add regression Playwright test extending `tests/visual/header-and-worker-notice.spec.ts` to assert: (a) notice never overflows viewport, (b) notice is hidden when width < threshold, (c) Details opens the modal.
18. Add unit tests for `useViewportSafe`, error store reducers, and registry lookup under `src/**/__tests__/`.
19. Update `spec/03-error-manage/97-acceptance-criteria.md` and `99-consistency-report.md` to reflect the shipped implementation.
20. Run `scripts/ci-v3.sh` green, bump version, then `mv` this plan file into `.lovable/plans/completed/71-...md` and flip `Status: completed`.

## Verification

- CI gate green (typecheck, eslint --max-warnings=0, vitest, visual regression).
- Manual: shrink viewport; worker notice disappears instead of clipping.
- Manual: trigger a network error; toast + modal appear with registry code and history entry.
- Screenshots captured under `/tmp/browser/71-error-manage/`.

## Appended from prior pending tasks

None (unrelated pending plans 29/35/36/41/43/50 remain in `.lovable/plans/pending/`).
