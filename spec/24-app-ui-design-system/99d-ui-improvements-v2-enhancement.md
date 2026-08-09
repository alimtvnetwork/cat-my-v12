---
title: UI Improvements V2 Enhancement (consolidated status)
slug: ui-improvements-v2-enhancement
status: living
created: 2026-07-17
supersedes_view_of:
  - spec/24-app-ui-design-system/09-UI-improvements-v2.md
  - .lovable/plans/done/66-ui-v3-missing-completion.md
  - .lovable/plans/done/67-ui-fluid-modern-v2-v3-completion.md
search_hint: v2-enhancement
---

# UI Improvements V2 Enhancement

Single source of truth for what the "UI Improvements V2" stream (spec 09 + plans 66 + 67) actually shipped, what is still open, and what remains ambiguous. Do not delete the source files; this file is the reconciled view.

Search this file with the token `v2-enhancement` to always land here.

## How to read this file

- Every row uses an `I-XX-NN` id sourced from `.lovable/plans/subtasks/68-ui-improvements-v2-enhancement/SS-01-inventory-primary-inputs.md`.
- Closure evidence (plan/step/version) comes from `SS-02-cross-index-closures.md`.
- Classification and ambiguity flags come from `SS-03-classify-and-flag-ambiguities.md`.
- Rollup: 60 done, 9 pending, 2 deferred (71 total items).

### Plan 76 impact (2026-07-18)

Plan 76 audited residual `.lovable/issues/` rows tied to V2 chrome. It did not add new V2 rows; the impact on issue tracker state is recorded here so future readers see the reconciliation.

| issue | title                                      | resolution                                                    | evidence                      |
| ----- | ------------------------------------------ | ------------------------------------------------------------- | ----------------------------- |
| 10    | home-missing-projects-and-top-nav          | already closed pre-plan (Plan 65)                             | Plan 76 step 1 open-issue map |
| 17    | menu-hover-jitter-and-padding              | already closed pre-plan (Plan 67)                             | Plan 76 step 1 open-issue map |
| 19    | rules-editor-program-panel-and-layer-arrow | verified via visual gate                                      | Plan 76 step 22 (36/36 pass)  |
| 21    | panels-not-draggable-floatable             | verified via visual gate + right-menu-no-overlap suite        | Plan 76 step 22 (36/36 pass)  |
| 22    | duplicate-header-still-present             | single `.app-titlebar` invariant probed across 8 major routes | Plan 76 step 23 memo          |
| 16    | project-section-create-flow-broken         | parked pending user answers Q1-Q3, Q5-Q7, Q13, Q16            | Plan 76 step 13 triage memo   |
| 01    | spec-21-not-blind-ai-implementable         | defer verified through Plan 23 -> 25 SS-09 -> 26 SS-01 chain  | Plan 76 step 14 defer memo    |

Gates: vitest 722/722 (step 19), axe wcag2a+wcag2aa zero violations (step 20), tsgo exit 0 (step 18), visual 36/36 (step 22). No rollup counts in section 1 change.

## Sections

1. Done (61)
2. Pending (8)
3. Deferred (2)
4. Ambiguities requiring decision (9)
5. Cross-references

## 1. Done

Evidence format: `plan/step` -> `version(s)` -> verification signal.

### Header / Shell

