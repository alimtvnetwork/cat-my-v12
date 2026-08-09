# SS-09 Facade Contract Additions (Frozen)

Plan: 86-ui-v4-json-seed-facade-completion
Step: 9
Status: frozen
Date: 2026-07-19
Supersedes: SS-03-facade-contracts.md (initial stub)

## Layered contract

Plan 86 keeps the existing `UiSeedFacade` (bundle read: `load`, `getSlice`,
`subscribe`) untouched. Fan-out to per-domain storage happens through a new
`DomainFacade<T>` contract, one instance per slice. The orchestrator
(Step 25) reads the bundle via `UiSeedFacade` then calls the matching
`DomainFacade` per slice in dependency order.

Slice -> DomainFacade module (target locations):

- `projects` -> `src/lib/facades/projects-facade.ts`
- `categories` -> `src/lib/facades/categories-facade.ts`
- `rulesets` -> `src/lib/facades/rulesets-facade.ts`
- `rules` -> `src/lib/facades/rules-facade.ts`
- `cameras` -> `src/lib/facades/cameras-facade.ts`
- `micSettings`-> `src/lib/facades/mic-settings-facade.ts`
- `samples` -> `src/lib/facades/samples-facade.ts`
- `swatches` -> `src/lib/facades/swatches-facade.ts`
- `presets` -> `src/lib/facades/presets-facade.ts`
- `settings` -> `src/lib/facades/settings-facade.ts`
- `commands` -> `src/lib/facades/commands-facade.ts`
- `scenarios` -> `src/lib/facades/scenarios-facade.ts` (error + empty + badge)

## DomainFacade<T> required surface

```ts
interface DomainFacade<T extends { id: string }> {
  readonly slice: CatSeedBundleSlice;

  list(profileId?: string): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  count(profileId?: string): Promise<number>;

  create(input: T): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;

  /** Idempotent seed-write primitive. Records tagged with `profile` field. */
  upsertMany(
    records: T[],
    opts: { profileId: string },
  ): Promise<{
    created: number;
    updated: number;
    skipped: number;
  }>;

  /** Destructive reset limited to one profile scope; never touches user data
   *  outside that profile. */
  resetProfile(profileId: string): Promise<{ removed: number }>;

  subscribe(listener: () => void): () => void;
}
```

## Invariants

1. **Profile isolation.** Every seeded record carries `profile: <prof-id>`.
   `upsertMany` and `resetProfile` operate strictly within that scope.
   User-created records (no `profile` field or `profile: null`) are
   invisible to `resetProfile` and untouched by `upsertMany`.
2. **Id-keyed upsert.** `upsertMany` matches on the frozen stable ids from
   SS-08. Duplicate ids within a single call are a validation error, not a
   last-write-wins overwrite.
3. **Dependency order (orchestrator input).** The orchestrator MUST call
   facades in this order so relationship refs resolve at write time:
   `categories -> cameras -> micSettings -> projects -> samples -> rulesets ->
rules -> swatches -> presets -> settings -> scenarios -> commands`.
4. **Error surfacing.** Every facade method routes failures through the
   3-tier error funnel (`spec/03-error-manage`). No swallowed errors, no
   silent fallbacks. Orchestrator surfaces per-slice failures as `CapturedError`
   with slice + profile context.
5. **No storage leak.** UI code imports only from `src/lib/facades/*`. The
   Step 40 ratchet greps for direct store/IDB/localStorage imports from
   route and component files and fails the build if found.
6. **Backwards compatibility.** Existing IndexedDB/store-backed facades are
   wrapped, not replaced. A `TODO-facade-endpoint.md` file (Step 24)
   accompanies each fake/IDB facade that must later swap to a real API.

## Memory variant

Every DomainFacade ships a `makeMemoryFacade()` sibling used by unit tests
and Storybook. Same contract, in-memory Map keyed by id. This is what
Step 23 delivers.

## Non-goals

- No React hooks in the facade layer. `useSyncExternalStore` selectors
  live in `src/hooks/facades/*` (Step 22 add), not in the facades
  themselves.
- No cross-slice joins in facades. Relationship resolution is the
  orchestrator's job (Step 25) and any UI joins live in selector hooks.
