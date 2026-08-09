---
title: Rule editor revamp — rollback, DoD, smoke test, perf budgets
slug: rule-editor-revamp-verification
plan: 30
step: 54
status: draft
---

# Rule editor revamp — verification pack

Companion to `right-rail-rule-list.md` and `04-rule-layers.md`. Owns
the safety net for the layers panel + rule-controller revamp:
rollback, per-step DoD, UX smoke test, and perf budgets.

## 1. Rollback plan

The revamp is the surface: `RightRail`, `RuleList`, `RuleRow`,
`OcrRuleEditor`, `RuleSetIOBar`, plus the `CanvasViewport` keyboard
handler. Rollback stays behind a runtime flag and never touches the
store, log schema, or route tree.

### Feature flag

- Flag: `editor.ruleEditor.v2` in `src/lib/editor/flags.ts`, default
  `true` after ship, read once at mount by `EditorSetupExperience`.
- When `false`, mount the prior `RuleListLegacy` + `RightRailLegacy`
  bundle preserved under `src/components/editor/rail/_legacy/` for
  one release. Legacy sources are import-frozen (see G-LEGACY-01).

### Trigger criteria (any one flips the flag to `false`)

- Any P0 in the smoke test below fails on `main`.
- Any perf budget in section 4 regresses by >20% for 2 consecutive
  CI runs.
- Structured error rate `E_UI_*` on the editor route exceeds 0.5%
  of sessions in the last 24h (`spec/03-error-manage`).

### Rollback procedure

1. Flip `editor.ruleEditor.v2` to `false` via config; no redeploy.
2. Verify legacy shell mounts (probe: `[data-testid="rail-legacy"]`).
3. File a follow-up issue linking the failing smoke row or budget row.
4. Keep legacy code until the next release removes it (tracked in
   `98-changelog.md`).

### Regression guards

```bash
# G-LEGACY-01: no cross-import from v2 into legacy shell
rg -n "from \"@/components/editor/rail/_legacy" src/components/editor/rail | rg -v "_legacy/"

# G-FLAG-01: flag is read exactly once, at the shell boundary
rg -n "editor\.ruleEditor\.v2" src | rg -v "flags\.ts|EditorSetupExperience"
```

Expected: both empty.

## 2. Acceptance criteria and DoD per step

Applies to every pragmatic spec step in the revamp (rail scaffold,
list, row, OCR editor, ruleset IO, canvas a11y). A step is Done
only when every row is checked.

| #   | Criterion                                             | Definition of Done                                                                                                    |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| A-1 | Behavior matches `04-rule-layers.md` Acceptance table | Every R-1..R-10 row has a corresponding Vitest or Playwright case, all green in CI                                    |
| A-2 | Structured logs only                                  | `rg "console\." src/components/editor` empty; logger events named in `03-error-manage/03-error-code-registry`         |
| A-3 | Types strict                                          | `bunx tsgo --noEmit` clean; no `any`, no `as unknown as` in touched files                                             |
| A-4 | Tokens only                                           | No hex, no arbitrary Tailwind `[…]` colors in touched files (`rg "#[0-9a-f]{3,6}\|\\[#" src/components/editor` empty) |
| A-5 | A11y                                                  | Every interactive element has an accessible name; every icon-only button has `aria-label`; landmarks unchanged        |
| A-6 | Perf                                                  | Budgets in section 4 met on the fixture in `08-testing.md`                                                            |
| A-7 | Rollback                                              | Legacy bundle still mounts under `?flag=editor.ruleEditor.v2=false` in preview                                        |
| A-8 | Docs                                                  | `98-changelog.md` entry + this note's changelog row updated                                                           |

DoD gate: PR checklist links the step's row in `04-rule-layers.md`
Acceptance and the smoke test in section 3.

## 3. UX smoke-test checklist

Ten-minute manual pass before merging any step. Fixture: three rules
(`C`, `R`, `K`) from `EditorSetupExperience` seed. P0 fails block
merge; P1 fails are follow-up issues.

