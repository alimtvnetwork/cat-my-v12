# SS-05: AI testing surface

Parent: 34-home-hub-projects-rulesets
Slug: ai-testing
Status: pending
Created: 2026-07-15

## Goal

`/projects/$projectId/ai-testing` runs a chosen ruleset across a dataset
(multiple uploaded images) and reports aggregate metrics.

## UI

- Section sub-options: Dataset, Run tests, Metrics, History.
- Dataset: multi-file image drop zone, list with remove buttons, count badge.
- Run tests: pick ruleset, click Run, progress bar (n/N).
- Metrics: pass rate, per-rule pass rate, per-image detail (expandable).

## Engine

Loop `runRuleset` (SS-04) across dataset images; aggregate in
`src/lib/ai-testing/aggregate.ts`. Deterministic stub scoring is acceptable
here; a real AI evaluator is out of scope and captured as follow-up.

## Persistence

Datasets are session-scoped. History persists the aggregate summary per
run, capped at 10 entries.

## Tests

- Aggregate math: 4 images x 3 rules, 2 fails, correct pass rates.
- History cap at 10 (FIFO).
