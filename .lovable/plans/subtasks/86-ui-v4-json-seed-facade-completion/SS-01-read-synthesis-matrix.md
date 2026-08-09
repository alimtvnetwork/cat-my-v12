# Seed-surface matrix (Plan 86, Step 1)

Slug: read-synthesis-matrix
Status: complete
Created: 2026-07-19
Parent: 86-ui-v4-json-seed-facade-completion

## Inputs read (end to end)

- `.lovable/plans/pending/79-ui-improvements-v4.md` (89 lines, 50 steps). Establishes: Rule = Category via `isCategory`, `appliesBefore` chain, Project binds `cameraSettingId` + `micSettingsId`, seed bundle at `src/lib/seed/bundle.json`, fan-out via `src/lib/seed/facade.ts` idempotent by id, facades under `src/lib/<domain>/facade.ts`, pending-facade TODOs under `.lovable/pending-facades/`.
- `.lovable/plans/pending/80-ui-improvements-v4-polish.md` (76 lines). Polish layer only, no new seed slices.
- `.lovable/plans/pending/82-plan100-ui-v4-100steps.md` (206 lines, 100 steps). Adds: shortcut registry, cheat sheet, Alt mnemonics, InlineEdit primitive, Address bar, HUD-follows-shape, Properties selection bridge, seed fixtures per screen (SS-05), rules-vs-categories split, editor route wiring, error funnel through `showToastError` + `useErrorStore.captureException`.
- `spec/21-app/53-ui-improvements-v4.md` (555 lines). Canonical UI V4 spec with reference images under `53-ui-improvements-v4-assets/` and `instruction-images-v4/`. Defines Photoshop dock, palette density (13px tabular numerics, 22-24px rows, 4px grid), rotation handle, Projects sections order, MicSettings JSON, chain expansion `[X3,X4] -> [X1,X2,X3,X4]`.

## Current-state facts

- Seed bundle exists at `src/lib/seed/data/bundle.json` with orchestrator at `src/lib/seed/orchestrator.ts`, JSON facade at `src/lib/seed/json-facade.ts`, memory facade at `src/lib/seed/memory-facade.ts`, remote facade stub at `src/lib/seed/remote-facade.ts`, schemas at `src/lib/seed/schemas.ts`, gap check at `src/lib/seed/gap-check.ts`.
- Domain facades exist: `src/lib/rules/facade.ts`, `src/lib/projects/facade.ts` (+ `facade-json.ts`), `src/lib/camera/facade.ts`, `src/lib/mic/facade.ts` (implicit via listing above shows `src/lib/mic` absent; MicSettings facade is a Plan-79 step 14 gap to confirm in Step 3).
- Route files present for: projects list + detail, rulesets, rules edit, categories, camera, ai-testing, runs, trial-run, settings._, setup._ including `setup.rules.tsx` and `setup.rules.$id.tsx` and `setup.roi.tsx`.

## Seed-surface matrix (freeze-target, populated in Step 10)

