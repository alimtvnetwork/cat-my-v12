# Rule acceptance contract (frontend → Python worker)

Every editor rule carries an ordered list of acceptance conditions.
The worker AND-combines them per rule: a rule passes only when EVERY
condition passes, evaluated in the order the frontend supplied.

The list ships inside `rule.params.acceptanceConditions` as a JSON
string (params are `Record<string, string | number | boolean>` in
`src/lib/editor/types.ts`, so arrays cannot be stored natively). The UI
lives in `src/components/editor/panels/AcceptancePanel.tsx`.

## Condition shape

Each entry of the parsed array has:

| Field           | Type   | Range / values                      | Default    | Meaning                                                         |
| --------------- | ------ | ----------------------------------- | ---------- | --------------------------------------------------------------- |
| `id`            | string | opaque                              | generated  | Stable id used by the UI for reorder / delete.                  |
| `presence`      | string | `"present"`, `"absent"`, `"ignore"` | `"ignore"` | Presence check (see evaluation order below).                    |
| `targetColor`   | string | Hex `#rrggbb`, or empty             | `""`       | Reference color; empty string means color is not checked.       |
| `similarityPct` | number | Integer 0..100                      | `80`       | Minimum observed similarity required for the condition to pass. |

## Legacy flat fields (mirror of the first condition)

For back-compat with older rule bundles, the frontend also writes the
first condition into these flat keys, and reads them as a one-element
list when `acceptanceConditions` is missing:

| Param key                 | Type   | Range / values                      | Default    |
| ------------------------- | ------ | ----------------------------------- | ---------- |
| `acceptancePresence`      | string | `"present"`, `"absent"`, `"ignore"` | `"ignore"` |
| `acceptanceTargetColor`   | string | Hex `#rrggbb`, or empty             | `""`       |
| `acceptanceSimilarityPct` | number | Integer 0..100                      | `80`       |

New workers SHOULD read `acceptanceConditions` first and fall back to
the flat fields only when it is missing.

## Fields

| Param key                 | Type   | Range / values                      | Default    | Meaning                                                                                                        |
| ------------------------- | ------ | ----------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| `acceptancePresence`      | string | `"present"`, `"absent"`, `"ignore"` | `"ignore"` | Whether the feature (blob, edge, pattern, text) must be present, must be absent, or is not checked.            |
| `acceptanceTargetColor`   | string | Hex `#rrggbb`, or empty string      | `""`       | Reference color the rule expects to see inside its ROI. Empty string means color is not checked.               |
| `acceptanceSimilarityPct` | number | Integer 0..100                      | `80`       | Minimum similarity (percent) the observed region must reach against the rule's reference for the rule to PASS. |

Any missing key is treated as its default. Any out-of-range value MUST
be clamped by the worker (0..100 for similarity, lowercase-hex for
color); a hard reject is not appropriate because the frontend is the
source of truth for the shape of `params` and older rules may not carry
the fields yet.

## Evaluation order (worker)

For each rule, in this exact order, short-circuit on first FAIL:

1. **Presence check** — apply the kind-specific detector inside the ROI.
   - `present`: at least one detection required → else FAIL with
     `E_RULE_ACCEPTANCE_PRESENCE_MISSING`.
   - `absent`: zero detections required → else FAIL with
     `E_RULE_ACCEPTANCE_PRESENCE_UNEXPECTED`.
   - `ignore`: skip.
2. **Color check** — when `acceptanceTargetColor` is non-empty, compute
   the dominant color (or mean, per rule kind) of the observed region in
   LAB space and compare against the target. FAIL with
   `E_RULE_ACCEPTANCE_COLOR_MISMATCH` when ΔE00 exceeds the tolerance
   defined in `spec/03-error-manage/` for color rules.
3. **Similarity check** — compute the rule's kind-specific similarity
   score (pattern correlation, blob shape match, OCR fuzzy score, etc.)
   normalized to 0..100. FAIL with
   `E_RULE_ACCEPTANCE_SIMILARITY_BELOW_THRESHOLD` when observed <
   `acceptanceSimilarityPct`.

Each FAIL emits the standard rule-result JSON already used by the
dispatcher, with `code`, `ruleId`, and a `details` object containing the
observed value and the configured threshold.

## JSON example

```json
{
  "id": "r-abc-123",
  "kind": "R",
  "name": "U12 package outline",
  "x": 419.56,
  "y": 115.55,
  "width": 380,
  "height": 380,
  "params": {
    "acceptanceConditions": "[{\"id\":\"ac-1\",\"presence\":\"present\",\"targetColor\":\"#2b2b2b\",\"similarityPct\":85},{\"id\":\"ac-2\",\"presence\":\"absent\",\"targetColor\":\"\",\"similarityPct\":90}]",
    "acceptancePresence": "present",
    "acceptanceTargetColor": "#2b2b2b",
    "acceptanceSimilarityPct": 85,
    "minRadius": 10,
    "maxRadius": 120,
    "edgeThreshold": 96,
    "invertPolarity": false
  }
}
```

## Backwards compatibility

- Older rule bundles without these keys MUST load without error. The
  worker treats them as `presence="ignore"`, no color check, similarity
  threshold 80.
- Import/export in `src/components/editor/rail/RuleSetIOBar.tsx` already
  round-trips arbitrary `params` keys, so no schema-version bump is
  required for the acceptance fields alone. If the frontend later tightens
  the values into an enum via `src/lib/editor/schema.ts`, that will bump
  `schemaVersion` in the export payload.

## Related

- UI: `src/components/editor/panels/AcceptancePanel.tsx`
- Rule types: `src/lib/editor/types.ts`
- Worker: `app/worker/runner.py`, `app/rules/`
- Error codes: `spec/03-error-manage/`
