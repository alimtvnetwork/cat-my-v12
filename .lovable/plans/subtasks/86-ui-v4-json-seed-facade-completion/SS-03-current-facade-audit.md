# Step 3 audit — current seed entry points, bundle, facades

Slug: current-facade-audit
Status: complete
Created: 2026-07-19
Parent: 86-ui-v4-json-seed-facade-completion

## Bundle (present)

`src/lib/seed/data/bundle.json` (227 lines). Top-level keys today: `version`, `categories`, `programs`, `projects`, `ruleTemplates`, `sampleImages`, `toolPresets`. Schema at `src/lib/seed/schemas.ts` (113 lines) validates each slice via Zod.

## Orchestrator (present)

`src/lib/seed/orchestrator.ts` (337 lines). Exports `SeederName = "rules" | "projects" | "cameras" | "mic-settings" | "image-samples" | "bindings"`. Emits a structured `SeedRunReport` per run (per-seeder status/count/duration + `runSeedGapCheck` results + `fatalError`), single-flighted for StrictMode double-mount. Publishes via `publishSeedReport` (telemetry-store.ts). Adapters are injectable. Gap check at `src/lib/seed/gap-check.ts` (249 lines) covers swatches, categories, rules, rulesets, cameras, mic-settings, projects, image-samples.

## Domain facades (present)

- `src/lib/rules/facade.ts` ✓
- `src/lib/projects/facade.ts` ✓ (+ `facade-json.ts`)
- `src/lib/camera/facade.ts` ✓
- `src/lib/mic-settings/facade.ts` ✓ (path is `mic-settings/`, not `mic/`; open-question Q1 resolved)
- `src/lib/image-samples/facade.ts` ✓
- `src/lib/swatches/facade.ts` ✓ (Q2 resolved: swatches facade exists; `DEFAULT_SWATCHES` imported by orchestrator)
- `src/lib/canvas-prefs/facade.ts` ✓ (bonus: canvas prefs facade already isolated)

## Pending-facade TODOs (present)

`.lovable/pending-facades/`: 01-rule, 02-category-alias, 03-mic-settings, 04-camera-setting-wrap, 05-project-v4, 06-swatches, README. **Gaps for Plan 86:** need TODOs for image-samples, presets (property panes), commands (palette), empty-states, error-scenarios, settings — each will become a fake facade during Steps 11-24.

## First-run gate (present, different from command 35)

`src/routes/__root.tsx` lines 25-30 import six seeders and lines 357-361 wire them into the orchestrator adapter set. Current gate is per-seeder `autoSeed*IfEmpty`, not a single `ProjectRepositoryFacade.count()===0` check (Q4 resolved: current gate is more granular; command 35's simpler gate is not what's live). This is fine and arguably better — Plan 86 will keep the granular gate but ensure all six profiles honor it.

## Bundle profile coverage (Q3 resolved)

Bundle currently has **no `profiles` top-level key**. All content is a single implicit "default" profile with 2 projects ("Bottle Line Inspection", "PCB Assembly Check") + shared categories/programs/ruleTemplates/sampleImages/toolPresets. **Gap:** Plan 86 Step 7 requires 6 named profiles; Step 11 requires adding a `profiles` top-level key and restructuring current content into `profiles["sample-pcb"]` (default) + adding `soic-inspection`, `connector-bank`, `blister-pack-qa`, `empty-preview`, `error-preview`.

## Gap vs matrix (23 rows in SS-01)

