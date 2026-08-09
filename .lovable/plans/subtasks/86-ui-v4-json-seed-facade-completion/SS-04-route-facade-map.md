# SS-04 V4 Route to Facade Map

Plan: 86-ui-v4-json-seed-facade-completion, Step 4
Date: 2026-07-19

## Purpose

Map every V4 UI route that renders domain data to the facade module it must read from. Downstream steps (5 fixture audit, 9 facade contract deltas, 11 JSON bundle keys, 29-34 UI wiring) key off this table.

## Facade inventory (from Step 3)

- `src/lib/projects/*` (project-runner, project store)
- `src/lib/rules/useRulesLibrary.ts`
- `src/lib/camera/useCameraLibrary.ts`
- `src/lib/mic-settings/useMicSettingsLibrary.ts`
- `src/lib/swatches/facade.ts`
- `src/lib/image-samples/useImageSamples.ts`
- `src/lib/editor/useSampleLibrary.ts`
- `src/lib/editor/store/rules-slice.ts` (editor selection, rules)
- `src/lib/facade/contracts.ts` (shared contracts)

## Route to facade map

| Route file                                                  | Domain surface                                   | Required facade(s)                           | Seed slice(s)                     |
| ----------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------- | --------------------------------- |
| `index.tsx`                                                 | Home landing, recent projects                    | projects                                     | projects                          |
| `projects.index.tsx`                                        | Projects list                                    | projects                                     | projects                          |
| `projects.$projectId.index.tsx`                             | Project overview, rule set summary, sample count | projects, rules, image-samples               | projects, rulesets, samples       |
| `projects.$projectId.camera.tsx`                            | Camera picker for project                        | camera                                       | cameras                           |
| `projects.$projectId.categories.tsx`                        | Category list for project                        | rules (categories slice)                     | categories                        |
| `projects.$projectId.rulesets.index.tsx`                    | Rule sets list                                   | rules (rulesets)                             | rulesets                          |
| `projects.$projectId.rulesets.tsx`                          | Rule sets layout                                 | rules                                        | rulesets                          |
| `projects.$projectId.rulesets.new.tsx`                      | New rule set form                                | rules, categories                            | rulesets, categories              |
| `projects.$projectId.rulesets.$rulesetId.tsx`               | Rule set editor shell                            | rules, editor store, swatches                | rulesets, rules, swatches         |
| `projects.$projectId.rulesets.$rulesetId.rules.$ruleId.tsx` | Rule editor with properties palette              | rules, editor store, swatches, image-samples | rules, samples, swatches, presets |
| `projects.$projectId.runs.tsx`                              | Run history                                      | projects (runs)                              | runs                              |
| `projects.$projectId.trial-run.tsx` / `.$runId.tsx`         | Trial run views                                  | projects (runs), image-samples               | runs, samples                     |
| `projects.$projectId.ai-testing.tsx` / history              | AI testing history                               | projects (runs), rules                       | runs, rules                       |
| `setup.index.tsx`                                           | Setup dashboard                                  | projects, camera, mic-settings               | projects, cameras, mic-settings   |
| `setup.camera.tsx`                                          | Camera setup wizard                              | camera                                       | cameras                           |
| `setup.categories.$id.tsx`                                  | Category detail                                  | rules (categories)                           | categories                        |
| `setup.rules.tsx` / `setup.rules.$id.tsx`                   | Rules list + editor                              | rules, editor store                          | rules, categories                 |
| `setup.reference.tsx`                                       | Reference sample selection                       | image-samples, editor sample library         | samples                           |
| `setup.roi.tsx`                                             | ROI shapes seed                                  | rules, editor store                          | rules                             |
| `setup.functions.tsx`                                       | Function catalog                                 | rules (functions slice)                      | rules                             |
| `setup.chain-events.tsx`                                    | Chain badges                                     | rules, projects                              | rulesets, rules                   |
| `settings.camera.tsx`                                       | Global camera presets                            | camera                                       | cameras                           |
| `settings.lighting.tsx`                                     | Lighting presets                                 | mic-settings (lighting slice)                | mic-settings                      |
| `settings.trigger.tsx`                                      | Trigger presets                                  | mic-settings (trigger slice)                 | mic-settings                      |
| `settings.shortcuts.tsx`                                    | Command / shortcut palette                       | commands facade (new, see Step 9)            | commands                          |
| `settings.license.tsx`                                      | License metadata                                 | settings facade (new, see Step 9)            | settings                          |
| `settings.index.tsx`                                        | Settings landing                                 | settings, commands                           | settings, commands                |
| `results.tsx`                                               | Results index                                    | projects (runs)                              | runs                              |
| `run.tsx` / `trial-run.tsx`                                 | Run bootstrap                                    | projects, image-samples                      | runs, samples                     |
| `errors.tsx`                                                | Error scenarios preview                          | error scenarios seed (new, Step 21)          | error-scenarios                   |
| `diagnostics.tsx`                                           | Diagnostics                                      | derived, no seed                             | none                              |
| `ops.tsx`                                                   | Ops dashboard                                    | projects, runs                               | projects, runs                    |
| `ai-testing.tsx`                                            | Global AI testing                                | rules, image-samples                         | rules, samples                    |
| `admin.debug.*`                                             | Debug tools                                      | derived / diagnostics                        | none                              |

## Gaps that fall out of the map

1. No dedicated `commands` facade for the shortcut palette; Step 9 must define one before Step 21 can seed it.
2. No dedicated `settings` facade backing `settings.license.tsx` and `settings.index.tsx`; Step 9 must define one.
3. `errors.tsx` currently renders hand-rolled example errors; Step 21 needs an `error-scenarios` seed slice and read hook.
4. `setup.functions.tsx` uses a static function catalog constant; needs to be moved behind the rules facade or a new `functions` sub-facade in Step 9.
5. `setup.chain-events.tsx` chain badges are not yet read through a facade; either extend rules facade or add a `chain-events` slice.

## Frozen decisions for Step 5 onward

- Every route above must render exclusively through the listed facade(s) after Steps 29-34.
- The JSON seed bundle (Step 11) must include a top-level key for every seed slice listed in the third column.
- Any route not in the table renders derived or diagnostic data only and needs no seed slice.
