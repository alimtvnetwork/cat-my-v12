# Canvas Prefs facade, pending real SDK

Status: fake (IndexedDB via idb-keyval, key `ca.v4.canvas-prefs.v1`)
Owner: UI V4 seed track (Plan 86)
Facade file: src/lib/canvas-prefs/facade.ts
Memory: .lovable/memory/features/facade-and-seed.md
Plan 86 slice: `propertyPresets` (Grid + Adjust panes materialize here)

## What the fake does

Single-object payload persisted under `ca.v4.canvas-prefs.v1` via `idb-keyval`. Public surface: `canvasPrefsFacade.get() / .setGrid(patch) / .setAdjust(patch) / .reset()` plus `useCanvasPrefs()` (`useSyncExternalStore`). Every write is Promise-returning; IDB errors are logged with a stable code through `logger.warn` and never surface to the UI.

## What the real SDK must do

- User-scoped prefs endpoint: `GET /me/prefs/canvas`, `PATCH /me/prefs/canvas`.
- Server merges patch with current row; client keeps optimistic local snapshot.
- Reset is a `DELETE` (or PATCH to defaults); realtime broadcast so multi-tab stays consistent.
- Error responses surface through the 3-tier funnel with stable codes.

## Migration checklist

- [ ] Swap facade body to call the SDK; keep the `.setGrid` / `.setAdjust` / `.reset` shape.
- [ ] Wrap the domain in the `DomainFacade<T>` contract (Plan 86 Step 22) if this becomes a seed slice; today it is user-scoped, not profile-seeded.
- [ ] Preserve `useSyncExternalStore` subscribe semantics.
- [ ] Preserve error-swallow discipline: the panes must never crash on transient prefs errors.
- [ ] Add integration tests.
- [ ] Move to `.lovable/pending-facades/done/` and log in `CHANGELOG.md`.
