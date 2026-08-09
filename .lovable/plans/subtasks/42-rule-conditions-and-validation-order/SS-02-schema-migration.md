---
Slug: schema-migration
Status: pending
Created: 2026-07-16
Parent: 42-rule-conditions-and-validation-order
---

# SS-02, schema + migration for conditions and validation order

Once SS-01 is merged, extend `src/lib/editor/schema.ts` (and
`src/lib/editor/migrations.ts`) to persist the new model.

## Schema changes

1. Add enums (under `src/types/rules/`):
   - `ConditionType`: SameImage, Presence, Color.
   - `PresenceMode`: Present, Absent.
   - `ColorMode`: Current, Dense2, Dense3, Picked.
   - `ValidationMode`: Parallel, Sequential.
2. Add `RuleCondition` Zod schema per SS-01 shape hints.
3. Extend `Rule` with `conditions: RuleCondition[]` (default: one
   `SameImage` condition mirroring existing behavior).
4. Extend `Ruleset` with `validationMode: ValidationMode` (default
   `Parallel`).

## Migration

- Bump schema version (v2 -> v3).
- v2 -> v3: wrap the existing single-check semantics of each rule in
  one `SameImage` condition; set ruleset `validationMode = Parallel`.
- Normalization helpers per enum (`normalizeValidationMode`,
  `normalizeColorMode`, etc.) mirroring the pattern already used for
  `normalizeGrowthTolerance`.

## Tests

- Round-trip a v2 ruleset -> v3, assert shape + defaults.
- Reject unknown enum values, fall back to defaults via normalizers.
