# CameraSetting facade wrap, pending real SDK

Status: wrap over existing `src/lib/camera/store.ts` (localStorage-backed)
Owner: Vision HMI team
Facade file: src/lib/camera/facade.ts
Memory: .lovable/memory/features/facade-and-seed.md

## What the fake does

Introduces the standard facade surface (`list`, `get`, `create`, `update`, `remove`, `duplicate`, `subscribe`) over the existing localStorage-backed camera store shipped in Plan 78 slices 1-8. Does NOT re-persist: reads and writes flow through the existing store helpers (`readCameraLibrarySync`, `upsertCameraSettingSync`) so bundle round-trips and Playwright fixtures keep working. Subscribe uses the existing store's listener list.

## What the real SDK must do

- REST: `GET /camera-settings`, `POST`, `PATCH`, `DELETE`, `POST /:id/duplicate`.
- Live-preview enumeration remains gated by worker build (I-BE-04); the facade does not own preview.
- Errors: 409 referenced-by-project, 422 schema.

## Migration checklist

- [ ] Migrate storage from localStorage to SDK; keep facade interface stable.
- [ ] Merge legacy localStorage entries on first boot (one-shot import).
- [ ] Preserve `subscribe()` semantics.
- [ ] Preserve seed fan-out idempotency.
- [ ] Integration tests including bundle export/import round-trip.
- [ ] Remove this file (or move to `done/`).
