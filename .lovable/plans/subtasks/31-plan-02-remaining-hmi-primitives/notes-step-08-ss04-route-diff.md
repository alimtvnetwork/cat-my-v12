---
title: Step 08 - SS-04 route diff
parent: 31-plan-02-remaining-hmi-primitives
status: complete
date: 2026-07-15
---

# SS-04 route diff

Source of truth: `.lovable/plans/subtasks/02-control-automation-redesign/ss-04-routes.md`.

## Files read

- `.lovable/plans/pending/31-plan-02-remaining-hmi-primitives.md:37-42`
- `.lovable/plans/subtasks/02-control-automation-redesign/ss-04-routes.md:7-30`
- `.lovable/plans/subtasks/31-plan-02-remaining-hmi-primitives/notes-step-07-ss03-inventory.md:18-31`
- `spec/coding-guidelines/typescript.md:14-51`
- `.lovable/memory/index.md:1-27`
- `.lovable/memory/04-design-system.md:1-24`
- `.lovable/memory/07-lovable-folder-guide.md:34-50`
- `src/routes/__root.tsx:76-98,115-124`
- `src/routes/index.tsx:6-18`
- `src/routes/setup.tsx:5-25`
- `src/routes/setup.roi.tsx:4-16`
- `src/routes/setup.reference.tsx:4-16`
- `src/routes/settings.tsx:4-15`
- `src/routes/settings.index.tsx:35-43`
- `src/routes/settings.camera.tsx:4-12`
- `src/routes/settings.trigger.tsx:4-12`
- `src/routes/settings.lighting.tsx:4-12`
- `src/routes/settings.license.tsx:12-21`
- `src/routes/run.tsx:6-18`
- `src/routes/errors.tsx:5-13`
- `src/routes/ops.tsx:21-39`
- `src/routes/results.tsx:7-15`

## Before signal

`test -f .lovable/plans/subtasks/31-plan-02-remaining-hmi-primitives/notes-step-08-ss04-route-diff.md` returned `missing`.

## Actual route IDs found

| File                               |             Route ID |                    SS-04 expected | Result                                                               |
| ---------------------------------- | -------------------: | --------------------------------: | -------------------------------------------------------------------- |
| `src/routes/__root.tsx`            |                 root |                     existing root | matches, root has `head()` and `<Outlet />`                          |
| `src/routes/index.tsx`             |                  `/` |              `/` Boot to `/setup` | route exists, content differs from Boot requirement                  |
| `src/routes/setup.tsx`             |             `/setup` | `/setup` layout with `<Outlet />` | route exists, but currently renders `EditorSetupExperience` directly |
| `src/routes/setup.index.tsx`       |              missing |           `/setup` leaf workspace | missing                                                              |
| `src/routes/setup.roi.tsx`         |         `/setup/roi` |                      `/setup/roi` | matches                                                              |
| `src/routes/setup.reference.tsx`   |   `/setup/reference` |                `/setup/reference` | matches                                                              |
| `src/routes/settings.tsx`          |          `/settings` |                `/settings` layout | matches, renders `<Outlet />`                                        |
| `src/routes/settings.camera.tsx`   |   `/settings/camera` |                `/settings/camera` | matches                                                              |
| `src/routes/settings.trigger.tsx`  |  `/settings/trigger` |               `/settings/trigger` | matches                                                              |
| `src/routes/settings.lighting.tsx` | `/settings/lighting` |              `/settings/lighting` | matches                                                              |
| `src/routes/run.tsx`               |               `/run` |                            `/run` | matches                                                              |
| `src/routes/errors.tsx`            |            `/errors` |                         `/errors` | matches                                                              |

## Additional routes present outside SS-04

- `src/routes/settings.index.tsx` with route ID `/settings/`.
- `src/routes/settings.license.tsx` with route ID `/settings/license`.
- `src/routes/ops.tsx` with route ID `/ops`.
- `src/routes/results.tsx` with route ID `/results`.

These are later product surfaces, not blockers for SS-04 primitive migration, but `/settings/` uses a trailing slash route ID and should be revisited only if a route-tree mismatch or navigation issue appears.

## Route-lock status from this diff

- `src/routes/setup.tsx:5-10` redirects to `/run` when `useRunStore.getState().status === "running"`.
- `src/routes/settings.tsx:4-10` redirects to `/run` when `useRunStore.getState().status === "running"`.
- Child settings routes inherit the settings layout guard.
- `setup.roi.tsx` and `setup.reference.tsx` are children of `/setup`, so they inherit the setup guard.

## Follow-up

Proceed to Step 09: read `ss-05-nav-lock.md` and confirm the current route-level redirects plus UI disabled state acceptance. Do not modify `src/routeTree.gen.ts`.

## After signal

This file now exists and records the SS-04 diff evidence required before primitive creation.
