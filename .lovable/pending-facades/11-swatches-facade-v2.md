# Swatches facade, pending real SDK

Status: fake (IndexedDB via idb-keyval, key `ca.v4.swatches.v1`)
Owner: UI V4 seed track (Plan 86)
Facade file: src/lib/swatches/facade.ts
Memory: .lovable/memory/features/facade-and-seed.md
Plan 86 slice: `swatches` (SS-10 slice key)

## What the fake does

Persists an ordered hex-color list under `ca.v4.swatches.v1` via `idb-keyval`. Public surface: `listSwatches()`, `addSwatch(hex)`, `removeSwatch(hex)`, `resetSwatches()`, plus `useSwatches()` (`useSyncExternalStore`). Errors logged with stable code and swallowed for UI.

Note: supersedes `.lovable/pending-facades/06-swatches-facade.md` for Plan 86 seed integration. Keep both files until 06 is archived.

## What the real SDK must do

- Endpoints: `GET /me/swatches`, `POST /me/swatches`, `DELETE /me/swatches/:hex`, `POST /me/swatches:reset`.
- Multi-tab realtime broadcast.
- Bundled defaults ship via the seed bundle (Plan 86 Step 20) as slice `swatches` with `profile` stamp.

## Migration checklist

- [ ] Swap facade body to the SDK.
- [ ] Adopt `DomainFacade<T>` (Plan 86 Step 22) so the orchestrator (Step 25) can `upsertMany({ profileId })` bundled defaults without clobbering user swatches.
- [ ] Preserve `useSyncExternalStore` subscribe semantics.
- [ ] Add integration tests.
- [ ] Reconcile with `06-swatches-facade.md`; archive whichever is stale.
