# 53 - UI Seed Facade (LOCKED)

**Status:** Locked (2026-07-17). Governs every source of first-run / demo / hint data consumed by the browser app (projects, categories, rule templates, tool presets, sample images, programs). No UI module reads a raw JSON file, bundle constant, or remote payload directly; it consumes a `UiSeedFacade` we own.

Anchors: 52 (SDK Facade Pattern, parent rule for third-party seams), 47 (rule condition model), 27 (config surface).

## 0. v2 Addendum (Plan 86, 2026-07-19)

The rule in Section 2 stands. The concrete v2 realization is:

- **Bundle:** `src/lib/seed/data/bundle.v2.json`, validated by `src/lib/seed/schemas-v2.ts` (Zod). Unknown top-level slice keys fail integrity via `checkBundleIntegrity`. Cross-slice references (projects to rulesets, rules to categories, samples to projects) are ratcheted by `src/lib/seed/__tests__/relationship-integrity.step38.test.ts`.
- **Write path:** `src/lib/seed/orchestrator-v2.ts` applied by the frozen command `cmd:apply-seed-profile` (wired in `CommandPalette` and `CommandBus`). 6 profiles are frozen (`prof-default-pcb`, `prof-blister-qa`, `prof-soic-line`, `prof-carrier-tape`, `prof-empty`, `prof-demo-mixed`). Idempotent per-profile isolation is ratcheted by `src/lib/seed/__tests__/idempotency.step39.test.ts`.
- **Read path:** every V4 slice reads through a `DomainFacade<T>` (`src/lib/facades/slice-facades.ts`) via `useFacadeOrStore` (`src/hooks/useFacadeOrStore.ts`). Direct imports of storage primitives for V4 entities from UI code are ratcheted by `src/lib/facades/__tests__/facade-only-ratchet.step40.test.ts`.
- **Frozen contracts:** ID conventions `SS-08-frozen-id-conventions.md`, facade additions `SS-09-facade-contract-additions.md`, surface matrix `SS-10-frozen-seed-surface-matrix.md` (all under `.lovable/plans/subtasks/86-ui-v4-json-seed-facade-completion/`).
- **Browser proof:** `tests/e2e/seeded_routes_coverage.py` (render, 7 routes) and `tests/e2e/seeded_routes_a11y.py` (axe WCAG 2 A+AA + PNG baseline). Reports under `tests/reports/seeded-routes/`.

Historical references to `src/lib/seed/bundle.json`, per-slice bootstrap hooks, on-boot fan-out, or ad-hoc "seed if empty" logic are RETIRED; treat this addendum as the current contract.

## 1. Why

- Seed data has three legitimate sources: JSON bundled in the client, an in-memory fixture (tests, Storybook), and a future remote endpoint. Any UI module that hard-codes one source blocks the other two.
- Zod validation must happen exactly once, at the seam, so downstream consumers see typed `CatSeedBundle` and never a raw `unknown`.
- Consumers must degrade cleanly when the bundle is loading, failing, or reloaded. That is only possible if the seam owns lifecycle.

## 2. The Rule (one sentence)

**Every consumer of seed data reads it through `useSeedSlice(sliceName)` (or `useSeedBundle()` when it needs the full envelope); no component, hook, or store imports from `src/lib/seed/data/**` or fetches a seed URL directly.\*\*

Direct imports from `src/lib/seed/data/**` outside `src/lib/seed/**` are `E_BUG_SEED_LEAK` at lint time (step 27 of Plan 72 wires the boundary check).

## 3. Canonical Shape

