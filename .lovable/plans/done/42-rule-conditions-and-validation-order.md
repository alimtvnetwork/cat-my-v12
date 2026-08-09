# Rule conditions (SameImage / Presence / Color) + validation order

Slug: rule-conditions-and-validation-order
Steps: 30
Status: pending

> Plan 67 overlap (v3.415.0): Rule editor primitives (OCR, Flaw, Barcode, Blob, EdgeWidth, EdgePitch, Positional, ColorMat) and per-project ruleset + category resolver landed in Plan 67 (v3.401.0–v3.411.0). Remaining: SameImage / Presence / Color conditions and cross-rule validation order.
> Created: 2026-07-16

## Context

User (command 18) wants each rectangular / circular rule to carry
richer conditions and each ruleset to choose between parallel and
sequential validation:

- Match modes: SameImage, Presence (Present/Absent), Color (Current,
  Dense2, Dense3, Picked with eyedropper).
- Multiple conditions per rule via "Add condition" + button.
- Drag-drop reorder in the layer list (already partly covered by
  Plan 41 keyboard DnD).
- Ruleset-level `Parallel` vs `Sequential` validation, with reorder
  authoritative in Sequential mode.

Direction: spec first (`spec/21-app/40..43`), then schema + UI, then
Python contract. No behavior change until each layer lands.

Captured input:

- `.lovable/spec/commands/18-rule-condition-and-validation-order.md`

Applicable guidelines (all present):

- `.lovable/coding-guidelines/coding-guidelines.md`
- `spec/02-coding-guidelines/**` (enums per concept, no magic strings)
- `spec/03-error-manage/**` (AppError + ErrorCode required)

Primary files touched: `spec/21-app/40..43*.md` (new),
`src/types/rules/**`, `src/lib/editor/schema.ts`,
`src/lib/editor/migrations.ts`,
`src/components/editor/panels/RuleControllerPanel.tsx` (new),
`src/components/editor/layers/LayersPanel.tsx`,
`src/components/editor/canvas/SelectionOverlay.tsx`,
`src/lib/editor/runner/**`.

## Steps

1. Read `spec/21-app/16-processing-pipeline.md`,
   `spec/21-app/17-parallelism-guarantees.md`, and the current
   `src/lib/editor/schema.ts` end-to-end; list every field that must
   evolve.
2. Draft `spec/21-app/40-rule-condition-model.md` (see
   `./subtasks/42-rule-conditions-and-validation-order/SS-01-spec-authoring.md`).
3. Draft `spec/21-app/41-color-condition.md` with Current / Dense2 /
   Dense3 / Picked param shapes (see SS-01).
4. Draft `spec/21-app/42-validation-order.md` covering Parallel vs
   Sequential semantics + short-circuit rules (see SS-01).
5. Draft `spec/21-app/43-rule-controller-ui.md` with the per-rule and
   ruleset UI contract (see SS-01).
6. Append the four new spec files to
   `spec/21-app/99-consistency-report.md` and update
   `spec/spec-index.md`.
7. Add enum `ConditionType` at `src/types/rules/ConditionType.ts`
   (SameImage, Presence, Color) + label map.
8. Add enum `PresenceMode` at `src/types/rules/PresenceMode.ts`
   (Present, Absent) + label map.
9. Add enum `ColorMode` at `src/types/rules/ColorMode.ts`
   (Current, Dense2, Dense3, Picked) + label map.
10. Add enum `ValidationMode` at `src/types/ruleset/ValidationMode.ts`
    (Parallel, Sequential) + label map.
11. Extend `src/lib/editor/schema.ts` with `RuleCondition` Zod schema
    and `Rule.conditions: RuleCondition[]` (see SS-02).
12. Extend `src/lib/editor/schema.ts` with
    `Ruleset.validationMode: ValidationMode`, default Parallel.
13. Add normalizers: `normalizeConditionType`, `normalizePresenceMode`,
    `normalizeColorMode`, `normalizeValidationMode` mirroring
    `normalizeGrowthTolerance`.
