# SG-31-01 PatternEdge Panel

Slug: sg-31-01-pattern-edge
Steps: 10
Status: done
Created: 2026-07-15

## Context

Plan 31 (pre-93 panel gaps completion, v3.91.0) deferred the PatternEdge rule-controller panel under gate SG-31-01. Root cause of the deferral: `spec/24-app-ui-design-system/05-rule-controller.md` L34-49 lists no PatternEdge row, so scaffolding a panel would ship UI ahead of spec. This plan amends the spec first, then scaffolds the panel, hook, and tests as a single closed loop.

Related:

- `.lovable/plans/done/31-pre-93-panel-gaps-completion.md` step 15 (deferral record)
- `.lovable/plans/subtasks/31-pre-93-panel-gaps-completion/SS-04-e2e-matrix.md` ("Deferred" section: `setPatternEdge`)
- `src/components/editor/panels/resolver.tsx` (mount point)
- `src/lib/editor/test-hooks.ts` (hook surface)

## Steps

1. Amend `spec/24-app-ui-design-system/05-rule-controller.md` L34-49: add PatternEdge row with prop shape (edgeKernel, threshold, polarity, minLength), token bindings, and DOM selector `data-panel-controller="pattern-edge"`.
2. Extend `EditorRuleParams` union in `src/lib/editor/types.ts` (or schema) with `PatternEdgeParams`; add `DEFAULT_PARAMS.patternEdge`.
3. Scaffold `src/components/editor/panels/PatternEdgePanel.tsx` (token-only styling, no hex literals).
4. Register `pattern-edge` in `src/components/editor/panels/resolver.tsx` dispatch.
5. Extend `EditorTestHooks` in `src/lib/editor/test-hooks.ts` with `setPatternEdge(id, {edgeKernel, threshold, polarity, minLength})`; emit `I_UI_E2E_SET_PATTERN_EDGE`.
6. Unit test: `tests/unit/editor-pattern-edge-defaults.test.ts` — defaults, idempotent update, invalid input rejected with coded error (per `.lovable/memory/03-error-manage.md`).
7. Extend e2e: keyboard (first control tab-focusable), a11y (Axe zero-contrast), visual baseline at 1440x900 and 1024x768, persistence round-trip, perf p95 (include in `seedMix`).
8. Update `SS-04-e2e-matrix.md` — move `setPatternEdge` out of Deferred into the contract table.
9. Update `.lovable/memory/04-design-system.md` QA evidence and remove SG-31-01 deferral marker.
10. Move this file to `.lovable/plans/done/`, flip Status.

## Verification

- Steps 1-2: `rg -n "pattern-edge" spec/24-app-ui-design-system/05-rule-controller.md` returns the new row; `tsgo` green.
- Steps 3-5: `/setup` preview renders PatternEdge panel; `window.__editorTestHooks.setPatternEdge` exists under `?e2e=1`.
- Steps 6-7: unit + e2e JSON reports all `Status: Passed`; Axe zero-contrast preserved.
- Steps 8-10: `rg "SG-31-01" .lovable/` returns no live deferral; plan file in `done/`.
