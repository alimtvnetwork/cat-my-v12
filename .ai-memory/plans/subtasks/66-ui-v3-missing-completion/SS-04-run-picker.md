# SS-04: Run picker with multi rule-set, override chain, verification preview

Slug: run-picker
Parent: 66-ui-v3-missing-completion
Status: pending
Created: 2026-07-17

## Goal

Deliver rows RN-01..RN-05: multi rule-set selection, override chain visualization, verification-image preview, inline edit jump into Rules editor, expected-image-count field on the project.

## Files

- `src/routes/run.tsx`
- `src/routes/projects.$projectId.trial-run.tsx`
- New: `src/components/run/RulesetPicker.tsx`, `src/components/run/OverrideChainView.tsx`, `src/components/run/VerificationImagePreview.tsx`
- `src/lib/projects/store.ts` (add `expectedImageCount` to project)

## Steps

1. Extend project model with `expectedImageCount: number` (default 1). Persist migration.
2. `RulesetPicker`: checkbox list of project rule sets, drag to reorder (uses DockableFrame not required; use dnd-kit list variant already present).
3. `OverrideChainView`: given a picked set of rule sets, render the merged rule tree with a badge per override (Reference/Copy).
4. `VerificationImagePreview`: drop one or two images; run the current stub validator against the merged set; show pass/fail chips.
5. Inline edit: each ruleset row has an "Open in editor" affordance that routes to `/projects/$projectId/rulesets/$rulesetId`.
6. Wire Run button: launches a `RunningProcess` in the floating-pill store (SS-02) with `targetRoute = /projects/$projectId/runs`.
7. Playwright: from `/projects/<id>/trial-run`, pick two rule sets, verify override chain renders, drop image, run, land on runs view.

## Verification

- Unit tests: override chain resolver, expected-image-count validation.
- Playwright covers the full flow, screenshotted per step.
- CI: green.
