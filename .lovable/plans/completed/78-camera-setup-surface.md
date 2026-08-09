# Camera setup surface (I-SU-05)

Slug: camera-setup-surface
Steps: 2 (slice 1 of the I-SU-05 backlog)
Status: completed
Created: 2026-07-18

## Context

I-SU-05 (V2 pending row, `spec/24-app-ui-design-system/99d-ui-improvements-v2-enhancement.md`) was the only V2 pending item with no ambiguity blocker. Spec is `spec/24-app-ui-design-system/17-camera-setup.md`. Server-side hooks (Enumerate Devices, Test Capture, live MJPEG stream) remain blocked on the worker build (I-BE-04). Slice 1 delivers the client-side data model, storage, and UI so a user can create, edit, list, and delete CameraSetting records; server hooks show as disabled affordances with a tooltip.

## Steps

1. Model + store: `src/lib/camera/model.ts` (Zod schema mirroring spec section 17, `validateCameraSetting`, `upsertCameraSetting`, `deleteCameraSetting`, default factory) and `src/lib/camera/store.ts` (subscribable store with injected `StorageLike`, `onFailure` callback, never swallows errors). Storage key `ca.camera.library.v1`.
2. Route: `src/routes/setup.camera.tsx` renders list + editor with four grouped sections (Identity, Optics, Exposure, Acquisition) plus Notes; delete confirmed by the shared toast system; Enumerate Devices button rendered as disabled with `title` explaining the I-BE-04 gate. `SetupTiles` Camera Setup tile now points at `/setup/camera` (record library); `/settings/camera` remains the single live-preview tuning surface.

## Exit criteria

- `/setup/camera` route mounts, creates, edits, deletes CameraSetting records persisted to `localStorage` under `ca.camera.library.v1`.
- Zod validation errors surface via `showToastError` (never silent).
- tsgo clean.

## Follow-ups (not in this slice)

- Enumerate Devices + Test Capture wire-up (blocked on I-BE-04 worker build).
- Live MJPEG preview in Exposure section.
- ROI selector in Acquisition section (needs canvas overlay from ROI editor).
- Project ↔ CameraSetting binding surface (`spec/24-app-ui-design-system/16-project-lifecycle.md` step 85).
