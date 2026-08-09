# processing-cli verify-bundle

Validate a rule bundle JSON against the acceptance contract without
running any evaluation. Collects ALL problems (not first-fail) so the
rules-editor can render one actionable list.

## Usage

    processing-cli verify-bundle --bundle <path> [--strict-kind]

## Flags

- `--bundle <path>` Rule bundle JSON to validate.
- `--strict-kind` Treat missing `rule.kind` as an error
  (default: allowed for forward-compat).

## Validation rules

- Root must be a JSON object with integer `schemaVersion`.
- `rules` must be a JSON array; each entry must be an object.
- `rule.id` required, non-empty string, unique across bundle.
- `rule.kind` (when present) must be one of
  `PresenceAbsence|FlawDetect|Count|OcrText|GraphicDisplayCheck|MathExpression`
  (spec 33 §3).
- `rule.status` (default `Active`) must be one of `Active|Inactive|Silent`
  (spec 33 §3a).
- `rule.params.acceptanceConditions` (when present) must parse per
  `spec/21-app/60-rule-acceptance-contract.md` §Condition shape:
  a JSON string decoding to an array of `{presence,targetColor,similarityPct}`.

## Exit

- 0 with envelope `Data = {BundlePath, SchemaVersion, RuleCount, ActiveCount,
InactiveCount, SilentCount, Kinds}` on success.
- Non-zero with `E_RULE_BUNDLE_INVALID` and `Errors.Details.Problems[]` on
  any violation. Every problem carries `{At, Code, Message, Details?}`.

Anchors: `spec/21-app/75-processing-cli.md` §Acceptance #4,
`spec/21-app/33-rule-catalog.md` §3 + §3a,
`spec/21-app/60-rule-acceptance-contract.md`.
