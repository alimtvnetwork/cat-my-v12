# SS-04 panel float capability audit

Slug: panel-float
Parent: 73-ui-issues-closeout-sweep
Status: pending
Created: 2026-07-18

## Scope

Issue 21: some panels cannot float / drag out of dock though `DockableFrame` supports it.

## Steps

1. Audit `src/lib/panels/panel-registry.ts` for entries missing `defaultFloatSize`.
2. Ensure every registered panel exposes a drag grip in its header (`data-drag-handle="panel-header"`).
3. Confirm `DockableFrame` reads the grip and starts a drag session; float target lands under a `#panel-float-layer` portal in `__root.tsx`.
4. Add e2e case: drag the Tools panel header 200px right, panel is now floating, drag back onto left dock target, panel re-docks.

## Verification

- Every registry entry has a defined float size.
- Playwright drag-to-float case passes; screenshot at `/tmp/browser/plan73/21-float.png`.
