# Read synthesis for UI V4 JSON seed facade completion

Slug: read-synthesis
Status: pending
Created: 2026-07-19
Parent: 86-ui-v4-json-seed-facade-completion

## Scope

Steps 1-10 are a read and synthesis phase only. They must not change application code. The output is an implementation map that explains exactly which V4 UI surfaces need seed values, which facade owns each value, which JSON slice will feed it, and which existing plan item or issue it satisfies.

## Required inputs

- `.lovable/plans/pending/79-ui-improvements-v4.md`
- `.lovable/plans/pending/80-ui-improvements-v4-polish.md`
- `.lovable/plans/pending/82-plan100-ui-v4-100steps.md`
- `spec/21-app/53-ui-improvements-v4.md`
- `.lovable/spec/commands/35-seed-fixtures-per-screen.md`
- `.lovable/spec/commands/37-json-seedable-config-facade-ui.md`
- `.lovable/issues/35-ui-seeding-values-not-complete.md`

## Output

Create a matrix in a later subtask note with columns: UI surface, route or component, seed JSON slice, facade API, first-run profile, test fixture profile, acceptance signal, and linked plan or issue.
