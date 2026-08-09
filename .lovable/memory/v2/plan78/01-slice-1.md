# Plan 78 slice 1: I-SU-05 camera setup surface

Date: 2026-07-18
Version: v3.530.0

## Files

- `src/lib/camera/model.ts` (new): Zod schema + defaults + validators, keyed to `spec/24-app-ui-design-system/17-camera-setup.md` sections 3 and 5.
- `src/lib/camera/store.ts` (new): subscribable store, `StorageLike` injection, `onFailure` callback surfaces persist + validation failures. No swallowed errors.
- `src/routes/setup.camera.tsx` (new): list + editor UI with Identity / Optics / Exposure / Acquisition / Notes groups.
- `src/components/app-shell/SetupTiles.tsx`: Camera Setup tile now routes to `/setup/camera` (record library). `/settings/camera` still available for live tuning.

## Root cause statement

I-SU-05 was stubbed: `settings.camera.tsx` showed a single tuning dialog and there was no CameraSetting record store, so users could not create the object the spec requires projects to reference.

## Verification

- tsgo clean.
- Manual: `/setup/camera` renders empty state, New button creates a defaulted record persisted under `ca.camera.library.v1`, editor edits validate through Zod, delete removes.

## Blockers acknowledged

- Enumerate Devices button rendered disabled with tooltip pointing at I-BE-04. Live preview + Test Capture not shipped for the same reason.
