# SS-04: Trial run surface

Parent: 34-home-hub-projects-rulesets
Slug: trial-run
Status: pending
Created: 2026-07-15

## Goal

`/projects/$projectId/trial-run` lets the operator upload an image, pick a
ruleset in the project, execute the rules against the image, and view a
per-rule pass/fail table plus annotated overlay.

## UI

- Section top bar sub-options: Upload image, Choose ruleset, Run, History.
- Left: uploaded image with rule overlays (reuse editor canvas read-only:
  `interactive={false}`).
- Right: results table (rule name, kind, result, score, duration).
- Bottom: Run button plus last-run timestamp.

## Engine

Reuse the existing rule evaluator entry point. If none exists, stub
`runRuleset(rules, imageBitmap): Promise<TrialResult[]>` in
`src/lib/trial/run.ts` returning deterministic placeholder scores so the
UI wires end-to-end. Real evaluators land in a follow-up plan.

## History

Last 20 trial runs stored in the ruleset entity under
`trialHistory: TrialRun[]`. History tab lists them; click reloads results.

## Tests

- Stub engine returns one result per rule.
- History caps at 20 (FIFO eviction).
