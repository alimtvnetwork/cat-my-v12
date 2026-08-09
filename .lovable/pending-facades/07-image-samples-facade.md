# Image Samples facade, pending real SDK

Status: fake (IndexedDB via idb-keyval, through `ProjectRepositoryFacade`)
Owner: UI V4 seed track (Plan 86)
Facade file: src/lib/image-samples/facade.ts
Memory: .lovable/memory/features/facade-and-seed.md
Plan 86 slice: `samples` (SS-10 slice key)

## What the fake does

Persists `ImageSample[]` under an IndexedDB key served by `ProjectRepositoryFacade`, parsed and serialized through `parseFacadeRows` / `serializeFacadeRows`. CRUD + `subscribe` via `useSyncExternalStore`. Hydration is lazy and idempotent; validation goes through `ImageSampleSchema` (Zod) with `ImageSampleValidationError` surfaced to callers (3-tier error funnel).

## What the real SDK must do

- REST-ish endpoints: `GET /projects/:id/samples`, `POST /projects/:id/samples`, `PATCH /samples/:id`, `DELETE /samples/:id`.
- Auth: project-scoped, seeded rows carry `profile` for orchestrator isolation (SS-09 invariant 1).
- Realtime: subscribe channel per project id (or invalidate on write) so the Image Samples section stays in sync across tabs.
- Error codes surface through the same 3-tier funnel (`CapturedError` with stable code + `correlationId`).

## Migration checklist

- [ ] Swap `makeImageSamplesFacade` body to call the SDK; keep public surface (`list`, `save`, `remove`, `subscribe`) byte-identical.
- [ ] Adopt the `DomainFacade<T>` contract from `src/lib/facades/domain-facade.ts` (Plan 86 Step 22): add `upsertMany({ profileId })` + `resetProfile(profileId)` for the orchestrator (Step 25).
- [ ] Preserve seed fan-out idempotency: seeded rows (with `profile`) must not clobber user rows (without `profile`).
- [ ] Preserve `subscribe()` semantics or wire realtime; `useSyncExternalStore` snapshot must remain referentially stable when unchanged.
- [ ] Add integration tests hitting the real SDK (mocked network + at least one live-fixture smoke).
- [ ] Move this file to `.lovable/pending-facades/done/` and log completion in `CHANGELOG.md`.
