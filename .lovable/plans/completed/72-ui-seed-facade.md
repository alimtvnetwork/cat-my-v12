# UI Seed Facade (JSON-backed, swappable)

Slug: ui-seed-facade
Steps: 30
Status: pending
Created: 2026-07-17

## Context

Introduce a single `UiSeedFacade` (per spec/21-app/52-sdk-facade-pattern.md) that supplies all UI seed/demo data (categories, sample projects, rule templates, tool presets, sample images metadata) from bundled JSON today, and can be swapped for a remote API tomorrow without touching UI code. Consolidates ad-hoc seeding in `src/lib/projects/seed.ts` and inline demo arrays.

Captured inputs:

- Command: .lovable/spec/commands/26-seed-via-facade-for-ui.md
- Issue: .lovable/issues/26-ui-seed-values-not-facaded.md
- Spec anchor: spec/21-app/52-sdk-facade-pattern.md

## Steps

1. Audit UI surfaces that need seed data (Home, Projects, Setup/Rules, Categories, Tools ribbon, Rule editor drawers) and list every hard-coded demo array in a short inventory note.
2. Define the domain shape: `CatSeedBundle` with typed slices `projects`, `categories`, `ruleTemplates`, `toolPresets`, `sampleImages`, `programs`.
3. Author Zod schemas for each slice in `src/lib/seed/schemas.ts` so JSON payloads are validated at load time.
4. Create the facade interface `UiSeedFacade` in `src/lib/seed/facade.ts` with `load(): Promise<CatSeedBundle>`, `getSlice<K>(k): Promise<CatSeedBundle[K]>`, and `kind: "json" | "remote" | "memory"`.
5. Implement `JsonUiSeedFacade` that imports `src/lib/seed/data/*.json` via Vite `?json` and validates through Zod.
6. Implement `MemoryUiSeedFacade` for tests (accepts a `CatSeedBundle` in the constructor).
7. Implement stub `RemoteUiSeedFacade` (throws `not-implemented`) to prove the seam and document the future swap path.
8. Write `makeUiSeedFacade(env)` factory returning `JsonUiSeedFacade` by default; env override `VITE_UI_SEED_SOURCE=remote|memory` selects alternates.
9. Create JSON files under `src/lib/seed/data/`: `categories.json`, `projects.json`, `rule-templates.json`, `tool-presets.json`, `sample-images.json`, `programs.json` populated from the audit in step 1.
10. Add a `SeedProvider` React context in `src/lib/seed/SeedProvider.tsx` that eagerly loads the bundle once and exposes `useSeed()` / `useSeedSlice(key)`.
11. Mount `SeedProvider` in `src/routes/__root.tsx` above the app shell.
12. Add a `useSeedSlice` selector hook with structural memoization to avoid re-renders when unrelated slices change.
13. Refactor `src/lib/projects/seed.ts` to consume `UiSeedFacade` for its sample projects instead of the inline literal, keeping its idempotent write behavior.
14. Refactor `src/lib/projects/category-resolver.ts` / `useCategoryOptions.ts` to seed from `useSeedSlice("categories")` when the persisted store is empty.
15. Refactor the Rules editor drawer(s) to pull rule templates from `useSeedSlice("ruleTemplates")` instead of local arrays.
16. Refactor the Tools ribbon defaults (in the workspace panel registry / tool list) to pull from `useSeedSlice("toolPresets")` where applicable.
17. Refactor Home/Projects sample tiles to render from `useSeedSlice("projects")` when the user has none.
18. Add a `seedVersion` field to the bundle and expose it via `useSeed().version`; log it once on boot so we can trace which seed shipped.
19. Ensure the seed load is non-blocking: show existing skeletons/placeholders while `load()` resolves; never freeze routes.
20. Wire an error boundary fallback: on Zod validation failure, log a `CapturedError` via the existing error store (spec 03) and fall back to `MemoryUiSeedFacade` with an empty bundle so the UI still renders.
21. Add unit tests in `src/lib/seed/__tests__/facade.test.ts` covering JSON load, schema failure -> memory fallback, and slice selector purity.
22. Add unit tests for `SeedProvider` (renders children after load, exposes version, respects memory override).
23. Add a Vitest test for `projects/seed.ts` proving it now sources from the facade (inject `MemoryUiSeedFacade`).
24. Update `src/lib/projects/__tests__/*` that previously relied on inline seed literals to use the memory facade.
25. Document the pattern in `spec/21-app/53-ui-seed-facade.md` (new file) with the "swap JSON to remote" recipe and cross-link file 52.
26. Add a short section to `README` or `spec/24-app-ui-design-system/` index pointing devs at the seed facade before adding new demo data.
27. Add an ESLint boundary (or a lightweight `pnpm run check:seed` script) that flags `import.*/seed/data/.*\.json` outside `src/lib/seed/`.
28. Run typecheck + vitest; fix any regressions from the refactors in steps 13-17.
29. Manual smoke via Playwright: verify Home, Projects, Setup/Rules, and Rule editor render seeded content on a cleared IndexedDB. Capture screenshots at 1280x1800.
30. Move this plan file to `.lovable/plans/completed/72-ui-seed-facade.md` and flip `Status: completed`.

## Verification

- Typecheck (`tsgo`) and `bunx vitest run` pass after each refactor step.
- New tests in `src/lib/seed/__tests__` all green.
- Playwright screenshots at step 29 show categories, sample projects, rule templates, and tool presets sourced from JSON (delete IndexedDB, reload, content still appears).
- Grep confirms no UI component imports `src/lib/seed/data/*.json` directly (only `src/lib/seed/*` does).
- `spec/21-app/53-ui-seed-facade.md` exists and cross-links file 52.

## Appended from prior pending tasks

None merged into this plan; other pending plans (29, 35, 36, 40, 41, 44, 46, 49-52, 57-59, 61-63, 71) remain independent and stay in `.lovable/plans/pending/`.