| id      | item                                                             | closer                  | version                      | verification                                  |
| ------- | ---------------------------------------------------------------- | ----------------------- | ---------------------------- | --------------------------------------------- |
| I-SH-01 | Single `<header>` Titlebar                                       | plan 66 s3, plan 67 s10 | v3.390.0, v3.399.0, v3.430.0 | Titlebar single header, plan67/10 screenshots |
| I-SH-02 | No "Control Automation" duplication                              | plan 67 s10             | v3.399.0, v3.430.0           | Two-row flex Titlebar                         |
| I-SH-03 | Match-tree breadcrumb with store-resolved names                  | plan 66 s5, plan 67 s11 | v3.399.0, v3.430.0           | `AppBreadcrumb.tsx`                           |
| I-SH-04 | Back/Forward in header                                           | plan 66 s4, plan 67 s12 | v3.399.0                     | Playwright deep-nav pass                      |
| I-SH-05 | Draggable RunningPill with persisted position                    | plan 66 s6, plan 67 s13 | v3.399.0                     | `RunningPill` store                           |
| I-SH-06 | Command palette (Cmd/Ctrl+Shift+P)                               | plan 66 s7, plan 67 s8  | v3.399.0                     | shadcn Command                                |
| I-SH-07 | Window menu with checkmarks                                      | plan 66 s7, plan 67 s7  | v3.399.0                     | Window menu component                         |
| I-SH-08 | Fixed padding, no CLS                                            | plan 67 s14             | v3.399.0                     | topnav_no_cls playwright pass                 |
| I-SH-09 | Window menu scoped to editor routes                              | plan 67 s9              | v3.399.0                     | Route-gated visibility                        |
| I-SH-10 | Home cards: only inner pills clickable, container cursor default | user request 2026-07-17 | v3.432.0                     | `src/routes/index.tsx`                        |

### Setup

| id      | item                                                                                                                                                                             | closer              | version           | verification                                                                        |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| I-SU-01 | Three-tile setup landing (Camera/Rules/Lighting)                                                                                                                                 | plan 67 s15         | v3.401.0          | `/setup` landing                                                                    |
| I-SU-02 | "Ruleset" terminology across code + spec                                                                                                                                         | spec 24 rename pass | pre-v3.400        | grep audit                                                                          |
| I-SU-03 | PascalCase types + `humanizeLabel` UI helper                                                                                                                                     | plan 42 (spec 47)   | v3.417.0+         | `src/types/rules/*`                                                                 |
| I-SU-04 | LightingReadout wired to store                                                                                                                                                   | plan 67 s16         | v3.401.0          | `LightingReadout.tsx`                                                               |
| I-SU-06 | YAML bundle round-trip                                                                                                                                                           | plan 66 s8          | v3.399.0          | Round-trip unit test                                                                |
| I-SU-07 | `/setup/rules` forms migrated to `react-hook-form` + Zod (`NewProjectForm`, `NewRuleForm`) with `useSetupForm` + `makeNewProjectSchema` / `makeRuleSetSchema`                    | plan 70 s1-8        | v3.444.0-v3.447.0 | `src/lib/setup/schemas.ts`, `useSetupForm.ts`, `__tests__/schemas.test.ts`          |
| I-SU-08 | `CategoryCombobox` multi-select with inline create (dedupes case-insensitively) + `useCategoryOptions` hook, wired into both forms                                               | plan 70 s7-8        | v3.446.0-v3.447.0 | `src/components/setup/CategoryCombobox.tsx`                                         |
| I-SU-09 | Async submit UX: `isSubmitting` disables inputs, spinner via `Loader2`, stable-id toasts with try/catch + `console.error` context on failure                                     | plan 70 s9-11       | v3.448.0-v3.449.0 | `handleCreateProject` / `handleCreateRuleSet` in `setup.rules.tsx`                  |
| I-SU-10 | Visible keyboard focus rings, hover, `transition-colors`, disabled affordances via shared `INPUT_LEGACY` / `BUTTON_PRIMARY` / `BUTTON_SECONDARY` / `FOCUS_RING` token classnames | plan 70 s12-13      | v3.449.0-v3.450.0 | `setup.rules.tsx` module constants                                                  |
| I-SU-11 | Real empty + loading states: `!hydrated` skeleton, "No project yet" empty card, `CategoryManager` empty card, `RuleList` split into `rules-empty` vs `rules-empty-filtered`      | plan 70 s14         | v3.450.0          | `data-testid="setup-rules-loading"`, `data-testid="categories-empty"`               |
| I-SU-12 | `FormErrorSummary` aria-live grouped error summary above submit buttons in both forms; collapses to `sr-only` when clean                                                         | plan 70 s15         | v3.451.0          | `src/components/ui/form-error-summary.tsx`, `__tests__/form-error-summary.test.tsx` |
| I-SU-13 | Route-level create-flow scenarios: create-with-new-category, create-with-existing, validation-failure for both project and rule set                                              | plan 70 s16         | v3.451.0          | `src/lib/setup/__tests__/create-scenarios.test.ts`                                  |

