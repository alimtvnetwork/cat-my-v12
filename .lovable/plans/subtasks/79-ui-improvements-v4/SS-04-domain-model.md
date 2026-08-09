---
Slug: domain-model
Status: populated
Created: 2026-07-18
Updated: 2026-07-18
Parent: 79-ui-improvements-v4
---

# SS-04: Domain model

Applies to: `src/lib/rules/model.ts` (step 11, new), `src/lib/mic-settings/model.ts` (step 12, new), `src/lib/projects/model.ts` (existing, extended in step 16), `src/lib/projects/chain.ts` (step 16, new).
References:

- Memory: `.lovable/memory/features/rule-category-project-model.md`
- Spec: `spec/21-app/53-ui-improvements-v4.md` sections 1, 4, 5
- Facade contract: `.lovable/memory/features/facade-and-seed.md`

## Rule (== Category when isCategory)

```text
Rule
  id:              RuleId               // brand<'RuleId', string>
  name:            string               // 1..64, trimmed
  isCategory:      boolean              // true = category surface
  notes?:          string               // <= 500 chars, category-oriented
  pocketSize?:     1|2|3|4|5|6|7|8      // rules only
  categoryId?:     RuleId               // must point at a Rule with isCategory=true
  appliesBefore:   RuleId[]             // ordered, unique, no self-ref, no cycle
  conditions:      RuleCondition[]      // existing type from spec 21/47
  cameraSettingId?:CameraSettingId
  createdAt:       ISODate
  updatedAt:       ISODate
```

- Rotation lives PER ROI, INSIDE `RuleCondition.rois[n].rotation` (degrees, float, normalized `[-180, 180]`, default `0`). Confirmed in SS-03.
- `Uncategorized` is a built-in category: `{ id: "cat-uncategorized", isCategory: true, name: "Uncategorized", appliesBefore: [], conditions: [] }`. Non-deletable, non-renamable, seeded first.

## MicSettings

```text
MicSettings
  id:        MicSettingsId              // brand<'MicSettingsId', string>
  name:      string                     // 1..64
  params:    Record<string, unknown>    // opaque; parsed per active worker
  notes?:    string
  createdAt, updatedAt
```

CRUD-only. Referenced by `Project.micSettingsId?`. No cross-links to Rule or Camera.

## CameraSetting (existing, unchanged shape)

Already defined in `src/lib/camera/model.ts` (Plan 78 slice 1). V4 wraps it in a facade (step 15) but does not extend the schema.

## Project (extended)

```text
Project
  id:              ProjectId
  name:            string
  rules:           RuleId[]             // ordered picks, unique
  imageSamples:    SampleId[]           // existing type
  cameraSettingId?:CameraSettingId
  micSettingsId?:  MicSettingsId
  runs:            RunRecord[]          // existing type
  createdAt, updatedAt
```

Fields added in step 16: `rules`, `micSettingsId`. `imageSamples` and `runs` already exist. Legacy records without `rules` get `rules: []` at facade read time.

## Chain expansion

Canonical algorithm lives in `.lovable/memory/features/rule-category-project-model.md` under "Chain expander (target)". Target file: `src/lib/projects/chain.ts`, exported as `computeEffectiveChain(rootRuleIds, resolve)`. Returns `{ chain: Rule[]; cycle?: RuleId[] }`. Cycle path is returned, NOT thrown; UI decides.

Example: `project.rules = ["X3", "X4"]` with `X3.appliesBefore = ["X1", "X2"]`, `X4.appliesBefore = []` -> `chain = [X1, X2, X3, X4]`.

## Invariants (enforced in Zod + facade)

1. `appliesBefore` MUST NOT contain the rule's own id.
2. `appliesBefore` entries MUST be unique (dedupe on save).
3. Saving is rejected if `computeEffectiveChain([id], resolve)` returns `cycle` (transitive walk).
4. Deleting a rule is rejected while any other rule references it in `appliesBefore` or any project references it in `rules`. Referrers listed to the user.
5. `Uncategorized` never gets deleted or renamed.
6. `pocketSize` only serialized when `isCategory === false`; readers tolerate its presence on categories (informational).
7. `categoryId` (if set) MUST resolve to a `Rule` with `isCategory === true`.

## Errors (typed)

- `RuleCycleError` (code `E_RULE_CYCLE`, includes `path: RuleId[]`).
- `RuleReferencedError` (code `E_RULE_REFERENCED`, includes `referrers: { rules: RuleId[]; projects: ProjectId[] }`).
- `BuiltinCategoryError` (code `E_BUILTIN_CATEGORY`).
- `RuleValidationError` (code `E_RULE_SCHEMA`, includes `issues`).

All errors flow through `errorStore` with a `correlationId`, per `spec/21-app/40-error-manage.md` Appendix A.

## Open questions

- Should `notes` support markdown? (default: plain text v1; markdown parked for v2)
- Should `appliesBefore` allow references across `Uncategorized`? (default: yes, treated as a no-op category)
