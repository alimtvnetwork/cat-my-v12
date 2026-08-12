# UI/UX Overhaul: Photoshop-style Layers, Properties split, density audit

Slug: ui-ux-photoshop-layers-overhaul
Steps: 30
status: completed

> Plan 67 overlap (v3.415.0): Titlebar unification, docking primitive, drag affordance polish, and rule-editor scaffolds landed in Plan 67 (v3.370.0–v3.415.0). Remaining: Photoshop-style Layers panel, Properties split, density audit.
> Created: 2026-07-15

## Context

User reports (verbal, Plan 30 turn): the rule editor mixes "layers" with
detector controls (circle-detector inside the Layers list), screens have
overlapping widgets and too many stacked borders, and there is no
Photoshop-style drag/drop/group/merge for rules. This plan lands a proper
Layers panel + separate Properties panel, drag-and-drop with grouping and
merging, and a screen-wide density audit + fix pass. No threshold, no
schema-breaking change to persisted rulesets; group data is additive.

Captured this turn:

- Issue: `.lovable/issues/11-layers-mixed-with-detector-controls.md`
- Issue: `.lovable/issues/12-ui-overlap-and-density.md`
- Command: `.lovable/spec/commands/10-photoshop-layers-and-drag-drop.md`
- Command: `.lovable/spec/commands/11-ui-density-guardrails.md`

Guideline sources honored:

- `spec/coding-guidelines/{typescript,python,sql}.md`
- `coding-guidelines/00-overview.md` + `02-coding-guidelines/`, `07-design-system/`
- `spec/03-error-manage/` (error architecture + registry)
- `spec/21-app/40-error-manage.md` Appendix A (wire codes)

## Steps

1. Read `spec/03-error-manage/{01-error-resolution,02-error-architecture,03-error-code-registry}.md` and `spec/21-app/40-error-manage.md` A.1; pin any new wire codes needed for layers/properties (`E_LAYER_REORDER_FAILED`, `E_LAYER_MERGE_INCOMPATIBLE`, `W_LAYER_GROUP_EMPTY`) into `.lovable/memory/v2/plan35/00-error-contract.md`.
2. Read `coding-guidelines/07-design-system/` and pin the density tokens (`--spacing-hmi-*`, row height mins, border rules) actually used today into `.lovable/memory/v2/plan35/01-design-tokens.md`.
3. Read `src/lib/rules-slice.ts` + `src/lib/editor-slice.ts` + tests under `src/lib/__tests__/` (if any) and write `.lovable/memory/v2/plan35/02-store-shape.md` listing every rule/selection action already in the store.
4. Read `src/components/editor/rail/{RightRail,RuleList,RuleRow,CircleRuleEditor,RectRuleEditor,OcrRuleEditor,TextRuleEditor,MathRuleEditor}.tsx` and `src/components/editor/panels/*` and write `.lovable/memory/v2/plan35/03-current-rail.md`: what renders where today.
5. Density audit: run Playwright captures for the 19 screens listed in SS-04 at 1280x800 and 1920x1080 to `/tmp/browser/plan35/*.png`; write `.lovable/memory/v2/plan35/04-density-audit.md` (see ./subtasks/35-ui-ux-photoshop-layers-overhaul/SS-04-density-audit.md).
6. Fix duplicate-border and section-bar-vs-top-menu duplication surfaced in step 5, one commit per screen; honor Command 11 guardrails.
7. Extend rules-slice with `RuleGroup`, `groups: RuleGroup[]`, `selectedIds: string[]`, and pure reducers `reorderRule`, `groupSelected`, `ungroup`, `mergeSelected` (see SS-03). Additive JSON, no migration on read.
8. Unit tests `src/lib/__tests__/rules-slice-groups.test.ts` covering reorder before/after/into, group/ungroup preserves index, merge requires >=2 same-kind.
9. Build `src/components/editor/layers/LayersPanel.tsx` + `LayerRow.tsx` per SS-01. Renders visibility, lock, type badge, inline-editable name, chevron, drag handle. Uses `dnd-kit` (add via bun if not present).
10. Build `src/components/editor/layers/useLayerDnd.ts` wrapping `dnd-kit` sensors + collision detection; emits `reorder(sourceId, targetId, position)`. Wrap store mutation in try/catch, log `layers.reorder_failed` with typed code from step 1, surface a toast.
11. Add group primitives to the panel toolbar: [Group], [Ungroup], [Merge] buttons wired to store actions; disabled states with tooltips explaining prerequisites.
12. Build `src/components/editor/properties/PropertiesPanel.tsx` per SS-02. Empty state, single-select, multi-select-same-kind, multi-select-mixed-kind branches. Reuses existing per-type editors unchanged.
13. Move the per-type editors (`CircleRuleEditor`, `RectRuleEditor`, `OcrRuleEditor`, `TextRuleEditor`, `MathRuleEditor`) from `src/components/editor/rail/` to `src/components/editor/properties/editors/`; update imports and tests. Keep behavior identical.
14. Refactor `src/components/editor/rail/RightRail.tsx` into a two-panel column: top = LayersPanel, bottom = PropertiesPanel, with a resizable splitter (`src/components/ui/resizable.tsx` already installed).
15. Delete `RuleList.tsx` and `RuleRow.tsx` from `rail/` once LayersPanel covers every use site; keep `RuleSetIOBar.tsx` intact.
16. Wire keyboard shortcuts in LayersPanel: Delete/Backspace = remove, Cmd/Ctrl+G = group, Cmd/Ctrl+Shift+G = ungroup, Cmd/Ctrl+E = merge, ArrowUp/Down = move selection, Cmd/Ctrl+Click = multi-select, Shift+Click = range select.
17. Add drag-to-canvas from the LayersPanel row: dragging a rule onto `CanvasViewport` re-centers the canvas on that rule (existing selection wiring only; no schema change).
18. Add visibility + lock to `CanvasViewport` / `SelectionOverlay` respectors: hidden rules do not render overlay; locked rules cannot be transformed. Log `layers.locked_transform_blocked` on attempt.
19. Component tests `src/components/editor/layers/__tests__/LayersPanel.test.tsx`: renders rows, toggles visibility, toggles lock, multi-select, reorder, group, ungroup, merge, keyboard shortcuts.
20. Component tests `src/components/editor/properties/__tests__/PropertiesPanel.test.tsx`: empty / single / multi-same / multi-mixed branches; resolver fallback on unknown kind.
21. E2E via Playwright at `/tmp/browser/plan35/e2e_editor.py`: open `/projects/:id/rulesets/:id`, add 3 rules, drag rule 3 above rule 1, group rules 1+2, merge, screenshot each transition. Attach screenshots to the audit memo.
22. Update ruleset serializer `src/lib/rules-serializer.ts` (or nearest) to include `groups`; keep backward compatibility (read tolerates absent field, write always emits, even if empty).
23. Update rule-set import test `src/lib/__tests__/rules-io.test.ts` (or add) to cover `groups` round-trip and legacy-input tolerance.
24. Update `spec/21-app/40-error-manage.md` A.1 to register the three new wire codes from step 1 with subject/detail schema; append changelog to `spec/03-error-manage/98-changelog.md`.
25. Update `spec/21-app/**` rule-editor spec (or nearest active file) with a "Layers vs Properties" section and drag/drop/group/merge contract; reference Command 10.
26. Update `.lovable/memory/index.md` with a "Plan 35 UI overhaul (v3.138.0)" block linking the memos + `20-audit.md` screenshots.
27. Docs: append entries to `CHANGELOG.md`, `RELEASE_NOTES.md`, `README.md` version-history for Plan 35 landing. Note the new Layers/Properties split and drag/drop.
28. Run `python scripts/bump_minor.py --title "Plan 35 UI overhaul closed"` (or the current bump script) to move `v3.137.0` -> `v3.138.0`; verify parity across `package.json`, `README.md`, `CHANGELOG.md`, `RELEASE_NOTES.md`.
29. Run full gate: `bunx tsgo --noEmit`, `bunx vitest run`, `pytest -q` (denial + audit suites), and the Playwright E2E from step 21; attach output tails to a "Plan 35 gate" memo.
30. Move this file to `.lovable/plans/done/35-ui-ux-photoshop-layers-overhaul.md` and flip `status: completed` -> `Status: completed`; leave Plan 29/32/33 in `pending/` (unaffected).

