# Pre-93 Panel Gaps Completion

Slug: pre-93-panel-gaps-completion
Steps: 30
Status: completed
Created: 2026-07-15

## Context

Plan 30 (rule-editor revamp) closed at v3.76.0 with steps 93+ QA gates green, but the pre-93 panel implementation left three gaps flagged as follow-ups in `.lovable/memory/index.md` (Plan 30 CLOSED section) and in prior next-task notes:

1. LightingDrawer + reference-asset side panels.
2. NumberPanel / ColorPanel / Blob rule-controller panels. (PatternEdge deferred, see SG-31-01 below.)
3. Forward-only v1 -> v2 rule migration for persisted setups.

Files most likely involved: `src/components/editor/`, `src/lib/editor/`, `src/routes/setup*.tsx`, `spec/24-app-ui-design-system/`, `.lovable/memory/04-design-system.md`. No new user commands or issues to capture this turn (none provided).

Related:

- `.lovable/plans/done/30-app-ui-rule-editor-revamp.md`
- `.lovable/memory/04-design-system.md`
- `spec/24-app-ui-design-system/08-testing.md`

## Steps

1. Read `src/components/editor/` tree and list every existing panel file with a one-line purpose.
2. Read `src/lib/editor/` (store, schema, test-hooks) and identify the persisted rule-shape version constant.
3. Read `spec/24-app-ui-design-system/` in full; extract the panel contract for Lighting, Reference, Number, Color, Pattern-Edge, Blob.
4. Diff extracted contracts against existing panel files. Write the gap matrix to `./subtasks/31-pre-93-panel-gaps-completion/SS-01-gap-matrix.md`.
5. Draft the v1 -> v2 rule-schema delta (added fields, defaults, invariants) into `./subtasks/31-pre-93-panel-gaps-completion/SS-02-schema-migration.md`.
6. Add v2 shape + `schemaVersion: 2` to `src/lib/editor/schema.ts` (or equivalent), keeping v1 types exported for the migration.
7. Write pure `migrateRuleV1ToV2(rule)` in `src/lib/editor/migrations.ts`; forward-only, deterministic, no I/O.
8. Add loader hook: on store rehydrate, if `schemaVersion < 2` run `migrateRuleV1ToV2` on each rule before commit.
9. Unit test: `tests/unit/editor-migrate-v1-to-v2.test.ts` covers empty, single rule, mixed batch, already-v2 idempotence, unknown-kind reject.
10. Wire migration failure path through the project error-management contract (`.lovable/memory/03-error-manage.md`): coded log + surfaced user error, no silent catch.
11. Scaffold `LightingDrawer.tsx` under `src/components/editor/panels/` with token-only styling (no hex literals).
12. Scaffold `ReferenceAssetPanel.tsx` beside it; wire it into the reference route slot.
13. Scaffold `NumberPanel.tsx` with min / max / decimals / unit controls bound to the rule store.
14. Scaffold `ColorPanel.tsx` with target color, tolerance (dE), colorspace select.
15. **DEFERRED (SG-31-01).** PatternEdgePanel removed from this plan. `spec/24-app-ui-design-system/05-rule-controller.md` L34-49 has no PatternEdge row. Track a follow-up plan that amends the spec first, then scaffolds the panel.
16. Scaffold `BlobPanel.tsx` with area min / max, count min / max, connectivity select.
17. Register the six panels in the rule-kind -> panel resolver used by `EditorSetupExperience.tsx` (or the current controller mount point).
18. Confirm keyboard reachability: each panel's first control is tab-focusable from the rule-list; extend `tests/e2e/editor_keyboard.py` with one assertion per new panel kind.
19. Confirm Axe: extend `tests/e2e/editor_a11y.py` sweep to open each new panel and re-scan; zero contrast, zero critical.
20. Extend visual baseline set in `tests/e2e/editor_visual.py` to cover each new panel at 1440x900 and 1024x768; regenerate baselines under `tests/reports/visual/`.
21. Extend `tests/e2e/editor_persistence.py` to seed one rule per new kind, reload, and assert round-trip equality post-migration.
22. Extend `tests/e2e/editor_perf.py` seed to include the six new kinds; re-verify p95 <= 20 ms budget with 200 mixed rules.
23. See `./subtasks/31-pre-93-panel-gaps-completion/SS-03-panel-tokens.md` for the token map each new panel must use (spacing, radius, typography, focus ring).
24. See `./subtasks/31-pre-93-panel-gaps-completion/SS-04-e2e-matrix.md` for the exact test-hook contract each new panel must expose via `src/lib/editor/test-hooks.ts`.
25. Update `spec/24-app-ui-design-system/` panel chapter with the six panels' final prop shapes and token bindings.
26. Update `.lovable/memory/04-design-system.md` QA evidence table with the extended reports.
27. Update `.lovable/memory/index.md` to link plan 31 closure and remove the pre-93 panel gaps follow-up note.
28. Run `scripts/bump_minor.py --title "Plan 31 closed: pre-93 panel gaps completed"` to bump minor, refresh changelog + release notes, pin readme version.
29. Move `.lovable/plans/pending/31-pre-93-panel-gaps-completion.md` to `.lovable/plans/done/` and flip `Status: pending` -> `Status: completed`.
30. Post-close: verify backlog top is now Plan 29 (denial-burst tuning) with no remaining pre-93 gaps referenced anywhere under `.lovable/`.

## Verification

- Steps 1-5: subtask files exist under `.lovable/plans/subtasks/31-pre-93-panel-gaps-completion/`; gap matrix names every missing panel with file target.
- Steps 6-10: `tsgo` green; unit test file passes; error path emits a coded log line visible in the run.
- Steps 11-17: preview at `/setup`, `/setup/roi`, `/setup/reference` renders each new panel without console errors; screenshots captured.
- Steps 18-22: JSON reports under `tests/reports/e2e-editor-*.json` all `Status: Passed`; Axe report `a11y-axe-editor.json` remains zero-contrast; visual baselines committed with `maxDiffPixelRatio <= 0.01`.
- Steps 25-27: `rg "pre-93 panel gaps" .lovable/` returns no live follow-up references.
- Steps 28-30: readme, changelog, release_notes pinned to the new minor; `ls .lovable/plans/pending/ | grep 31` empty; `ls .lovable/plans/done/ | grep 31` present.

## Appended from prior pending tasks

- Plan 29 (`.lovable/plans/pending/29-denial-burst-threshold-tuning.md`, Status: pending) is not folded in: it is an independent security-tuning workstream tracked separately with its own subtask notes (`.lovable/plans/subtasks/29-denial-burst-threshold-tuning/`). Sequencing: Plan 31 executes on UI code; Plan 29 executes on security telemetry. They can run in parallel; no shared files.