### Keyboard (P0)

- [ ] Tab reaches the rail listbox, then the canvas, then the top bar.
- [ ] `↑` / `↓` moves roving focus and selection between rows.
- [ ] `Home` / `End` jump to first / last row.
- [ ] `Alt+↑` / `Alt+↓` reorder the focused rule; boundaries are no-ops, not wrap.
- [ ] `V` toggles visibility on the focused row; `L` toggles lock.
- [ ] `Enter` / `Space` commit selection.
- [ ] Canvas: arrow keys pan, `+` / `-` zoom, `Escape` cancels an in-progress draw.

### A11y (P0)

- [ ] Every icon-only button announces its rule name (e.g. "Hide Package outline").
- [ ] Listbox announces active option via `aria-activedescendant`.
- [ ] Focus ring visible on every focusable element (contrast ≥ 3:1).
- [ ] Canvas has `role="application"` and `aria-describedby` pointing at instructions.
- [ ] axe-core Playwright run: zero serious/critical violations on the editor route.

### Core flows (P0)

- [ ] Draw a rule on the canvas → row appears at the top of the list, selected.
- [ ] Click a row → selection mirrors on canvas.
- [ ] Toggle visibility → shape overlay hides same frame.
- [ ] Toggle lock → canvas hit-test skips the shape.
- [ ] Reorder via chevrons and via `Alt+↑/↓` produce identical order.
- [ ] Export JSON, reload page, import JSON → identical rule list (deep-equal on ids stripped).
- [ ] OCR rule (`K`): change match mode / threshold → persists, no console errors.

### Nice-to-have (P1)

- [ ] Rail scrolls independently at 200 rows without canvas jank.
- [ ] `Escape` from rail focus returns focus to the shell body.
- [ ] Import error banner appears on malformed JSON and is dismissible by re-importing.

## 4. Performance budgets

Measured on the CI perf harness (`spec/24-app-ui-design-system/08-testing.md`)
with the 200-rule fixture, throttled to 4× CPU.

| Budget                                             | Target                                  | Hard cap      | Source of truth                         |
| -------------------------------------------------- | --------------------------------------- | ------------- | --------------------------------------- |
| Interaction frame time (select / toggle / reorder) | ≤ 8 ms                                  | 16 ms         | React Profiler `commitTime`             |
| Canvas draw frame time (pan / zoom)                | ≤ 10 ms                                 | 16 ms         | `performance.mark` around `renderFrame` |
| `RuleList` renders per selection change            | ≤ 1                                     | 2             | `whyDidYouRender` counter in test       |
| `RuleRow` renders per toggle                       | ≤ 1 for the toggled row, 0 for siblings | 1 sibling max | same                                    |
| Rail scroll long-task count (10s scroll)           | 0                                       | 1             | Playwright `longTask` observer          |
| Initial editor route TTI                           | ≤ 1500 ms                               | 2500 ms       | Lighthouse CI                           |
| Bundle delta for the revamp                        | ≤ +8 KB gz                              | +15 KB gz     | `bun run build --analyze`               |

### Wire-in

- Vitest: `src/components/editor/rail/__perf__/render-count.test.ts`
  fails when render counts exceed the target column.
- Playwright: `tests/perf/editor-rail.spec.ts` fails when frame time
  exceeds the hard cap or long-tasks appear.
- CI job `perf-budgets` publishes a run summary; two consecutive
  regressions trigger the rollback in section 1.

### Verification hook

Add to the step's PR description:

```text
Perf budgets:
- interaction frame time: <value> ms (target ≤ 8, cap ≤ 16)
- canvas frame time: <value> ms (target ≤ 10, cap ≤ 16)
- RuleList renders/selection: <n> (target ≤ 1)
- Bundle delta: <+kb> gz
```

A missing row is a DoD failure (A-6).

## Changelog

- 2026-07-14 — Initial draft (rollback, DoD, smoke test, perf budgets).
