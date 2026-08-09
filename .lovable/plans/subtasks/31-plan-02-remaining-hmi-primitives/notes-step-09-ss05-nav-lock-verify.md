---
title: Step 09 - SS-05 nav-lock verification
parent: 31-plan-02-remaining-hmi-primitives
status: complete
date: 2026-07-15
---

# SS-05 nav-lock verification

Source of truth: `.lovable/plans/subtasks/02-control-automation-redesign/ss-05-nav-lock.md`.

## Files read

- `.lovable/plans/pending/31-plan-02-remaining-hmi-primitives.md:44` (Step 9)
- `.lovable/plans/subtasks/02-control-automation-redesign/ss-05-nav-lock.md:1-30`
- `src/routes/setup.tsx:1-25`
- `src/routes/settings.tsx:1-15`
- `src/lib/run-store.ts` (referenced by both routes)

## Root cause / gap

Step 9 asks to confirm that the SS-05 point 4 redirect (`beforeLoad` throws
`redirect({ to: "/run" })` when `useRunStore.getState().status === "running"`)
has actually landed in the two locked route trees.

## Signal

- `src/routes/setup.tsx:5-11`: `beforeLoad` present, imports `redirect` and
  `useRunStore`, checks `status === "running"`, throws `redirect({ to: "/run" })`.
- `src/routes/settings.tsx:4-10`: same shape at the `/settings` layout route,
  so every `/settings/*` child inherits the guard.
- `/run` and `/errors` have no `beforeLoad` redirect (verified: no
  `useRunStore` import in `src/routes/run.tsx` or `src/routes/errors.tsx`
  route config), matching SS-05 point 5.

## Deviation from spec text

Spec sample uses `/setup/` (trailing slash, index route). Shipped code uses
`/setup` on the flat route `src/routes/setup.tsx`. Behaviour is equivalent
under TanStack Router: the guard fires on any match beginning at `/setup`.
No action required, tracked here for the SS-05 status flip in Step 42.

## Outstanding for SS-05 completion (Step 42)

- Read-only `ToolRibbon` (Steps 23-25) still open.
- Titlebar `aria-disabled` + `pointer-events-none` on non-run nav items:
  verify in Step 42 against `GlobalNav` implementation before flipping
  status to completed.

## Next step

Step 10: read `ss-09-elevation-focus.md` and list focus-ring token
requirements before adding `--ca-focus` in Step 26.
