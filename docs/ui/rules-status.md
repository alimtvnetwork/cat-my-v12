# Rule Status: Enabled / Disabled Semantics

Contract for how the `Rule.enabled` domain flag surfaces across the app.
Ownership seam: `useRulesLibrary().byId(id)?.enabled`. All UI and the
runner read through this seam so nothing can drift.

## Domain

- `Rule.enabled?: boolean` on `RuleSchema` in `src/lib/rules/model.ts`.
  Absent or `true` means active; `false` means disabled. Facade-persisted.
- `computeEffectiveChain(...)` in `src/lib/projects/chain.ts` skips rules
  where `enabled === false` and returns them in `ChainResult.disabled:
RuleId[]` so callers can distinguish "not attached" from "attached but
  off".

## Runner (v3.724+)

`runProject(project, rulesets, { isDisabled })` in
`src/lib/projects/project-runner.ts`:

- `isDisabled(ruleId)` is optional; omitting it keeps the pre-v3.724
  behaviour (used by pure-data callers and tests).
- When `isDisabled(ruleId)` returns true the runner emits
  `{ verdict: "SKIP", reason: "Disabled" }` and records the id in
  `ProjectRunSummary.disabled: string[]`.
- The structured `[project-runner] ran` log includes the disabled count.
- `RunSection` in `src/components/projects/ProjectEditorSections.tsx`
  builds the predicate from
  `useRulesLibrary().byId(id)?.enabled === false`.

## Editor surfaces (`ProjectRulesSection`)

Selectors: `isRuleDisabled(id)` computed once per section render.

- Row description appends `, X active` when any attached rule is off
  (v3.721).
- Kind badges for disabled rules render dimmed with strike-through
  (v3.721).
- Per-row `data-testid="project-editor-rule-disabled-chip"` shows the
  disabled count with a `PowerOff` icon and deep-links to
  `/setup/rules?status=disabled` (v3.721).
- Fully-disabled ruleset row switches its border to `ca-warn` and renders
  `data-testid="project-editor-ruleset-all-disabled"` with an inline
  "Review disabled" `Link` (v3.722).
- Project-level `data-testid="project-editor-ruleset-summary"` bar sits
  below the conflict banner and reports "N of M rulesets fully disabled,
  K partially disabled." Warn-toned when any ruleset is fully disabled,
  muted for partial-only, hidden when everything is active (v3.723).

## `/setup/rules` deep-link contract

`validateSearch` on `/setup/rules` accepts
`status: "any" | "enabled" | "disabled"` and seeds the Status filter on
first render (v3.721). All deep-links from the project editor use
`status=disabled`. Preserve the search shape when adding new filters:
deep-link URLs are the API for the Status filter and must remain stable.

## Anti-drift rules

1. New UI that reflects "on/off" state MUST read
   `useRulesLibrary().byId(id)?.enabled`. Do NOT copy `enabled` into local
   component state or the V3 `RuleSet.rules` (EditorRule) shape.
2. New runners / evaluators MUST accept an `isDisabled` predicate rather
   than inlining the lookup, so tests can drive the disabled path with
   pure data.
3. New deep-links MUST use the existing `status` search param; do not add
   a parallel `disabledOnly=1` style flag.
