# Non-domain seed slices, pending real SDK

Status: pending fake (no facade file yet; bundled JSON only)
Owner: UI V4 seed track (Plan 86)
Facade files: to be created under `src/lib/<slice>/facade.ts` in Plan 86 Step 29+
Memory: .lovable/memory/features/facade-and-seed.md
Plan 86 slices: `settings`, `commands`, `emptyStates`, `errorScenarios` (SS-10 slice keys)

## What the fake will do

Each slice is populated in `src/lib/seed/data/bundle.v2.json` (Plan 86 Steps 20-21). During Plan 86 Step 23, an in-memory facade exists via `createMemoryDomainFacade<T>('<slice>')` (`src/lib/facades/memory-domain-facade.ts`), used by tests. UI wiring in Step 29+ will thread the same interface. When persistence is required, each slice gets its own `src/lib/<slice>/facade.ts` following the `DomainFacade<T>` contract (Plan 86 Step 22).

## What the real SDK must do

- `settings`: per-user prefs collection, `GET/PATCH /me/settings/:key`. Realtime for multi-tab.
- `commands`: bundled command palette entries; server may add tenant-scoped commands via `GET /commands`.
- `emptyStates`: purely bundled copy; no user writes. May stay client-only.
- `errorScenarios`: bundled sample error rows for the Error History drawer; no user writes.

## Migration checklist

- [ ] Create `src/lib/<slice>/facade.ts` for each slice that needs runtime persistence; implement `DomainFacade<T>` (Plan 86 Step 22).
- [ ] Point the orchestrator (Step 25) at these facades via `DomainFacadeRegistry`.
- [ ] Bundled-only slices (`emptyStates`) may stay behind a read-only facade over the JSON bundle.
- [ ] Preserve `useSyncExternalStore` subscribe semantics for slices consumed by React.
- [ ] Add per-slice unit tests and orchestrator integration tests.
- [ ] Update this file (or split into per-slice TODOs) once real endpoints land; archive to `done/`.
