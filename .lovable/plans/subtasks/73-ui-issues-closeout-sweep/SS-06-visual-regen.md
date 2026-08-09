# SS-06 visual baseline regen

Slug: visual-regen
Parent: 73-ui-issues-closeout-sweep
Status: pending
Created: 2026-07-18

## Scope

Regenerate `tests/visual/` baselines only for routes intentionally changed by this sweep. No blanket update.

## Steps

1. Compute the set of changed routes from steps 4-31 of the parent plan.
2. For each changed route: `bunx playwright test tests/visual/routes.spec.ts -g "<route>" --update-snapshots`.
3. Do NOT run `--update-snapshots` on unchanged routes; a diff on those is a regression.
4. Commit updated snapshots with a one-line message per route.

## Verification

- `git status tests/visual/` shows only baselines for routes in the changed set.
- Full `tests/visual/routes.spec.ts` run is green afterwards.