### Rule Editor

| id      | item                                              | closer                      | version            | verification        |
| ------- | ------------------------------------------------- | --------------------------- | ------------------ | ------------------- |
| I-RE-01 | Program panel removed from `/setup/rules`         | plan 67 s17                 | v3.401.0           | Editor layout       |
| I-RE-02 | Full-width layer row, right-side chevron          | plan 67 s17                 | v3.401.0           | Layer row component |
| I-RE-03 | Line-density reduction in Titlebar + rules editor | plan 67 s10-14, s17         | v3.399.0-v3.401.0  | Visual pass         |
| I-RE-04 | `DockableFrame.tsx` primitive + 4 migrated panels | plan 66 s10, plan 67 s18-21 | v3.370.0, v3.401.0 | 11 unit tests       |
| I-RE-05 | Palette persistence per workspace                 | plan 67 s6                  | v3.399.0           | `palette-store`     |
| I-RE-06 | Grip-only drag initiator (grab -> grabbing)       | plan 67 s2                  | v3.390.0           | Drag affordance     |
| I-RE-07 | 5-region drop overlay with token highlight        | plan 67 s3                  | v3.399.0           | Drop overlay        |
| I-RE-08 | `compile-shape.ts` + round-trip test              | plan 66 s11, plan 67 s24    | v3.371.0           | Unit test           |
| I-RE-09 | SVG Import/Export UI (Design Mode + Layers)       | plan 66 s12, plan 67 s25    | v3.372.0, v3.403.0 | UI in Design Mode   |
| I-RE-10 | Mask primitive                                    | plan 66 s13, plan 67 s26    | v3.373.0           | `mask/primitive.ts` |
| I-RE-11 | Preview panel min/max toggle                      | plan 67 s21                 | v3.401.0           | Screenshot capture  |
| I-RE-12 | framer-motion snap-settle + reduced-motion guard  | plan 67 s4                  | v3.399.0           | Motion guard        |

### Rule Authoring

| id      | item                                        | closer      | version           | verification           |
| ------- | ------------------------------------------- | ----------- | ----------------- | ---------------------- |
| I-RA-01 | New / Category / Task chooser               | plan 67 s22 | v3.401.0          | Chooser dialog         |
| I-RA-02 | "Rule Set NN" default naming                | plan 67 s22 | v3.401.0          | Naming util            |
| I-RA-03 | Clone with reference vs copy mode           | plan 67 s23 | v3.403.0          | Clone UI               |
| I-RA-04 | Source-ruleset badge on clones              | plan 67 s23 | v3.403.0          | Badge component        |
| I-RA-05 | Image upload/compile UI                     | plan 67 s22 | v3.401.0          | Upload flow            |
| I-RA-06 | Validate-Against-Image dialog polish        | plan 67 s43 | v3.412.0          | Dialog UI              |
| I-RA-07 | RuleCondition union + validationMode toggle | plan 42     | v3.420.0-v3.428.0 | `ValidationModeToggle` |

### Primitives

