# SS-01: UI seed inventory (Plan 72, Step 1)

Parent: 72-ui-seed-facade
Status: completed
Created: 2026-07-17

## Hard-coded / inline seed surfaces found

1. `src/lib/projects/seed.ts` -> `SAMPLE_PROJECTS`: 3 sample projects (Bottle Line, PCB Assembly, Blister Pack) with cameras, categories, rulesets, rules. Also `seedRunState()` inline NG events + run history.
2. `src/lib/editor/sample-library.ts` -> `SAMPLE_LIBRARY`: 5 sample images (pcb + carrier-tape 1..4), `SAMPLE_POV_MAP` POV/slider presets keyed by sample id, `DEFAULT_SAMPLE_ID`.
3. `src/routes/setup.rules.tsx`: local template arrays for rule kinds shown in the rules setup screen (rule templates).
4. `src/components/palettes/UserFunctionsPalette.tsx`: bundled function presets (tool presets slice).
5. Category defaults: implicit only, driven by project seed above (no canonical list). Needs an explicit `categories` slice with common shop-floor category names.
6. Programs / rulesets templates: currently derived from `SAMPLE_PROJECTS`; will be split into its own `programs` slice.

## Slices required

- `projects` (from SAMPLE_PROJECTS)
- `categories` (new canonical list: Label, Cap, Fill Level, Components, Solder, Text, Pill Count, Foil, Barcode, ...)
- `ruleTemplates` (from setup.rules.tsx + rail editors)
- `toolPresets` (from UserFunctionsPalette + editor tool ribbon)
- `sampleImages` (from SAMPLE_LIBRARY + SAMPLE_POV_MAP)
- `programs` (from SAMPLE_PROJECTS.rulesets flattened)
- `runHistory` (from seedRunState, optional demo NG events)

## Notes

- All assets under `src/assets/samples/*` stay as-is; the seed JSON references them by import id, not by URL string, to keep bundling deterministic.
- Zod validation runs at facade load; on failure -> MemoryUiSeedFacade fallback + CapturedError to the global error store.
- Facade env override: `VITE_UI_SEED_SOURCE` = `json` (default) | `memory` | `remote`.
