# Plan 72 - UI Seed Facade Close-out

**Status:** Complete (v3.483.0, 2026-07-17)

30 steps delivered, in order:

| Step | Deliverable                                                                           | Version  |
| ---- | ------------------------------------------------------------------------------------- | -------- |
| 1    | `CatSeedBundle` domain types (`src/lib/seed/types.ts`)                                | v3.469.0 |
| 2    | Zod schemas (`src/lib/seed/schemas.ts`)                                               | v3.470.0 |
| 3    | Zod validation pipeline                                                               | v3.470.0 |
| 4    | `UiSeedFacade` interface (`src/lib/seed/facade.ts`)                                   | v3.470.0 |
| 5    | `JsonUiSeedFacade` (`src/lib/seed/json-facade.ts`)                                    | v3.471.0 |
| 6    | `MemoryUiSeedFacade` (`src/lib/seed/memory-facade.ts`)                                | v3.471.0 |
| 7    | `RemoteUiSeedFacade` (`src/lib/seed/remote-facade.ts`)                                | v3.472.0 |
| 8    | `makeUiSeedFacade` factory + `VITE_UI_SEED_SOURCE` (`src/lib/seed/index.ts`)          | v3.472.0 |
| 9    | Sample bundle data (`src/lib/seed/data/bundle.json`)                                  | v3.473.0 |
| 10   | `SeedProvider` + `useSeedBundle` (`src/lib/seed/provider.tsx`)                        | v3.473.0 |
| 11   | Provider mount at root (`src/routes/__root.tsx`)                                      | v3.474.0 |
| 12   | `useSeedSlice` hook (`src/lib/seed/useSeedSlice.ts`)                                  | v3.474.0 |
| 13   | `seedSampleProjects` refactored onto facade (`src/lib/projects/seed.ts`)              | v3.475.0 |
| 14   | `useCategoryOptions` workspace-scope merge (`src/lib/projects/useCategoryOptions.ts`) | v3.475.0 |
| 15   | Rule templates slice + `RuleTemplateHints`                                            | v3.476.0 |
| 16   | Tool presets slice + `ToolRibbon` "More"                                              | v3.476.0 |
| 17   | `sampleImages` + `programs` slices, template apply action                             | v3.477.0 |
| 18   | Boot-time slice inventory log                                                         | v3.477.0 |
| 19   | `SeedSlot` skeleton branch (`src/lib/seed/SeedSlot.tsx`)                              | v3.478.0 |
| 20   | `SeedRecoveryToast` (`src/lib/seed/SeedRecoveryToast.tsx`)                            | v3.478.0 |
| 21   | `json-facade.test.ts` (load / cache / Zod reject)                                     | v3.479.0 |
| 22   | `provider.test.tsx` (loading / ready / error / reload)                                | v3.479.0 |
| 23   | `projects/__tests__/seed.test.ts` (end-to-end pipeline)                               | v3.480.0 |
| 24   | `useCategoryOptions.test.tsx` on real `SeedProvider`                                  | v3.480.0 |
| 25   | Locked spec `spec/21-app/53-ui-seed-facade.md`                                        | v3.481.0 |
| 26   | Design-system pointer in `spec/24-app-ui-design-system/00-overview.md`                | v3.481.0 |
| 27   | ESLint boundary rule (`E_BUG_SEED_LEAK`) in `eslint.config.js`                        | v3.482.0 |
| 28   | Full sweep: tsgo 0, vitest 704/704                                                    | v3.482.0 |
| 29   | Playwright smoke on cleared storage                                                   | v3.483.0 |
| 30   | Close-out (this file)                                                                 | v3.483.0 |

## Step 29 evidence

Script: `/tmp/browser/seed-smoke/run.py` (regenerated on demand).

Flow: navigate to `/`, clear `localStorage` + `sessionStorage` + all IndexedDB databases, reload, navigate to `/projects`, assert seeded project names render, assert `localStorage['ca:autoseeded:v1'] === '1'`, reload once more, assert each seeded project name appears exactly once (idempotency).

Console evidence captured from the run:

```
[info] [seed] using JsonUiSeedFacade (bundled JSON)
[info] [seed] SeedProvider ready source=json version=1.0.0 {source: json, version: 1.0.0, slices: Object}
[info] [projects/seed] seedSampleProjects {seedProjectCount: 3, createdProjectCount: 3, createdRulesetCount: 8, createdTrialRunCount: 16}
[info] [projects/seed] seedRunState applied {ngEvents: 3, history: 2}
[info] [projects/seed] autoSeedIfEmpty applied {createdProjectIds: Array(3), createdRulesetCount: 8, createdTrialRunCount: 16}
```

Assertion results:

```
STORAGE_CLEARED
FOUND: {'Bottle Line Inspection': True, 'PCB Assembly Check': True, 'Blister Pack QA': True}
AUTOSEED_FLAG: 1
SECOND_LOAD_COUNTS: {'Bottle Line Inspection': 1, 'PCB Assembly Check': 1, 'Blister Pack QA': 1}
RESULT: PASS
```

Screenshots: `docs/plan-72/1_projects.png` (first load, seeded projects visible), `docs/plan-72/2_reload.png` (second load, still exactly 3 projects, no duplication).

## Rule 53 enforcement summary

- Spec: `spec/21-app/53-ui-seed-facade.md` (LOCKED).
- Lint: `eslint.config.js` blocks `**/lib/seed/data/**` imports outside `src/lib/seed/**` with `E_BUG_SEED_LEAK`.
- Tests: 4 canonical suites (`json-facade.test.ts`, `provider.test.tsx`, `projects/__tests__/seed.test.ts`, `useCategoryOptions.test.tsx`).
- Runtime: `SeedProvider` mounted in `src/routes/__root.tsx`; consumers use `useSeedSlice(k)` or `useSeedBundle()`.
- Failure branches proven: Zod reject (unit), loading (unit), error + reload (unit), empty slice defers auto-seed (unit), cleared-storage cold boot (Playwright).

Plan 72 closed.
