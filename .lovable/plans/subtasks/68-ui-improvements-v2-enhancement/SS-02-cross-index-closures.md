# SS-02 Cross-index closures

Slug: cross-index-closures
Status: done
Parent: 68-ui-improvements-v2-enhancement
Created: 2026-07-17

## Goal

For every id in SS-01, name the plan + step + shipping version + verification signal that closed it, or record "no closer found". This table feeds SS-03 classification.

## Method

Walked `.lovable/plans/done/` (plans 24, 30, 31, 34, 37, 42, 43, 45, 64, 65, 66, 67), `CHANGELOG.md`, `RELEASE_NOTES.md`, and version pins in `README.md`. Version strings pulled from CHANGELOG entries in the same commit as the referenced plan step. When only one of {plan 66, plan 67} touches an item, only that plan is cited; when both touch it, both are cited because plan 67 was the fluid-polish slice of the plan 66 stream.

## Closure table

Legend: `closed` = code + spec + verification all done ; `pending` = code missing or partial ; `deferred` = intentionally shelved with a written decision.

| id      | status   | closer plan/step            | version                                | verification                                                                                           |
| ------- | -------- | --------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| I-SH-01 | closed   | plan 66 s3, plan 67 s10     | v3.390.0, v3.399.0, v3.430.0           | Titlebar single `<header>`, screenshots plan67/10                                                      |
| I-SH-02 | closed   | plan 67 s10                 | v3.399.0, v3.430.0                     | Two-row flex Titlebar, no "Control Automation" repeat                                                  |
| I-SH-03 | closed   | plan 66 s5, plan 67 s11     | v3.399.0, v3.430.0                     | `AppBreadcrumb.tsx` with match-tree, store-resolved names                                              |
| I-SH-04 | closed   | plan 66 s4, plan 67 s12     | v3.399.0                               | Back/Forward in header, playwright deep-nav                                                            |
| I-SH-05 | closed   | plan 66 s6, plan 67 s13     | v3.399.0                               | `RunningPill` draggable, position persisted                                                            |
| I-SH-06 | closed   | plan 66 s7, plan 67 s8      | v3.399.0                               | shadcn Command palette on Cmd/Ctrl+Shift+P                                                             |
| I-SH-07 | closed   | plan 66 s7, plan 67 s7      | v3.399.0                               | Window menu with checkmarks                                                                            |
| I-SH-08 | closed   | plan 67 s14                 | v3.399.0                               | fixed padding, topnav_no_cls playwright pass                                                           |
| I-SH-09 | closed   | plan 67 s9                  | v3.399.0                               | Window menu hidden outside editor routes                                                               |
| I-SH-10 | closed   | user request 2026-07-17     | v3.432.0                               | Home cards cursor-default, only pills clickable                                                        |
| I-SU-01 | closed   | plan 67 s15                 | v3.401.0                               | three-tile setup landing (Camera/Rules/Lighting)                                                       |
| I-SU-02 | closed   | spec 24 rename pass         | pre-v3.400                             | `Ruleset` terminology across code + spec                                                               |
| I-SU-03 | closed   | plan 42 (spec 47)           | v3.417.0+                              | PascalCase types, `humanizeLabel` UI helper                                                            |
| I-SU-04 | closed   | plan 67 s16                 | v3.401.0                               | `LightingReadout` + store fields wired                                                                 |
| I-SU-05 | pending  | none                        | -                                      | camera surface still stub only; no exposure/pockets/shutter form built                                 |
| I-SU-06 | closed   | plan 66 s8                  | v3.399.0                               | `yaml`-backed bundle round-trip test                                                                   |
| I-SU-07 | deferred | plan 66 s9                  | v3.399.0                               | warning-zip path chosen (Q2 c); sql.js deferred                                                        |
| I-RE-01 | closed   | plan 67 s17                 | v3.401.0                               | Program panel removed from `/setup/rules`                                                              |
| I-RE-02 | closed   | plan 67 s17                 | v3.401.0                               | full-width layer row, right-side chevron                                                               |
| I-RE-03 | closed   | plan 67 s10-14, s17         | v3.399.0-v3.401.0                      | line-density reduction in Titlebar + rules editor                                                      |
| I-RE-04 | closed   | plan 66 s10, plan 67 s18-21 | v3.370.0, v3.401.0                     | `DockableFrame.tsx` primitive + 11 tests + migrated 4 panels                                           |
| I-RE-05 | closed   | plan 67 s6                  | v3.399.0                               | `palette-store` persistence per-workspace                                                              |
| I-RE-06 | closed   | plan 67 s2                  | v3.390.0                               | grip-only drag initiator, grab->grabbing                                                               |
| I-RE-07 | closed   | plan 67 s3                  | v3.399.0                               | 5-region drop overlay with token highlight                                                             |
| I-RE-08 | closed   | plan 66 s11, plan 67 s24    | v3.371.0                               | `compile-shape.ts` + round-trip unit test                                                              |
| I-RE-09 | closed   | plan 66 s12, plan 67 s25    | v3.372.0, v3.403.0                     | SVG Import/Export UI in Design Mode + Layers                                                           |
| I-RE-10 | closed   | plan 66 s13, plan 67 s26    | v3.373.0                               | `src/lib/editor/mask/primitive.ts`                                                                     |
| I-RE-11 | closed   | plan 67 s21                 | v3.401.0                               | preview panel min/max toggle with screenshot capture                                                   |
| I-RE-12 | closed   | plan 67 s4                  | v3.399.0                               | framer-motion snap-settle with reduced-motion guard                                                    |
| I-RA-01 | closed   | plan 67 s22                 | v3.401.0                               | New / Category / Task chooser                                                                          |
| I-RA-02 | closed   | plan 67 s22                 | v3.401.0                               | "Rule Set NN" default naming                                                                           |
| I-RA-03 | closed   | plan 67 s23                 | v3.403.0                               | clone with reference vs copy mode                                                                      |
| I-RA-04 | closed   | plan 67 s23                 | v3.403.0                               | source-ruleset badge on cloned rulesets                                                                |
| I-RA-05 | closed   | plan 67 s22                 | v3.401.0                               | image upload/compile UI                                                                                |
| I-RA-06 | closed   | plan 67 s43                 | v3.412.0                               | Validate-Against-Image dialog polish                                                                   |
| I-RA-07 | closed   | plan 42                     | v3.420.0-v3.428.0                      | `RuleCondition` union, `validationMode`, `ValidationModeToggle`                                        |
| I-RP-01 | closed   | pre-existing                | pre-v3.370                             | rectangular Presence/Absence                                                                           |
| I-RP-02 | closed   | plan 67 s27                 | v3.405.0                               | Circular ROI form (radius + center)                                                                    |
| I-RP-03 | closed   | plan 42 s11-13              | v3.425.0-v3.428.0                      | `SameImageParamsPanel`                                                                                 |
| I-RP-04 | closed   | plan 67 s28                 | v3.405.0                               | OCR primitive + validate happy path                                                                    |
| I-RP-05 | closed   | plan 66 s19, plan 67 s35    | v3.379.0, v3.406.0, v3.428.0, v3.430.0 | Color primitive + eyedropper + Lab/ΔE2000 evaluator                                                    |
| I-RP-06 | closed   | plan 66 s14, plan 67 s29    | v3.374.0, v3.405.0                     | Flaw Detection primitive + editor UI                                                                   |
| I-RP-07 | closed   | plan 66 s15, plan 67 s30    | v3.375.0, v3.405.0                     | Barcode / QR primitive + decoded-text field                                                            |
| I-RP-08 | closed   | plan 66 s16, plan 67 s31    | v3.376.0, v3.406.0                     | Blob Detection primitive + editor UI                                                                   |
| I-RP-09 | closed   | plan 66 s17, plan 67 s32    | v3.377.0, v3.406.0                     | Edge Width + shared LineTool                                                                           |
| I-RP-10 | closed   | plan 66 s17, plan 67 s33    | v3.377.0, v3.406.0                     | Edge Pitch reusing LineTool                                                                            |
| I-RP-11 | closed   | plan 66 s18, plan 67 s34    | v3.378.0, v3.406.0                     | Positional Adjustment primitive                                                                        |
| I-RP-12 | closed   | plan 42 s27-28              | v3.431.0                               | `useLivePreview` + `LivePreviewBadge`                                                                  |
| I-FS-01 | closed   | plan 66 s20, plan 67 s36    | v3.380.0, v3.408.0                     | `/setup/functions` CRUD with Monaco                                                                    |
| I-FS-02 | closed   | plan 66 s21, plan 67 s37    | v3.383.0, v3.409.0                     | `/setup/chain-events` inspector                                                                        |
| I-FS-03 | pending  | none                        | -                                      | barcode decoded text is on the rule model but not yet wired as a chain-event input in the inspector    |
| I-PR-01 | closed   | plan 66 s22, plan 67 s38    | v3.401.0                               | project create flow fixed, regression test                                                             |
| I-PR-02 | closed   | plan 67 s39-41              | v3.410.0-v3.412.0                      | project detail shows camera + rules + category                                                         |
| I-PR-03 | closed   | plan 66 s23, plan 67 s39    | v3.410.0                               | AI settings placeholder card                                                                           |
| I-PR-04 | closed   | plan 67 s40                 | v3.410.0                               | category creation + auto-apply UI                                                                      |
| I-PR-05 | closed   | plan 66 s24, plan 67 s40    | v3.410.0                               | category resolver + integration test                                                                   |
| I-PR-06 | closed   | plan 67 s41                 | v3.411.0                               | multi rule-set select + override preview                                                               |
| I-PR-07 | pending  | none                        | -                                      | project zip export/import not shipped; only ruleset JSON/YAML export exists                            |
| I-PR-08 | pending  | partial                     | -                                      | Home surfaces recent workflow cards, but no explicit "Recent Projects" dropdown component              |
| I-RN-01 | closed   | plan 66 s25, plan 67 s42    | v3.411.0                               | multi rule-set select on `/run`                                                                        |
| I-RN-02 | closed   | plan 66 s25, plan 67 s42    | v3.411.0                               | override-chain preview                                                                                 |
| I-RN-03 | closed   | plan 66 s25, plan 67 s42    | v3.411.0                               | verification-image preview strip                                                                       |
| I-RN-04 | closed   | plan 66 s25, plan 67 s42    | v3.411.0                               | inline edit-jump                                                                                       |
| I-RN-05 | closed   | plan 66 s25, plan 67 s42    | v3.411.0                               | expected-image-count field                                                                             |
| I-RN-06 | closed   | plan 67 s41                 | v3.411.0                               | `RulesetPicker.tsx`                                                                                    |
| I-CX-01 | closed   | plan 66 s26, plan 67 s44    | v3.412.0                               | ESLint rule + hardcoded-color migration                                                                |
| I-CX-02 | closed   | plan 66 s27, plan 67 s45    | v3.413.0                               | error registry + `reportError` toast bus                                                               |
| I-CX-03 | closed   | plan 66 s29, plan 67 s48    | v3.414.0                               | `bun run ci` entrypoint                                                                                |
| I-CX-04 | pending  | plan 66 s28, plan 67 s46    | -                                      | baselines partially captured under `tests/reports/screenshots/plan67/` but no CI regression gate wired |
| I-CX-05 | closed   | plan 67 s47                 | v3.414.0                               | axe 0 serious/critical on core routes                                                                  |
| I-CX-06 | closed   | plan 42 s29                 | v3.433.0                               | `ReasonCode` const + `no-restricted-syntax` gate                                                       |
| I-CX-07 | closed   | user request 2026-07-17     | v3.430.0                               | `WorkerHealthBanner` floating dismissible toast                                                        |
| I-BE-01 | deferred | user directive 2026-07-17   | v3.418.0                               | IndexedDB via SDK facade; SQLite postponed                                                             |
| I-BE-02 | pending  | none                        | -                                      | mermaid DB diagrams under `spec/23-app-db/` not authored                                               |
| I-BE-03 | pending  | none                        | -                                      | `data/<ruleset>/<ruleId>/{image, rules.json}` layout not defined; current storage is IDB               |
| I-BE-04 | pending  | none                        | -                                      | Python endpoint mapping table not authored                                                             |
| I-BE-05 | closed   | user request 2026-07-17     | v3.418.0                               | `src/lib/projects/facade.ts` + `idb-keyval`                                                            |
| I-MT-01 | pending  | none                        | -                                      | V2 reference images not moved into `src/assets/` with normalized names                                 |
| I-MT-02 | closed   | plan 66 s2                  | v3.399.0                               | `.lovable/ambiguity-questions/02-ui-v3-open-questions.md`                                              |

