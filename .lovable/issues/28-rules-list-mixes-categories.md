# Rules list shows categories mixed with rules

Status: open

## Symptom

On the Rule Set page, the list of rules shows both categories and rules together.
User expects only rules in the rules list; categories belong under the Categories tab.

## Repro

1. Open Projects > <project> > Rule Sets > <ruleset>
2. Observe list: category entries and rule entries interleaved

## Expected vs Actual

- Expected: rules only in "Rules" list. Categories on their own tab.
- Actual: mixed.

## Related files

- `src/features/rules/…`, `src/lib/rules/useRulesLibrary.ts`
- Filter by `isCategory === false` when rendering the rules list.

Reference: `spec/21-app/53-ui-improvements-v4-assets/plan82/upload-75.png`,
`upload-76.png`.
