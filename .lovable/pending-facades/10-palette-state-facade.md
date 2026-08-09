# Palette State facade, pending real SDK

Status: fake (IndexedDB via `ProjectRepositoryFacade`, key `ca:palette-state:v1`)
Owner: UI V4 seed track (Plan 86)
Facade file: src/lib/palette/facade.ts
Memory: .lovable/memory/features/facade-and-seed.md
Plan 86 slice: `propertyPresets` (Layers / Channels / Paths body state per rule)

## What the fake does

Stores `Record<ruleId, PaletteState>` under `ca:palette-state:v1` through the shared `ProjectRepositoryFacade` seam. Persists visibility, lock, and display order for Channels + Paths per rule (Layers rows still derive from `rule.conditions`). `usePaletteState(ruleId)` reads via `useSyncExternalStore`.

## What the real SDK must do

- Endpoints: `GET /rules/:id/palette-state`, `PUT /rules/:id/palette-state`.
- Auth: caller must have write access to the rule.
- Realtime: multi-tab or multi-user editors need change notifications.

## Migration checklist

- [ ] Swap the facade body to the SDK.
- [ ] If bundled default palette configs ship in the seed bundle, adopt `DomainFacade<T>` (Plan 86 Step 22) with slice key `propertyPresets`.
- [ ] Preserve `useSyncExternalStore` subscribe semantics.
- [ ] Add integration tests.
- [ ] Move to `.lovable/pending-facades/done/` and log in `CHANGELOG.md`.
