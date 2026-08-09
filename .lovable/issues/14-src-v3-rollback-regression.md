# src_v3 rollback regression

Slug: src-v3-rollback-regression
Status: closed
Closed-by: Plan 75
Closed-on: 2026-07-18
Created: 2026-07-16

## Symptom

The user reports that using `src_v3/` brought back old UI instead of improving the current React UI.

## Expected

Remove `src_v3/` from the repo and stop treating it as the design source of truth. Preserve and improve the current app around the home-first project workflow.

## Actual

Plan 36 proposes copying and porting many `src_v3/` surfaces, including replacing the home route with v3 Jobs + Tasks.

## Related

- `.lovable/plans/pending/36-ui-app-shell-and-src-v3-port.md`
- `.lovable/spec/commands/12-home-dexter-ui-flow.md`