## Verification

- Steps 1-4: `ls .lovable/memory/v2/plan35/` shows 4 memo files.
- Step 5-6: audit memo shows every screen at both viewports with overlap=n, dup-border=n.
- Steps 7-8: `bunx vitest run src/lib/__tests__/rules-slice-groups.test.ts` green.
- Steps 9-15: LayersPanel + PropertiesPanel visible at `/projects/:id/rulesets/:id`; no per-type editor imports remain in `src/components/editor/rail/`.
- Steps 16-18: keyboard + drag + visibility/lock demoed in Playwright screenshots.
- Steps 19-21: vitest + Playwright green; screenshots committed.
- Steps 22-23: `bunx vitest run src/lib/__tests__/rules-io.test.ts` green with groups round-trip.
- Steps 24-25: `rg "E_LAYER_REORDER_FAILED" spec/` returns matches.
- Step 26: index.md block present.
- Steps 27-28: `grep 3.138.0 package.json README.md CHANGELOG.md RELEASE_NOTES.md` returns 4.
- Step 29: gate memo shows all three suites green.
- Step 30: `ls .lovable/plans/pending/35-*` empty; `ls .lovable/plans/done/35-*` present.

## Appended from prior pending tasks

- Plan 29 (`.lovable/plans/pending/29-denial-burst-threshold-tuning.md`): derivation 16-25, migration/code 26-35, tests 36-42, spec+observability 43-48, close-out 49-50. Not touched by Plan 35.
- Plan 32 (`.lovable/plans/pending/32-sg-31-01-pattern-edge.md`): SG-31-01 PatternEdge, 10 steps. Not touched by Plan 35.
- Plan 33 (`.lovable/plans/pending/33-plan-29-denial-burst-tuning-read-phase.md`): steps 15-20 remaining (derivation-inputs memo, parent checklist flip, memory index, docs, move to done). Not touched by Plan 35.
- Open issues carried forward: `01-spec-21-blind-ai-readiness.md`, `09-setup-ui-not-modern.md`, `10-home-missing-projects-and-top-nav.md` (partially addressed by Plan 34; verify in step 5 audit), plus the two new issues 11 and 12 captured this turn.
