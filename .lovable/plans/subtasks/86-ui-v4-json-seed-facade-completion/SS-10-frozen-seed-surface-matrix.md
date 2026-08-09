# SS-10: Frozen Seed-Surface Matrix (Plan 86, Step 10)

Status: FROZEN as of v3.802.0. No implementation step (11+) may add a slice,
profile, id prefix, or facade method that is not listed here. Changes to this
matrix require an explicit plan step and a version bump.

## Inputs (consolidated)

- SS-01 (read synthesis): V4 UI surfaces enumerated from Plans 79, 80, 82, 83, spec 53.
- SS-02 (JSON schema + bundle shape): top-level `version`, `profiles[]`, per-slice typed arrays.
- SS-03 (facade audit + contracts): existing facade coverage vs gaps.
- SS-04 (route -> facade map): which route reads which facade.
- SS-05 (hardcoded fixture audit): fixtures to be replaced.
- SS-06 (frozen bundle shape): field-level contract.
- SS-07 (frozen profiles): 6 named profiles.
- SS-08 (frozen id conventions): kebab-case prefixes.
- SS-09 (facade contract additions): `DomainFacade<T>` surface.

## Frozen slices (bundle top-level keys)

Every slice below MUST appear in `bundle.json` (even if empty per profile) and MUST have a matching facade with `list`, `upsertMany`, `resetProfile`:

1. `categories`
2. `cameras`
3. `micSettings`
4. `projects`
5. `rulesets`
6. `rules`
7. `samples`
8. `swatches`
9. `propertyPresets`
10. `settings`
11. `commands`
12. `emptyStates`
13. `errorScenarios`

Write order (from SS-09, non-negotiable for the orchestrator):
`categories -> cameras -> micSettings -> swatches -> propertyPresets -> settings -> projects -> rulesets -> rules -> samples -> commands -> emptyStates -> errorScenarios`.

## Frozen profiles (from SS-07)

`prof-default-pcb`, `prof-soic-inspection`, `prof-connector-bank`, `prof-blister-qa`, `prof-empty-preview`, `prof-error-preview`.

## Frozen id prefixes (from SS-08)

`prof-`, `proj-`, `rs-` (ruleset), `rule-`, `cat-`, `cam-`, `mic-`, `smp-` (sample), `sw-` (swatch), `pp-` (property preset), `set-` (setting), `cmd-`, `es-` (empty state), `err-` (error scenario).

## Frozen facade surface (from SS-09)

```ts
interface DomainFacade<T extends { id: string; profileId: string }> {
  list(profileId?: string): Promise<T[]>;
  upsertMany(rows: T[]): Promise<void>; // idempotent by id
  resetProfile(profileId: string): Promise<void>;
  subscribe?(cb: (rows: T[]) => void): () => void;
  count?(profileId?: string): Promise<number>;
}
```

## Route -> facade -> slice traceability (from SS-04, condensed)

| Route                         | Facades read                                      | Slices required       |
| ----------------------------- | ------------------------------------------------- | --------------------- |
| `/` (home)                    | projects, emptyStates                             | projects, emptyStates |
| `/projects`                   | projects                                          | projects              |
| `/projects/$id`               | projects, rulesets, cameras, micSettings, samples | 5 slices              |
| `/projects/$id/rulesets/$rid` | rulesets, rules, categories                       | 3 slices              |
| `/setup/roi`                  | rules, propertyPresets, swatches                  | 3 slices              |
| `/settings/*`                 | settings, cameras, micSettings                    | 3 slices              |
| Command palette (global)      | commands                                          | commands              |
| Error boundary demos          | errorScenarios                                    | errorScenarios        |

Any route not in this table MUST NOT read domain data in Plan 86 scope, or the row MUST be added here first.

## Out of scope (explicit exclusions)

- Live capture / runtime results (Plan 29, 50).
- Auth / user profile data.
- Real backend endpoints (facades stay memory/IndexedDB in Plan 86; endpoint swap is a later plan).
- SEO metadata seeding.

## Checklist for Step 11 authors

Before opening `bundle.json`:

- [ ] All 13 slice keys present at top level.
- [ ] All 6 profiles declared in `profiles[]`.
- [ ] Every id uses a frozen prefix.
- [ ] No slice references an id from a different profile.
- [ ] No hardcoded values from SS-05 leak into the bundle unchanged; they are normalized to the frozen shape.