14. Bump schema version v2 -> v3 in
    `src/lib/editor/migrations.ts`; wrap existing rule semantics into
    one `SameImage` condition; set `validationMode = Parallel`.
15. Vitest: migration v2 -> v3 round-trip + normalizer fallback tests.
16. Build `RuleControllerPanel.tsx` per SS-03 (match-mode segmented
    control, conditional sub-panels, conditions list, add button).
17. Wire `RuleControllerPanel` into the existing rule details drawer;
    no styling changes elsewhere.
18. Implement the color eyedropper trigger (`Picked` mode) sampling
    from the current image via existing canvas coord helpers.
19. Implement Dense2 / Dense3 dominant-color extraction helper in
    `src/lib/editor/color/dense.ts` (pure function, deterministic).
20. Add the `Parallel | Sequential` segmented control to
    `LayersPanel.tsx` header, bound to `ruleset.validationMode`.
21. Add numeric prefixes to layer rows when Sequential is active.
22. Ensure keyboard DnD from Plan 41 continues to work on the
    condition sub-list inside `RuleControllerPanel`.
23. Extend the runner in `src/lib/editor/runner/**` to evaluate each
    condition per rule and merge verdicts by AND.
24. Add sequential short-circuit: on first `FAIL`, remaining rules
    marked `Skipped` and their canvas overlay is dimmed with a
    tooltip "Skipped due to earlier failure".
25. Wire runner errors through `AppError` with a new
    `ErrorCode.RuleConditionEval` (add to
    `src/types/errors/ErrorCode.ts`).
26. Vitest: runner unit tests for each ConditionType (SameImage,
    Presence Present/Absent, ColorCurrent, ColorDense2, ColorDense3,
    ColorPicked) using fixture images.
27. Vitest: ruleset-level tests for Parallel vs Sequential merge +
    short-circuit.
28. Playwright: create a rule, add a Presence(Absent) condition,
    switch ruleset to Sequential, reorder via drag-drop, run, assert
    results row shows correct verdicts and skipped states.
29. Update `.lovable/coding-guidelines/coding-guidelines.md` to
    reference the new enum modules and forbid free-text condition
    strings.
30. Move this plan file to
    `.lovable/plans/done/42-rule-conditions-and-validation-order.md`
    and flip Status to `completed` once steps 1-29 pass tsgo +
    vitest + the new e2e.

## Verification

- Spec: files exist at `spec/21-app/40..43*.md` and are linked from
  `spec/spec-index.md`.
- Types: `bunx tsgo --noEmit` clean after each enum + schema change.
- Unit: `bunx vitest run` includes new migration, dense-color, and
  runner suites; all pass.
- E2E: `python3 tests/e2e/rule_conditions_flow.py` (new) writes a
  Passed report under `tests/reports/`.
- Manual: preview shows the new controller panel, segmented match
  mode, add-condition button, Parallel/Sequential toggle, and
  Sequential prefixes.
- Guideline: `.lovable/coding-guidelines/coding-guidelines.md`
  references the new enum modules.

## Appended from prior pending tasks

Scan of `.lovable/plans/pending/` at plan creation time. These
remain open and are not folded in here because they target
independent surfaces; this plan will not regress them:

- 29-denial-burst-threshold-tuning
- 32-sg-31-01-pattern-edge
- 33-plan-29-denial-burst-tuning-read-phase
- 35-ui-ux-photoshop-layers-overhaul (overlap: layer panel header,
  reconcile with step 20)
- 36-ui-app-shell-and-src-v3-port
- 37-home-dexter-ui-repair
- 38-read-memory-onboarding-and-audit
- 39-read-spec-code-and-memorize
- 40-tools-images-spec-docs
- 41-keyboard-dnd-and-code-quality-pass (overlap: reused for condition
  sub-list keyboard DnD in step 22; land Plan 41 first)