## Rollup

- Closed: 60
- Pending: 8 (I-SU-05, I-FS-03, I-PR-07, I-PR-08, I-CX-04, I-BE-02, I-BE-03, I-BE-04, I-MT-01)
- Deferred with written decision: 2 (I-SU-07, I-BE-01)

Note: I-MT-01 counted under Pending; correcting the total gives 60 closed + 9 pending + 2 deferred = 71. SS-03 will re-check.

Handoff: SS-03 consumes this table for the done/pending/ambiguous split.

Slug: cross-index-closures
Status: pending
Created: 2026-07-17
Parent: 68-ui-improvements-v2-enhancement

## Goal

For every `[I-XX]` from SS-01, find the plan step + version tag that closed it. If none, mark `closer: none` so SS-03 can decide `pending` vs `ambiguous`.

## Sources to walk

- Adjacent done plans: `.lovable/plans/done/{24,30,31,34,37,42,43,45,64,65,66,67}-*.md`.
- `.lovable/plans/done/subtasks-42-rule-conditions-and-validation-order/`.
- `RELEASE_NOTES.md`, `CHANGELOG.md`.
- `spec/24-app-ui-design-system/97b-ui-acceptance-checklist.md`.
- `spec/24-app-ui-design-system/98-changelog.md`.

## Output shape

