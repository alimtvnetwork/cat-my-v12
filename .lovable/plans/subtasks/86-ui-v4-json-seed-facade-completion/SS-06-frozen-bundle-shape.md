# SS-06 Frozen JSON Seed Bundle Shape

Plan: 86-ui-v4-json-seed-facade-completion, Step 6
Date: 2026-07-19
Supersedes: SS-02 (draft slice list)
Reads: SS-03 (current schema), SS-04 (route→facade map), SS-05 (hardcoded fixtures)

## Root cause this locks down

The current `catSeedBundleSchema` in `src/lib/seed/schemas.ts` (lines 97-105) is a flat, single-implicit-profile shape with 6 top-level arrays; SS-04 needs 13 slices under 6 named profiles with cross-slice references and stable ids. Step 6 defines that shape once so Steps 7-12 do not diverge.

## Frozen top-level shape

```jsonc
{
  "version": "2",
  "generatedAt": "ISO-8601",
  "defaultProfile": "sample-pcb",
  "profiles": {
    "<profile-id>": {
      "id": "sample-pcb",
      "label": "Sample PCB (default)",
      "description": "...",
      "slices": {
        "categories": [
          /* CategorySeed[] */
        ],
        "rules": [
          /* RuleSeed[] */
        ],
        "ruleSets": [
          /* RuleSetSeed[] */
        ],
        "projects": [
          /* ProjectSeed[] */
        ],
        "cameras": [
          /* CameraSeed[] */
        ],
        "micSettings": [
          /* MicSettingsSeed[] */
        ],
        "imageSamples": [
          /* ImageSampleSeed[] */
        ],
        "swatches": [
          /* SwatchSeed[] */
        ],
        "propertyPresets": [
          /* PropertyPresetSeed[] */
        ],
        "commands": [
          /* CommandSeed[] */
        ],
        "emptyStates": [
          /* EmptyStateSeed[] */
        ],
        "errorScenarios": [
          /* ErrorScenarioSeed[] */
        ],
        "settings": [
          /* SettingSeed[] */
        ],
      },
    },
  },
}
```

Rationale for each shape decision (short):

- **`version`** required; bump on breaking shape change; schema check gates on it.
- **`defaultProfile`** required; drives first-run gate in Step 26.
- **`profiles` as keyed object**, not array: guarantees uniqueness at parse time; orchestrator resolves the profile id in O(1).
- **`slices` nested per profile**: satisfies C8 (six named profiles) and C10 (profile-scoped reset); no cross-profile bleed.
- **13 slice keys, fixed set**: matches SS-04 third column plus the SS-05 Tier-1 payloads; Step 12 schema rejects unknown slice names.

## Per-slice contract

Every seed record MUST carry:

- `id: string` matching C2 id conventions from SS-02/Step 2 (`project:*`, `ruleset:*`, `rule:*`, `category:*`, `camera:*`, `mic:*`, `sample:*`, `swatch:*`, `preset:*`, `command:*`, `empty:*`, `error:*`, `setting:*`).
- `label: string` for user-visible name.
- Domain fields as per the existing `types.ts` in `src/lib/seed/` (extended as needed in Step 8/9).

Cross-slice references are always by full id string, never by name. Existing bundle uses `categoryName`/`cameraName` (schemas.ts lines 33, 39, 41) — this is the shape change: Step 11 rewrites these as `categoryId`, `cameraId`, `micSettingsId`, `ruleId`, `ruleSetId`, `sampleId`, etc.

## Relationship model (frozen)

```
Project
├── cameraId          → Camera
├── micSettingsId     → MicSettings
├── categoryIds[]     → Category[]
├── ruleSetIds[]      → RuleSet[]
└── sampleIds[]       → ImageSample[]

RuleSet
├── projectId?        → Project (nullable for "library" rule sets)
├── categoryId        → Category
└── ruleIds[]         → Rule[]

Rule
├── categoryId        → Category
├── appliesBeforeIds[] → Rule[]  (DAG, no cycles — validated in Step 12)
└── swatchIds[]       → Swatch[]  (optional)

ImageSample
├── projectId         → Project
└── cameraId?         → Camera

PropertyPreset
└── (standalone; referenced by editor UI, no FK)

Command / EmptyState / ErrorScenario / Setting
└── (standalone; UI-only, no FK)
```

Every FK must resolve inside the same profile (Step 38 relationship-integrity test). Cross-profile refs are a validation error.

## Idempotency contract

- Every record's `id` is stable across seed runs (C4).
- Orchestrator upsert-by-id; user-edited records outside the seed profile are preserved (C5, Step 39 test).
- `profiles.<id>.slices.<slice>` order is meaningful only for arrays with `sortIndex`; otherwise sorted by id.

## Migration from current bundle

`src/lib/seed/data/bundle.json` today is v1 (6 flat slices, `Name`-based FKs). Migration in Step 11:

1. Wrap current contents into `profiles["sample-pcb"].slices`.
2. Rename `ruleTemplates` → merge into `rules` slice (SS-05 Tier-1 payload from `src/lib/rules/seed.ts`).
3. Rename `programs` → merge into `ruleSets` slice.
4. Rewrite every `*Name` FK into `*Id` FK using the stable ids from Step 8.
5. Add empty scaffolds for the 5 new slices (`swatches`, `propertyPresets`, `commands`, `emptyStates`, `errorScenarios`, `settings`) — Steps 13-21 populate.
6. Copy the wrapped default under 5 new profile keys as placeholder stubs — Steps 13-21 diverge them.

## Frozen for downstream steps

- **Step 7**: profile ids are exactly `sample-pcb`, `soic-inspection`, `connector-bank`, `blister-pack-qa`, `empty-preview`, `error-preview`.
- **Step 8**: id conventions bind to the `id` field named above; no renaming.
- **Step 9**: facade contracts read `profiles[id].slices[slice]` and never traverse top-level arrays.
- **Step 12**: Zod schema replaces `catSeedBundleSchema` wholesale; the old flat shape is deleted.

## No src edits in this step

Design freeze only. All rewrites happen in Steps 11-12.