```ts
// Facade contract (src/lib/seed/facade.ts)
export interface UiSeedFacade {
  load(): Promise<CatSeedBundle>;
  getSlice<K extends keyof CatSeedBundle>(k: K): Promise<CatSeedBundle[K]>;
  reload(): Promise<CatSeedBundle>;
  readonly source: "json" | "memory" | "remote";
}

// Three implementations, one contract:
//   JsonUiSeedFacade   - production; parses src/lib/seed/data/bundle.json through Zod
//   MemoryUiSeedFacade - tests / Storybook; in-memory bundle + subscribe()
//   RemoteUiSeedFacade - future; fetch + Zod at the seam
//
// Factory:                       makeUiSeedFacade()  driven by VITE_UI_SEED_SOURCE
// Provider (mounts one facade):  <SeedProvider>       in src/routes/__root.tsx
// Consumer hook (typed slice):   useSeedSlice("categories")
// Consumer hook (whole bundle):  useSeedBundle()
// Skeleton branch:               <SeedSlot loading={...} error={...}>...</SeedSlot>
// Recovery UI on Zod failure:    <SeedRecoveryToast>
```

## 4. Consumer Rules

1. Never `import bundle from "@/lib/seed/data/bundle.json"`. Use `useSeedSlice`.
2. Never call `fetch("/seed/...")` from UI code. Use `RemoteUiSeedFacade` behind the factory.
3. Never assume the bundle is ready synchronously. Gate the UI with `<SeedSlot>` or check `status === "ready"` on `useSeedBundle()`.
4. Never write to the bundle. Facades are read-only from the UI. Mutations belong in the user's own stores (`useProjectStore`, `useRulesStore`, etc.) after seeding.
5. Never bypass the provider in tests. Wrap with `<SeedProvider facade={new MemoryUiSeedFacade(fixture)}>` (see `useCategoryOptions.test.tsx` for the canonical pattern) rather than mocking module internals.

## 5. Lifecycle

```text
  mount SeedProvider
        |
  facade.load()  --- Zod parse ---> CatSeedBundle
        |                     \
        v                      -> Zod error -> status=error, SeedRecoveryToast
  status=ready, bundle in context
        |
  useSeedSlice(k) reads context; components render
        |
  reload() (user retry, HMR, remote refresh)
        |
  status=loading again, then ready/error
```

`autoSeedIfEmpty([])` in `src/lib/projects/seed.ts` is the canonical example of the "not ready yet" branch: an empty slice must be a no-op that does NOT set the `ca:autoseeded:v1` flag, so a subsequent ready bundle can still seed once.

## 6. Test Contract

Every consumer added to Plan 72 must have at least one test that:

- wraps the hook / component in `<SeedProvider facade={new MemoryUiSeedFacade(fixture)}>`,
- asserts the loading branch,
- asserts the ready branch produces the expected output,
- (for stores that persist) asserts idempotency across repeated `load()` calls.

Canonical references:

- `src/lib/seed/__tests__/json-facade.test.ts` (facade contract)
- `src/lib/seed/__tests__/provider.test.tsx` (provider lifecycle)
- `src/lib/projects/__tests__/seed.test.ts` (store pipeline end-to-end)
- `src/lib/projects/__tests__/useCategoryOptions.test.tsx` (workspace-scope merge)

## 7. Failure Modes and Errors

| Symptom                                                   | Root cause                                                 | Fix                                                                                            |
| --------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `useSeedContext must be used within a SeedProvider`       | Consumer mounted outside the provider                      | Wrap tree in `<SeedProvider>` in `__root.tsx`, or add `<SeedProvider>` in the test wrapper.    |
| Zod parse throws at boot                                  | Bundle drift vs. `schemas.ts`                              | Fix the bundle (or the schema); `SeedRecoveryToast` shows the field path.                      |
| Empty slice seeds an empty workspace                      | Consumer forgot the "not ready" branch                     | Guard with `<SeedSlot>` or check `bundle.projects.length` before calling `seedSampleProjects`. |
| Category dropdown missing seed entries at workspace scope | Consumer read the store directly instead of `useSeedSlice` | Route through `useCategoryOptions("workspace")`.                                               |

## 8. Relationship to Rule 52

Rule 52 governs third-party SDKs on the device / server side (Python capture, vendor SDKs). Rule 53 is the same shape applied to the browser app's read-only configuration surface: one seam, one contract, three swappable implementations, Zod at the boundary, typed domain objects downstream. If both rules ever conflict on wording, Rule 52 wins for backend SDK seams and Rule 53 wins for UI seed data; there is no overlap by design.