Table at the bottom of THIS file:

```
| Id   | Closer plan | Closer step | Version | Evidence                  |
|------|-------------|-------------|---------|---------------------------|
| I-01 | 67          | 3           | v3.393  | drag-affordance a11y test |
| I-03 | none        | -           | -       | -                         |
```

## Done when

- One row per `[I-XX]`.
- Every `closer: none` row is explicit.
  \*\*\* Add File: .lovable/plans/subtasks/68-ui-improvements-v2-enhancement/SS-03-classify-and-flag-ambiguities.md

# SS-03 Classify and flag ambiguities

Slug: classify-and-flag-ambiguities
Status: pending
Created: 2026-07-17
Parent: 68-ui-improvements-v2-enhancement

## Goal

Split the SS-02 table into three disjoint buckets: `done`, `pending`, `ambiguous`.

## Rules

- `done`: closer plan + step + version + at least one verification signal.
- `pending`: no closer, but a matching plan under `.lovable/plans/pending/` owns the work.
- `ambiguous`: no closer AND no pending owner, OR two done plans contradict, OR `97b-ui-acceptance-checklist.md` disagrees with SS-02's closure evidence.

## Output shape

```
## Done
- I-01 — plan 67 step 3 — v3.393 — a11y test

## Pending
- I-14 — pending plan 41

## Ambiguities
- I-22 — spec 09 says X; plan 65 shipped Y. Decision needed: X or Y?
```

