# Facade + seed contract (V4 mandate)

Applies to: any code that touches persistence introduced or refactored under Plans 79 or 86.
Source of truth: `spec/21-app/53-ui-seed-facade.md` (Section 0 v2 Addendum), `spec/21-app/53-ui-improvements-v4.md` section 9, `spec/21-app/52-sdk-facade-pattern.md`.
Plans: `.lovable/plans/pending/79-ui-improvements-v4.md` (steps 5-7, 13-19, 47) and `.lovable/plans/pending/86-ui-v4-json-seed-facade-completion.md` (frozen v2 pipeline).

## v2 Addendum (Plan 86, 2026-07-19) — READ FIRST

The pre-v2 rules in this file are wrapped, not deleted. When writing new code, follow the v2 contract:

- Bundle file: `src/lib/seed/data/bundle.v2.json`, validated by `src/lib/seed/schemas-v2.ts` (`parseBundleV2`, `checkBundleIntegrity`). 13 frozen slice keys per SS-10: `categories, cameras, micSettings, projects, rulesets, rules, samples, swatches, propertyPresets, settings, commands, emptyStates, errorScenarios`. Adding a slice, profile, or id prefix outside SS-08/SS-10 requires a plan step and version bump.
- Frozen profiles (6): `prof-default-pcb, prof-soic-inspection, prof-connector-bank, prof-blister-qa, prof-empty-preview, prof-error-preview`.
- Per-slice facade: `src/lib/facades/<slice>-facade.ts` (or `slice-facades.ts` for the 12-in-1 module) implementing `DomainFacade<T>` from `src/lib/facades/domain-facade.ts`. Required surface: `list, get, count, snapshot?, create, update, remove, upsertMany({profileId}), resetProfile(profileId), subscribe`. Every seeded row carries `profile: <prof-id>`; `resetProfile` never touches user-created rows.
- Write path: `src/lib/seed/orchestrator-v2.ts` (dependency order fixed by SS-09 point 3), invoked exclusively via the `cmd:apply-seed-profile` command bus entry. UI code never calls the orchestrator or facades' write primitives directly; empty-state CTAs go through `src/lib/seed/useSeededEmptyStateAction.ts`.
- Read path: `src/lib/facades/useFacadeOrStore.ts` for list slices and `src/lib/seed/useSeededSurfaces.ts` for the uniform per-slice hooks (`useSeededProjects`, `useSeededRulesets`, `useSeededRulesForRuleset`, `useSeededCameras`, `useSeededMicSettings`, `useSeededSwatches`, `useSeededPropertyPresets`, `useSeededSettings`, `useSeededCategories`, `useSeededEmptyState`, `useSeededErrorScenarios`, `useSeededCommands`, `useSeededSamplesForProject`). Consumers MUST NOT import from `src/lib/facades/slice-facades.ts` directly (Step 40 ratchet).
- Ratchets that fail the build on drift: `src/lib/seed/__tests__/relationship-integrity.step38.test.ts`, `.../idempotency.step39.test.ts`, `src/lib/facades/__tests__/facade-only-ratchet.step40.test.ts`. Browser proofs: `tests/e2e/seeded_routes_coverage.py`, `tests/e2e/seeded_routes_a11y.py`.
- Idempotency contract: `upsertMany` matches on frozen SS-08 ids; duplicate ids within one call are a validation error, not last-write-wins. User rows (no `profile` field) are invisible to `resetProfile` and untouched by `upsertMany`.
- Errors: every facade failure routes through the 3-tier error funnel (`spec/03-error-manage`); no silent catch.

The pre-v2 sections below describe legacy Plan 79 wiring that is still live for backward compatibility; new work MUST use the v2 addendum above.

## Non-negotiable rules

1. NO component, hook, route loader, or server function reads or writes IndexedDB / localStorage directly for V4 entities (Rule, Category, MicSettings, extended Project, wrapped CameraSetting). All access goes through `src/lib/<domain>/facade.ts`.
2. Each facade exposes exactly the CRUD surface it needs, typed. Never expose the underlying `idb-keyval` key or a raw `IDBDatabase`.
3. Each facade ships a `Memory<Domain>Facade` variant for tests and for the seed provider's in-memory mode.
4. Every fake / IndexedDB-backed facade gets a matching TODO file under `.lovable/pending-facades/NN-<domain>-facade.md`. The TODO names: current fake behavior, target real-SDK call, migration checklist, and owner. Removing a facade fake without deleting or completing its TODO is a lint failure.
5. Seed data is loaded once through the seed facade (`src/lib/seed/`) and fanned out to each domain facade via idempotent upsert-by-id. Seed reruns must be safe (idempotent) and must not clobber user edits.
6. Errors from any facade go through the existing `errorStore` with a `correlationId` (already added in Plan 71); silent catch or `try/catch` that swallows is a violation of `spec/03-error-manage`.

## Facade shape (canonical)

```ts
// src/lib/rules/facade.ts
export interface RuleFacade {
  list(): Promise<Rule[]>;
  get(id: RuleId): Promise<Rule | null>;
  create(input: RuleDraft): Promise<Rule>;
  update(id: RuleId, patch: Partial<Rule>): Promise<Rule>;
  remove(id: RuleId): Promise<void>;
  duplicate(id: RuleId): Promise<Rule>;
  subscribe(listener: () => void): () => void; // for useSyncExternalStore
}

export function makeRuleFacade(): RuleFacade {
  /* idb-keyval backed */
}
export function makeMemoryRuleFacade(): RuleFacade {
  /* in-memory, tests + seed */
}
```

Same shape (minus `duplicate` where irrelevant) for: `MicSettingsFacade`, `CameraSettingFacade` (wrap existing store), and the extended `ProjectFacade`.

## Seed fan-out

`src/lib/seed/bundle.json` carries V4 slices:

- `categories: Rule[]` (2 entries, `isCategory: true`)
- `rules: Rule[]` (4 entries; `X3.appliesBefore = ["X1", "X2"]`)
- `cameraSettings: CameraSetting[]` (`c1`, `c2`)
- `micSettings: MicSettings[]` (1 default)
- `projects: Project[]` (`My Proj 1` with `rules: ["X3", "X4"]`, `cameraSettingId: "c2"`)

`src/lib/seed/facade.ts` (or the existing seed provider) upserts each slice by id at first boot. Upsert is `if (!existing) create(entry)`; do NOT overwrite existing entries. User edits win.

## Pending TODO format (canonical)

Every `.lovable/pending-facades/NN-<domain>-facade.md` follows:

```markdown
# <Domain> facade, pending real SDK

Status: fake (IndexedDB via idb-keyval)
Owner: <team or maintainer>
Facade file: src/lib/<domain>/facade.ts

## What the fake does

<one paragraph, exact behavior>

## What the real SDK must do

<endpoint names, auth model, expected error codes>

## Migration checklist

- [ ] Swap `make<Domain>Facade` body to call the SDK
- [ ] Preserve subscribe() semantics or wire realtime
- [ ] Add integration tests hitting the real SDK
- [ ] Remove this file, log the completion in CHANGELOG
```

## Verification triggers

- Grep-level guard: any `idb-keyval` import outside `src/lib/**/facade.ts` and `src/lib/seed/**` is a review-blocker.
- Every new facade PR must add or update its `.lovable/pending-facades/NN-*.md` in the same commit.
- Seed idempotency test: run the seed fan-out twice; second run makes zero writes.
