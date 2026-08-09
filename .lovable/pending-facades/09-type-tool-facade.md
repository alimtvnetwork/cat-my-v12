# Type Tool facade, pending real SDK

Status: fake (IndexedDB via idb-keyval, key `ca.v4.type-tool.v1`)
Owner: UI V4 seed track (Plan 86)
Facade file: src/lib/type-tool/facade.ts
Memory: .lovable/memory/features/facade-and-seed.md
Plan 86 slice: `propertyPresets` (Type + Paragraph panes)

## What the fake does

Persists a single `TypeToolPrefs` object (family / size / weight / align / lineHeight) under `ca.v4.type-tool.v1` via `idb-keyval`. Clamps out-of-range values on write. `useTypeToolPrefs()` reads via `useSyncExternalStore`. Errors logged with stable code via `logger.warn`, swallowed for UI.

## What the real SDK must do

- User-scoped prefs endpoint: `GET /me/prefs/type-tool`, `PATCH /me/prefs/type-tool`.
- Server-side clamps; server is source of truth on conflict.
- Multi-tab realtime broadcast (or invalidate on write).

## Migration checklist

- [ ] Swap facade body to call the SDK; preserve clamp behavior client-side too.
- [ ] If it becomes seed-backed (bundled preset library), adopt `DomainFacade<T>` (Plan 86 Step 22) with slice key `propertyPresets`.
- [ ] Preserve `useSyncExternalStore` subscribe semantics.
- [ ] Add integration tests.
- [ ] Move to `.lovable/pending-facades/done/` and log in `CHANGELOG.md`.