| id      | item                                           | closer                   | version                                | verification      |
| ------- | ---------------------------------------------- | ------------------------ | -------------------------------------- | ----------------- |
| I-RP-01 | Rectangular Presence/Absence                   | pre-existing             | pre-v3.370                             | baseline          |
| I-RP-02 | Circular ROI form (radius + center)            | plan 67 s27              | v3.405.0                               | ROI form          |
| I-RP-03 | SameImageParamsPanel                           | plan 42 s11-13           | v3.425.0-v3.428.0                      | Panel component   |
| I-RP-04 | OCR primitive + validate happy path            | plan 67 s28              | v3.405.0                               | OCR flow          |
| I-RP-05 | Color primitive + eyedropper + Lab/deltaE 2000 | plan 66 s19, plan 67 s35 | v3.379.0, v3.406.0, v3.428.0, v3.430.0 | Color evaluator   |
| I-RP-06 | Flaw Detection primitive + editor UI           | plan 66 s14, plan 67 s29 | v3.374.0, v3.405.0                     | Editor            |
| I-RP-07 | Barcode / QR primitive + decoded-text field    | plan 66 s15, plan 67 s30 | v3.375.0, v3.405.0                     | Rule model        |
| I-RP-08 | Blob Detection primitive + editor UI           | plan 66 s16, plan 67 s31 | v3.376.0, v3.406.0                     | Editor            |
| I-RP-09 | Edge Width + shared LineTool                   | plan 66 s17, plan 67 s32 | v3.377.0, v3.406.0                     | LineTool          |
| I-RP-10 | Edge Pitch reusing LineTool                    | plan 66 s17, plan 67 s33 | v3.377.0, v3.406.0                     | Editor            |
| I-RP-11 | Positional Adjustment primitive                | plan 66 s18, plan 67 s34 | v3.378.0, v3.406.0                     | Editor            |
| I-RP-12 | `useLivePreview` + `LivePreviewBadge`          | plan 42 s27-28           | v3.431.0                               | Live preview pill |

### Functions / Chain

| id      | item                             | closer                   | version            | verification   |
| ------- | -------------------------------- | ------------------------ | ------------------ | -------------- |
| I-FS-01 | `/setup/functions` CRUD (Monaco) | plan 66 s20, plan 67 s36 | v3.380.0, v3.408.0 | Editor page    |
| I-FS-02 | `/setup/chain-events` inspector  | plan 66 s21, plan 67 s37 | v3.383.0, v3.409.0 | Inspector page |

### Projects

| id      | item                                           | closer                   | version           | verification     |
| ------- | ---------------------------------------------- | ------------------------ | ----------------- | ---------------- |
| I-PR-01 | Project create flow fixed                      | plan 66 s22, plan 67 s38 | v3.401.0          | Regression test  |
| I-PR-02 | Project detail shows camera + rules + category | plan 67 s39-41           | v3.410.0-v3.412.0 | Detail page      |
| I-PR-03 | AI settings placeholder card                   | plan 66 s23, plan 67 s39 | v3.410.0          | Placeholder card |
| I-PR-04 | Category creation + auto-apply UI              | plan 67 s40              | v3.410.0          | Category form    |
| I-PR-05 | Category resolver + integration test           | plan 66 s24, plan 67 s40 | v3.410.0          | Integration test |
| I-PR-06 | Multi rule-set select + override preview       | plan 67 s41              | v3.411.0          | Multi-select UI  |

### Run

| id      | item                             | closer                   | version  | verification  |
| ------- | -------------------------------- | ------------------------ | -------- | ------------- |
| I-RN-01 | Multi rule-set select on `/run`  | plan 66 s25, plan 67 s42 | v3.411.0 | `/run`        |
| I-RN-02 | Override-chain preview           | plan 66 s25, plan 67 s42 | v3.411.0 | Preview panel |
| I-RN-03 | Verification-image preview strip | plan 66 s25, plan 67 s42 | v3.411.0 | Preview strip |
| I-RN-04 | Inline edit-jump                 | plan 66 s25, plan 67 s42 | v3.411.0 | Nav shortcut  |
| I-RN-05 | Expected-image-count field       | plan 66 s25, plan 67 s42 | v3.411.0 | Form field    |
| I-RN-06 | `RulesetPicker.tsx`              | plan 67 s41              | v3.411.0 | Component     |

### Cross-cutting

