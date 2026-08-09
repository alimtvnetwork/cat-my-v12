# SS-02 Schema Migration (v1 -> v2)

Slug: schema-migration
Parent: 31-pre-93-panel-gaps-completion
Status: complete
Created: 2026-07-15

## Current v1 shape (source of truth)

`src/lib/editor/ruleset-io.ts:3` -> `RULESET_SCHEMA_VERSION = 1`.
`src/lib/editor/types.ts` `EditorRule`:

    {
      id: string, name: string,
      kind: "C" | "R" | "K" | "S" | "E",        // abstract acceptance-row letter
      family?: "rect" | "anchor",
      isHidden: boolean, isLocked: boolean,
      x, y, width, height: number,
      params?: Record<string, string | number | boolean>
    }

`params` is an untyped bag. Concrete kind (OCR, Number, Color, ...) is stored ad hoc inside `params.kind`. No per-kind validation on import.

## v2 shape (target)

Bump `RULESET_SCHEMA_VERSION = 2`. Add:

- `kind` remains the abstract letter (unchanged, keeps hit-test / render code intact).
- **New required** `controller: ControllerKind` where `ControllerKind = "presence" | "absence" | "ocr" | "textMatch" | "number" | "math" | "color" | "pattern" | "blob"`.
- **New optional** `lightingRef?: string` on any rule that reads the shared LightingDrawer preset (LC-04).
- `params` becomes a discriminated union keyed by `controller` (typed at the TS layer only; on-disk stays a plain object so old exporters keep working):
  - presence/absence: `{ threshold: number, minBlobPx: number }`
  - ocr: `{ expectedText: string, caseInsensitive: boolean, stripWhitespace: boolean }`
  - textMatch: `{ pattern: string, flags: string }` (flags subset `i|m|s`)
  - number: `{ min: number, max: number, unit: string }`
  - math: `{ expression: string }`
  - color: `{ expectedColor: string /* #rrggbb */, deltaE: number /* 0..50 */ }`
  - pattern: `{ referenceAsset: string, matchThreshold: number /* 0..1 */ }`
  - blob: `{ minArea: number, maxArea: number, expectedCount: number }`

## Forward-only migration rules (deterministic, no I/O)

`migrateRuleV1ToV2(rule: EditorRuleV1): EditorRuleV2`:

1. Copy `id`, `name`, `kind`, `family`, `isHidden`, `isLocked`, `x`, `y`, `width`, `height` verbatim.
2. Derive `controller` in this order:
   - if `rule.params?.kind` is a known `ControllerKind` string -> use it;
   - else infer from `kind` letter + presence of legacy keys (`expectedText` -> `ocr`, `pattern` -> `textMatch`, `expression` -> `math`, `expectedColor` -> `color`, `referenceAsset` -> `pattern`, `minArea` -> `blob`, else `presence`);
   - if inference fails, throw `RuleSetImportError("rule[i]: cannot infer controller")` (caller wraps into coded log `E_UI_RULE_MIGRATE_FAIL`).
3. Build typed `params` by picking only the fields listed above from the old bag. Fill missing with per-controller defaults (see below). Discard extras (no data loss warning needed; extras were undocumented).
4. `lightingRef`: pass through if present as string, else omit.
5. Idempotence: if input already has `controller` set AND `RULESET_SCHEMA_VERSION === 2`, return a shallow clone. Never rewrite v2 -> v2.
6. No downward migration. Import of a file with `version > 2` throws `RuleSetImportError("unsupported version: N")` (existing message stays consistent).

## Per-controller defaults

    presence  { threshold: 0.5, minBlobPx: 10 }
    absence   { threshold: 0.5, minBlobPx: 10 }
    ocr       { expectedText: "", caseInsensitive: true, stripWhitespace: true }
    textMatch { pattern: "", flags: "" }
    number    { min: 0, max: 0, unit: "" }
    math      { expression: "" }
    color     { expectedColor: "#000000", deltaE: 10 }
    pattern   { referenceAsset: "", matchThreshold: 0.8 }
    blob      { minArea: 0, maxArea: 0, expectedCount: 1 }

## Invariants preserved

- `id` stability (used by `store/history-slice` diffing).
- `kind` letter unchanged (renderer + hit-test keyed on it).
- Ordering: `rules[]` order preserved 1:1; no dedupe, no sort.
- Idempotence proven by unit test `already-v2 -> deep equal`.

## Error taxonomy (feeds step 10)

| Condition                           | Code                             | Level | Where surfaced       |
| ----------------------------------- | -------------------------------- | ----- | -------------------- |
| Unknown / uninferrable controller   | E_UI_RULE_MIGRATE_FAIL           | error | toast + `log-stream` |
| Missing required geometry (x/y/w/h) | E_UI_RULE_MIGRATE_FAIL           | error | toast                |
| Version above 2                     | E_UI_RULESET_VERSION_UNSUPPORTED | error | import dialog        |
| Field coerced from unexpected type  | I_UI_RULE_MIGRATE_COERCED        | info  | log only             |

Codes must be registered against `.lovable/memory/03-error-manage.md` before shipping step 10.

## Where v2 lives in code (resolves SS-01 open question)

- New file `src/lib/editor/schema.ts`: exports `ControllerKind`, `EditorRuleV2`, `EditorRuleV1`, `RULESET_SCHEMA_VERSION = 2`, per-controller default map, and the union `EditorRuleParamsByController`.
- `src/lib/editor/ruleset-io.ts`: re-export `RULESET_SCHEMA_VERSION` from `schema.ts` (breaks the `1 as const` literal, so `parseRuleSet` reads `if (obj.version === 1) migrate; else if (obj.version === 2) parseV2; else throw`).
- New file `src/lib/editor/migrations.ts`: pure `migrateRuleV1ToV2` + `migrateRuleSetV1ToV2`.
- `src/lib/editor/store/rules-slice.ts`: on hydrate, if incoming payload has `version === 1` or lacks `controller`, run migration before commit.

## Non-goals

- No on-disk format churn beyond bumping `version` and adding `controller` per rule.
- No backfill of old exports; forward-only per plan-31 step 7.
- No behavior change for rendering, hit-test, or history in this migration step.