| #   | UI surface                    | Route or component                                                                                          | JSON slice                                   | Facade API                                      | First-run profile | Test fixture profile | Acceptance signal                                | Linked plan/issue         |
| --- | ----------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------- | ----------------- | -------------------- | ------------------------------------------------ | ------------------------- |
| 1   | Projects list                 | `src/routes/projects.index.tsx`                                                                             | `projects`                                   | `projects/facade.list`                          | default           | default              | Seeded rows visible on wiped IDB                 | Plan 79 s40, Plan 82 s34  |
| 2   | Project editor: Rules section | `src/routes/projects.$projectId.tsx`                                                                        | `projects.rules` + expanded chain            | `projects/facade.get` + `computeEffectiveChain` | default           | default              | Chain badge shows `[X1,X2,X3,X4]`                | Plan 79 s41/s42           |
| 3   | Project editor: Camera Setup  | same                                                                                                        | `cameras`                                    | `camera/facade.list`                            | default           | default              | Dropdown lists seeded `c1`, `c2`                 | Plan 79 s43, issue 35     |
| 4   | Project editor: Mic Settings  | same                                                                                                        | `micSettings`                                | `mic/facade.list`                               | default           | default              | Dropdown lists default mic preset                | Plan 79 s44               |
| 5   | Project editor: Image Samples | same                                                                                                        | `imageSamples`                               | `projects/facade.samples` (TBD)                 | default           | default              | Sample rows render without live camera           | Plan 79 s45, issue 35     |
| 6   | Project editor: Run + Result  | same                                                                                                        | derived from rules + samples                 | runner                                          | default           | default              | Run produces per-rule pass/fail                  | Plan 79 s46               |
| 7   | Rules list (rules-only)       | `src/routes/setup.rules.tsx`                                                                                | `rules where isCategory=false`               | `rules/facade.list`                             | default           | default              | No category rows leak                            | Plan 82 s31, issue 28     |
| 8   | Categories tab                | `src/routes/projects.$projectId.categories.tsx`                                                             | `rules where isCategory=true`                | `rules/facade.list`                             | default           | default              | Category rows only                               | Plan 82 s32               |
| 9   | Rule Set editor               | `src/routes/projects.$projectId.rulesets.$rulesetId.tsx`                                                    | `ruleSets` + `rules`                         | `rules/facade` + rulesets facade                | default           | default              | Toolbar padding + rules panel populated          | Plan 82 s37/s38           |
| 10  | Rule editor                   | `src/routes/projects.$projectId.rulesets.$rulesetId.rules.$ruleId.tsx` and `src/routes/setup.rules.$id.tsx` | `rules` + ROI shapes                         | `rules/facade.get`                              | default           | default              | Editor opens with shape loaded                   | Plan 82 s35, issue 29     |
| 11  | ROI editor                    | `src/routes/setup.roi.tsx`                                                                                  | `rules.conditions` + `rotation`              | rules facade                                    | default           | default              | Shape renders with 13px badges + rotation handle | Plan 79 s33-s37           |
| 12  | Properties palette            | `src/features/rules/editor/PropertiesPalette.tsx`                                                           | `swatches`, `propertyPresets`, selected rule | `rules` + `swatches` facade                     | default           | default              | Docked pane mirrors HUD                          | Plan 82 s41-s49, issue 30 |
| 13  | Layers palette                | `src/features/rules/editor/LayersPalette.tsx`                                                               | derived from selection                       | rules facade                                    | default           | default              | Layer rows render                                | Plan 79 s32               |
| 14  | Tools palette                 | `src/features/rules/editor/ToolsPalette.tsx`                                                                | static tool meta                             | none (static)                                   | n/a               | n/a                  | Tools grid renders                               | Plan 79 s27-s29           |
| 15  | Camera settings screen        | `src/routes/settings.camera.tsx` + `src/routes/setup.camera.tsx`                                            | `cameras`                                    | camera facade                                   | default           | default              | Presets editable                                 | Plan 79 s43               |
| 16  | Mic settings screen           | (new, per Plan 79 s14)                                                                                      | `micSettings`                                | mic facade                                      | default           | default              | Presets editable                                 | Plan 79 s14/s44           |
| 17  | Address bar labels            | `src/components/shell/AddressBar.tsx` in `Titlebar`                                                         | resolves via project/ruleset facades         | facades                                         | default           | default              | Segments show real names                         | Plan 82 s27               |
| 18  | Command Palette               | `src/components/nav/CommandPalette.tsx`                                                                     | `commands` (static + seeded profile actions) | seed orchestrator                               | default           | default              | "Apply seed: <profile>" entries present          | Plan 82 s28, plan 86 s28  |
| 19  | Empty states                  | `src/components/EmptyState.tsx` consumers                                                                   | `emptyStates`                                | seed orchestrator                               | empty             | empty                | Empty CTA seeds via facade                       | Plan 82 s39, plan 86 s35  |
| 20  | Saved badges                  | `LivePreviewBadge.tsx`, `SavedBadge.tsx`                                                                    | derived timestamps                           | facades                                         | default           | default              | Relative time shows                              | Plan 83 s37               |
| 21  | Error preview                 | `src/routes/errors.tsx`, `GlobalErrorModal`                                                                 | `errorScenarios`                             | seed orchestrator                               | error-preview     | error-preview        | Copyable correlation id                          | Plan 82 s9, plan 86 s21   |
| 22  | Settings screens              | `src/routes/settings.*.tsx`                                                                                 | `settings`                                   | seeded settings store                           | default           | default              | Non-empty defaults visible                       | Plan 86 s21               |
| 23  | AI testing                    | `src/routes/projects.$projectId.ai-testing.tsx`                                                             | `aiScenarios` (defer)                        | facade                                          | default           | default              | At least one scenario listed                     | Plan 86 s21               |

## Constraints noted for Step 2 (memory + commands read)

- Every persistence surface goes through a facade under `src/lib/<domain>/facade.ts`. No direct storage imports from UI.
- Every fake facade gets a TODO under `.lovable/pending-facades/` with owner + migration checklist.
- Seed fan-out must be idempotent by id and profile-scoped.
- Error surfacing MUST use `showToastError` + `useErrorStore.captureException` (per `src/lib/errors/notify.ts`).
- Ratchets: facade-single-seam test must stay green; any new UI file that touches storage directly is a regression.

## Freeze note

This matrix is the freeze target for Plan 86 Step 10. Steps 2-9 will append memory-derived constraints, current-facade audit results, route-to-facade mapping, hardcoded-fixture audit, JSON schema shape, profile names, id conventions, and facade contract deltas onto this same file (or sibling notes referenced from here) before any code changes begin in Step 11.

---

# Step 2 append — memory + commands constraints

Read on 2026-07-19:

- `.lovable/memory/features/facade-and-seed.md` — canonical facade contract for V4 entities. Non-negotiables: (1) no direct IDB/localStorage from UI for Rule/Category/MicSettings/extended Project/CameraSetting; (2) typed CRUD, no raw IDB keys; (3) Memory<Domain>Facade variant for tests and seed in-memory mode; (4) every fake facade has a matching `.lovable/pending-facades/NN-<domain>-facade.md`; (5) seed loaded once through `src/lib/seed/` and fanned out via idempotent upsert-by-id, user edits win; (6) facade errors go through `errorStore` with a `correlationId`, no silent catch. Canonical shape: `list/get/create/update/remove/duplicate/subscribe`. Grep guard: any `idb-keyval` outside `src/lib/**/facade.ts` and `src/lib/seed/**` is a review-blocker.
- `.lovable/spec/commands/35-seed-fixtures-per-screen.md` — orchestrator is the single write path. `seedAll(profile)` where `SeedProfile = "sample-pcb" | "soic-inspection" | "connector-bank"`. Ordered fan-out: Projects → Rules → Rulesets (references resolved) → Cameras → MicSettings → ImageSamples (per project). Failure rolls back via `clearAll(profile.id)` and re-throws with context. Stable human-readable ids (`project:sample-pcb`, `ruleset:solder-joints`, `rule:solder-joint-count`) so deep links work. First-run: `__root.tsx` `beforeLoad` checks `ProjectRepositoryFacade.count()`; if zero, `seedAll("sample-pcb")` runs client-side after hydration (never during SSR prerender). Every write logs `[seed] wrote N <facade> rows for profile <id>` at info level. Ratchet test at `src/lib/seed/__tests__/orchestrator.test.ts` asserts referential integrity + idempotency.
- `.lovable/spec/commands/37-json-seedable-config-facade-ui.md` — command scope covers Plans 79/80/82/83/86. Six rules: facade-only consumption, JSON bundles with stable ids + explicit relationships, orchestrator idempotency, every screen has a named profile testable on fresh install, facade APIs future-proof for real endpoints, seed/facade failures route through the existing error funnel.
- `.lovable/spec/commands/26-seed-via-facade-for-ui.md` — earlier restatement of the same rule; swappable JSON→remote without touching UI.
- `.lovable/issues/35-ui-seeding-values-not-complete.md` — driving issue: seed values incomplete, not consistently facade-routed. Closes only when every UI surface has coherent seeded data through facades on fresh install.

## Constraints derived (append to matrix as governing rules)

C1. Every row in the matrix MUST reach data via a facade — no direct storage import from routes/components.
C2. Every seeded id in the JSON bundle MUST be a stable human-readable id (`project:*`, `ruleset:*`, `rule:*`, `camera:*`, `mic:*`, `sample:*`, `category:*`, `swatch:*`, `preset:*`, `command:*`, `empty:*`, `error:*`, `setting:*`).
C3. Fan-out order is fixed: Projects → Rules → Rulesets → Cameras → MicSettings → ImageSamples → (V4 additions: Swatches → Presets → Settings → Commands → EmptyStates → ErrorScenarios).
C4. Orchestrator MUST be idempotent (second run = zero writes) and MUST NOT overwrite user-edited records (upsert = create-if-missing, not overwrite).
C5. First-run bootstrap runs in `__root.tsx` beforeLoad, client-only, gated by `ProjectRepositoryFacade.count() === 0`.
C6. Every seed write logs `[seed] wrote N <facade> rows for profile <id>`; every failure surfaces through `showToastError` + `useErrorStore.captureException` with the profile id + failing facade in context.
C7. Every fake facade has a matching `.lovable/pending-facades/NN-<domain>-facade.md`. New facades added by Plan 86 (mic if missing, swatches, presets, samples, commands, empty-states, error-scenarios, settings) each need a TODO file.
C8. Profile set for Plan 86 supersedes the command-35 trio: add `blister-pack-qa`, `empty-preview`, `error-preview` alongside `sample-pcb` (default), `soic-inspection`, `connector-bank`. Plan 86 Step 7 defines the six.
C9. Grep guard extended: any UI file importing `idb-keyval` or touching `localStorage`/`sessionStorage` for a V4 seeded slice is a ratchet failure (existing `facade-single-seam` test).
C10. Any hardcoded fixture array remaining in a route/component after Step 29 is a Plan 86 blocker; Step 5 audit produces the exhaustive list.

## Open questions carried into Step 3

- Does `src/lib/mic/facade.ts` exist today, or is Plan 79 step 14 still open? (verify in Step 3 audit)
- Is there a swatches facade, or is it inlined? (Step 3)
- Which of the six profiles are already partially present in `src/lib/seed/data/bundle.json`? (Step 3)
- Does `__root.tsx` already gate first-run on `ProjectRepositoryFacade.count()`, or is the current gate different? (Step 3)