| id      | item                                             | closer                   | version  | verification                                                     |
| ------- | ------------------------------------------------ | ------------------------ | -------- | ---------------------------------------------------------------- |
| I-CX-01 | ESLint rule + hardcoded-color migration          | plan 66 s26, plan 67 s44 | v3.412.0 | ESLint gate                                                      |
| I-CX-02 | Error registry + `reportError` toast bus         | plan 66 s27, plan 67 s45 | v3.413.0 | Registry                                                         |
| I-CX-03 | `bun run ci` entrypoint                          | plan 66 s29, plan 67 s48 | v3.414.0 | CI script                                                        |
| I-CX-04 | Visual-regression CI gate                        | plan 69 s1-7             | v3.441.0 | `bun run visual:test` (3 passed); gate 6/6 in `scripts/ci-v3.sh` |
| I-CX-05 | axe: 0 serious/critical on core routes           | plan 67 s47              | v3.414.0 | axe report                                                       |
| I-CX-06 | `ReasonCode` const + `no-restricted-syntax` gate | plan 42 s29              | v3.433.0 | ESLint gate                                                      |
| I-CX-07 | Floating dismissible `WorkerHealthBanner` toast  | user request 2026-07-17  | v3.430.0 | `WorkerHealthBanner.tsx`                                         |

### Backend

| id      | item                                                         | closer                  | version  | verification  |
| ------- | ------------------------------------------------------------ | ----------------------- | -------- | ------------- |
| I-BE-05 | IDB SDK facade (`src/lib/projects/facade.ts` + `idb-keyval`) | user request 2026-07-17 | v3.418.0 | Facade module |

### Meta

| id      | item                     | closer     | version  | verification                                              |
| ------- | ------------------------ | ---------- | -------- | --------------------------------------------------------- |
| I-MT-02 | UI V2 open-questions log | plan 66 s2 | v3.399.0 | `.lovable/ambiguity-questions/02-ui-v3-open-questions.md` |

## 2. Pending

8 items with no active plan owner. Each needs a new pending plan slot or absorption into an existing spec before it can move forward. I-SU-05 moved to In-progress in v3.530.0 (Plan 78 slice 1 shipped the `/setup/camera` library surface; worker-backed follow-ups tracked separately).

Consolidated dispatch: every ambiguity blocking these rows is listed in `.lovable/ambiguity-questions/04-plan77-dispatch.md` (Plan 77). Answering that file unblocks all rows below except I-BE-04 (external worker-build gate).

| id      | item                                                         | current state                                                                            | candidate owner                                                                                    |
| ------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| I-FS-03 | Barcode decoded text feeds chain-event downstream            | decoded text on rule model (v3.375.0) but not exposed by `/setup/chain-events` inspector | extend inspector to expose `Rule.<id>.decodedText` as chain input (blocked on DEC-07 style choice) |
| I-PR-07 | Project zip export / import                                  | only ruleset JSON/YAML export exists; no zip envelope                                    | blocked on DEC-04 persistence envelope                                                             |
| I-PR-08 | Recent Projects surface on Home                              | Home shows workflow cards only; no explicit recent-projects dropdown                     | see Ambiguity A-01                                                                                 |
| I-BE-02 | Mermaid DB diagrams under `spec/23-app-db/`                  | not authored                                                                             | new spec sub-plan (blocked on DEC-04)                                                              |
| I-BE-03 | `data/<ruleset>/<ruleId>/{image, rules.json}` folder layout  | current storage is IDB via facade (I-BE-05)                                              | see Ambiguity A-02                                                                                 |
| I-BE-04 | Python endpoint mapping table                                | not authored                                                                             | blocked on worker-process build                                                                    |
| I-MT-01 | V2 reference images into `src/assets/` with normalized names | screenshots live under `spec/24-app-ui-design-system/assets/`, not `src/assets/`         | see Ambiguity A-05                                                                                 |

## 3. Deferred

2 items with a written deferral decision.

| id      | item               | decision                                                                | source                                      |
| ------- | ------------------ | ----------------------------------------------------------------------- | ------------------------------------------- |
| I-SU-07 | SQLite-zip export  | warning-zip path chosen; sql.js deferred                                | plan 66 Q2 answer (c)                       |
| I-BE-01 | SQLite persistence | use IndexedDB + SDK facade; SQLite postponed until worker process lands | user directive 2026-07-17, shipped v3.418.0 |

## 4. Ambiguities requiring decision

