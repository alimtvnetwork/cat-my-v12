# processing-cli evaluate

Evaluate a single frame against a rule bundle and emit a Universal
Envelope whose `Results[0]` is a per-image `ResultRecord` per
`spec/21-app/24-results-json.md` §3.

## Arguments

- `--frame <path>` (required): image file to evaluate.
- `--bundle <path>` (required): rule bundle JSON per `spec/21-app/70`.
- `--run-id <id>` (optional): explicit `RunSessionId`; auto-generated when omitted.
- `--results-dir <dir>` (optional): append `<RunSessionId>.jsonl` there with `fsync`.

## Error codes

- `E_BE_NOT_FOUND` (404): frame path missing.
- `E_RULE_BUNDLE_INVALID` (422): bundle missing, unparseable, or shape-invalid.
- `E_BE_UNAVAILABLE` (503): bundle declares one or more Active/Silent rules
  but the evaluator engine is not wired yet (Plan 90 Steps 79-87). We
  refuse to fabricate verdicts per the honesty rule in `24-results-json.md` §2.

Empty bundle (`rules: []`) is a valid case: returns `Verdict = "Pass"`,
`Judgments = []`, and all counters zero.

## Anchors

`spec/21-app/75-processing-cli.md` §Acceptance #1, §Outputs;
`spec/21-app/24-results-json.md` §3; `spec/21-app/22` §4 (verdict precedence).
