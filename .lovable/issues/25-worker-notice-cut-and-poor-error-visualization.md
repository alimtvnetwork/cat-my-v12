---
Slug: worker-notice-cut-and-poor-error-visualization
Status: closed
Created: 2026-07-17
Closed: 2026-07-18
Resolved-by: Plan 71 residuals + Plan 73 step 28 audit (v3.497.0)
---

# Worker notice clipped; error visualization not per spec

## Symptom

Worker-offline floating card (top-right) is visibly cut on the right edge (see user screenshot). Overall error/notification visualization does not follow `spec/03-error-manage/` (notification color tokens, error modal, error history, error code registry, suppress-global-error).

## Expected

- If the notice would be clipped by the viewport, hide it entirely (no half-visible chrome).
- Toasts/notices follow `spec/03-error-manage/02-error-architecture/03-notification-colors.md` tokens.
- Detailed errors surface via the Error Modal per `04-error-modal/` with "View Details", history, and code registry mapping.

## Actual

- `WorkerHealthBanner` renders a fixed top-right card that clips on narrow/split viewports and uses ad-hoc styling, not spec tokens.
- No integration with error store, error modal, or error code registry.

## Related files

- `src/components/editor/validation/WorkerHealthBanner.tsx`
- `src/components/ui/sonner.tsx`
- `src/routes/__root.tsx`
- `spec/03-error-manage/**`

Linked plan: `.lovable/plans/pending/71-error-manage-visualization-and-worker-notice.md`.