9 open decisions. 5 are V2-scoped (this stream); 4 are cross-spec P0 gates from `97b-ui-acceptance-checklist.md` that override V2 closure claims on the linked rows.

### 4.a V2-scoped ambiguities

**A-01 - Recent Projects surface (blocks I-PR-08)**

`spec/24-app-ui-design-system/09-UI-improvements-v2.md` L26 says "a drop-down button on Home". Home currently uses full workflow cards (v3.432.0).

Decision needed: dropdown component on Home vs dedicated "Recent" section vs keep workflow cards and drop the requirement.

**A-02 - Data folder layout (blocks I-BE-03, I-PR-07)**

Spec 09 L28 mandates `data/<ruleset>/<ruleId>/{image, rules.json}` on an EXE-adjacent filesystem. Current storage is IDB via SDK facade (v3.418.0).

Decision needed: is the folder layout the required export shape when persistence swaps back to SQLite (see DEC-04), or is it obsolete now that the facade owns storage?

**A-03 - Barcode chain-event exposure (blocks I-FS-03)**

Spec 09 L28 says decoded barcode/QR text must feed chain events downstream. The barcode primitive stores decoded text on the rule (v3.375.0) but `/setup/chain-events` (v3.409.0) does not expose it as a variable.

Decision needed: expose `Rule.<id>.decodedText` as a chain-event input, or introduce a dedicated `chain-input` field on the rule model?

**A-04 - Project zip export shape (blocks I-PR-07)**

Spec 09 L26 says "zip contains SQLite DB or specific JSON files". Current build has no SQLite (I-BE-01 deferred).

Decision needed: ship JSON-only zip today (usable immediately) or block export/import on the SQLite rework?

**A-05 - Reference images location (blocks I-MT-01)**

Spec 09 L15, L20 say "keep images as references in this spec and put these images into assets folder and name those properly". Screenshots exist under `spec/24-app-ui-design-system/assets/` but not `src/assets/`.

Decision needed: mirror into `src/assets/` for runtime use, or leave under spec assets as pure documentation?

### 4.b Cross-spec P0 gates (from `97b-ui-acceptance-checklist.md`)

These override multiple V2 rows. Do NOT claim closure on the linked ids until each gate is resolved.

**DEC-02 - Rule catalog reconciliation (touches I-RP-02, I-RP-05, I-RP-07, I-RP-09, I-RP-10, I-RP-11)**

`spec/21` §33 locks 6 kinds; `spec/24` lists 10. Plans 66 / 67 shipped 12 rule primitives under spec/24's model.

Decision needed: keep 12 shipped primitives and update spec/21 §33, or hide the extras behind a feature flag and mark the affected rows as "shipped but not v1-canonical"?

**DEC-04 - Persistence envelope (touches I-PR-07, I-SU-06, I-SU-07, I-BE-03)**

`spec/21` §36 mandates `tasks/<TaskId>/instructions/<InstructionId>.json`. `spec/24` §06 uses flat `programs/<id>.json`. Facade currently stores under `ruleset:<id>` in IDB.

Decision needed: which envelope does the export path target?

**DEC-05 - Region model (touches I-RE-04, I-RA-05)**

`spec/21` §32 has first-class Regions with roles. Current Layers panel is a flat rule list.

Decision needed: promote Regions above rules in the Layers panel, or absorb Regions into rule params?

**DEC-07 - Error code namespace (touches I-CX-02, I-CX-06)**

`spec/21` §40 App A owns the `E_UI_` codes. Plans 66 / 67 (I-CX-02) shipped a separate registry.

Decision needed: merge registries into `spec/21` App A, or keep the spec/24 registry and cross-reference?

## 5. Cross-references

- `spec/24-app-ui-design-system/09-UI-improvements-v2.md` (original brief)
- `.lovable/plans/done/66-ui-v3-missing-completion.md`
- `.lovable/plans/done/67-ui-fluid-modern-v2-v3-completion.md`
- `.lovable/plans/pending/68-ui-improvements-v2-enhancement.md`
- `.lovable/plans/subtasks/68-ui-improvements-v2-enhancement/SS-01..SS-04`
