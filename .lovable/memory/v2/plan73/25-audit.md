---
name: plan73-issue25-audit
description: Plan 73 step 28 audit of issue 25 (worker notice clip + error viz) - confirms Plan 71 residuals already shipped.
type: feature
---

# Issue 25 audit (Plan 73 step 28)

Issue: `.lovable/issues/25-worker-notice-cut-and-poor-error-visualization.md` (Status: open in file, but code residuals landed).

## Residual check

- Viewport-safe hide: `src/components/editor/validation/WorkerHealthBanner.tsx:51` uses `useViewportSafe(cardRef)` via `src/hooks/useViewportSafe.ts`; when the card would clip the viewport the component returns null. No half-visible chrome.
- Copy correlation id: `src/components/errors/GlobalErrorModal.tsx:70` writes `err.correlationId` to the clipboard and logs `[GlobalErrorModal] copied correlation id ...`. Full JSON copy at line 381.
- Notification tokens per `spec/03-error-manage/02-error-architecture/03-notification-colors.md`: applied via design tokens in `WorkerHealthBanner.tsx`.
- Error modal integration: `ErrorDialogProvider` mounts at root; `GlobalErrorModal` reads from `src/lib/errors/errorStore.ts`.

## Conclusion

All step 29 residuals are already implemented. Only bookkeeping remains: flip `.lovable/issues/25` to `Status: closed` in a follow-up slice once step 29 signs off.
