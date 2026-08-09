# SS-06 Schema v3 Bump (Plan 42 Step 7)

**Status:** DONE at v3.421.0.

Root cause: `RULESET_SCHEMA_VERSION` was pinned at `2 as const` in `src/lib/editor/schema.ts` line 13, and `parseRuleSet` in `src/lib/editor/ruleset-io.ts` line 146 rejected any `version` other than 1 or 2, so no downstream migration could stamp `validationMode` or `conditions` without the parser rejecting its own output.

Changes:

- `src/lib/editor/schema.ts`: bumped `RULESET_SCHEMA_VERSION` to `3 as const`; added `SUPPORTED_RULESET_VERSIONS = [1, 2, 3] as const` and `SupportedRulesetVersion` type; added `Ruleset` root type with `validationMode: ValidationMode` and `rules: EditorRuleV3[]`; re-exported `DEFAULT_VALIDATION_MODE`.
- `src/lib/editor/ruleset-io.ts`: parser now accepts any version in `SUPPORTED_RULESET_VERSIONS`; v3 files pass through the same shape as v2 (conditions + validationMode wiring lands in step 11).

Verification: `bunx tsgo --noEmit` clean; no runtime consumer of `RULESET_SCHEMA_VERSION` compared it to a literal `2`.