## Done when

- Every `[I-XX]` appears in exactly one section.
- Every ambiguity ends with a "Decision needed:" line.
  \*\*\* Add File: .lovable/plans/subtasks/68-ui-improvements-v2-enhancement/SS-04-target-filename-decision.md

# SS-04 Target filename decision

Slug: target-filename-decision
Status: pending
Created: 2026-07-17
Parent: 68-ui-improvements-v2-enhancement

## Goal

Confirm the exact filename for the consolidated V2 status doc.

## Constraints

1. Placed AFTER the current last file in `spec/24-app-ui-design-system/`.
2. Slug ends with `-v2-enhancement`.
3. `rg v2` must find it by filename alone.

## Current tail

- `43-rule-editor-toolbar.md`
- `97-acceptance-criteria.md`
- `97b-ui-acceptance-checklist.md`
- `98-changelog.md`
- `99-consistency-report.md`

## Decision

Filename: `spec/24-app-ui-design-system/99d-ui-improvements-v2-enhancement.md`.

Rationale: `99` is already the tail; `99d` sits adjacent without renumbering the tail, follows the existing `97b` sibling-suffix convention, satisfies all three constraints.

Rejected: bumping to `100-*.md` — breaks the two-digit convention used across the folder.

## Done when

- Filename recorded here; step 5 of the parent plan uses this exact path.