| Row   | Slice needed                                | Bundle today                                                                 | Facade today                      | Gap                                                                                                                 |
| ----- | ------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1-6   | projects/rules/rulesets/cameras/mic/samples | present (implicit default)                                                   | all facades exist                 | **restructure into `profiles["sample-pcb"]`**                                                                       |
| 7-8   | rules where isCategory=true/false           | rules present, `isCategory` flag not in `catSeedRuleSchema`                  | rules facade has model.ts         | **add `isCategory` to bundle rules + schema**                                                                       |
| 9-10  | ruleSets + editor rules                     | present as `rulesets` inside `projects[i]`                                   | rules + projects facades          | **flatten to top-level `ruleSets` slice with stable ids OR keep nested but add `id` fields (currently only names)** |
| 11    | ROI editor: rotation + shape family         | family present (rect/anchor/polygon/line), **no `rotation` field**           | rules model                       | **add `rotation` to schema (Plan 79 s36)**                                                                          |
| 12    | Properties palette: swatches + presets      | `toolPresets` present, `DEFAULT_SWATCHES` in swatches facade (not in bundle) | swatches facade                   | **move swatches into bundle as a slice; keep toolPresets**                                                          |
| 13-14 | Layers + Tools palettes                     | static                                                                       | none                              | **no seed needed**                                                                                                  |
| 15-16 | Camera + Mic settings screens               | camera name only in project row (`cameraName`); no top-level `cameras` slice | camera + mic facades              | **add top-level `cameras` and `micSettings` slices (currently derived by name)**                                    |
| 17    | Address bar labels                          | resolved from facades                                                        | facades                           | **no bundle change; verify Q from Plan 82 s27**                                                                     |
| 18    | Command Palette                             | none                                                                         | none                              | **add `commands` slice + facade + TODO**                                                                            |
| 19    | Empty states                                | none                                                                         | `EmptyState.tsx` primitive exists | **add `emptyStates` slice + facade + TODO**                                                                         |
| 20    | Saved badges                                | derived timestamps                                                           | facades                           | **no bundle change**                                                                                                |
| 21    | Error preview                               | none                                                                         | `useErrorStore` exists            | **add `errorScenarios` slice + facade + TODO for `error-preview` profile**                                          |
| 22    | Settings screens                            | none                                                                         | settings stores exist             | **add `settings` slice + facade + TODO**                                                                            |
| 23    | AI testing                                  | none                                                                         | facade exists elsewhere           | **defer to Plan 86 s21 (aiScenarios)**                                                                              |

## Constraint-check against C1-C10

- C1 (facade-only): ✓ orchestrator is the sole write path today; but Step 5 audit will grep component files for stray `idb-keyval` / literal-array fixtures.
- C2 (stable ids): ✗ current bundle uses `name`-only in nested `projects[i].rulesets[j].rules[k]`. Must add `id` fields with `project:*` / `ruleset:*` / `rule:*` conventions.
- C3 (fan-out order): ✓ orchestrator SeederName enumerates Rules → Projects → Cameras → MicSettings → ImageSamples → Bindings; add Swatches/Presets/Settings/Commands/EmptyStates/ErrorScenarios per Plan 86.
- C4 (idempotency): ✓ every seeder is `autoSeed*IfEmpty` (create-if-missing) + gap check.
- C5 (first-run gate): ✓ (granular per-seeder gate; keep as-is).
- C6 (logging + error funnel): ✓ orchestrator emits structured `SeedRunReport`; verify `[seed] wrote N …` log format in Step 25.
- C7 (pending-facade TODOs): partial — 6 exist, need 6 more.
- C8 (six profiles): ✗ bundle is single-profile; Step 11 restructure required.
- C9 (grep guard): ✓ `facade-single-seam.test.ts` exists and green (last verified v3.784.0).
- C10 (no hardcoded fixtures): unknown — Step 5 audit.

## Deltas queued for Steps 4-10

- Step 4: map every V4 route → the facade it must use (cross against listing in SS-01).
- Step 5: grep for hardcoded arrays (`const rules = [...]`, `const projects = [...]`) in routes + components.
- Step 6: JSON schema: add `profiles` top-level, `id` on every slice row, `rotation` on rules, `isCategory` on rules, new slices for swatches/commands/emptyStates/errorScenarios/settings.
- Step 7: freeze six profile names + intended coverage.
- Step 8: stable-id conventions (per C2).
- Step 9: facade contract deltas: add `count()`, `upsertMany()`, `resetProfile(profileId)`, and confirm `subscribe()` everywhere.
- Step 10: freeze the matrix.

## No src edits this turn.
