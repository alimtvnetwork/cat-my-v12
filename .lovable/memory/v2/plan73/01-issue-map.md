---
name: Plan 73 issue inventory (17 to 26)
description: Symptom, repro, suspected files, severity, and current status for every issue in the Plan 73 sweep.
type: reference
---

# Plan 73, step 2: issue inventory

Read pass 2026-07-18 across `.lovable/issues/17-*.md` through `.lovable/issues/26-*.md`. Two issues (18, 22, 24) already closed by prior plans, retained here for regression coverage. Remainder still `open`.

| #   | Slug                                           | Status                 | Sev  | Symptom (one line)                                                          | Repro path                                       | Suspect files                                                                                                                           |
| --- | ---------------------------------------------- | ---------------------- | ---- | --------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| 17  | menu-hover-jitter-and-padding                  | open                   | med  | Top-nav items shift a few px on hover, padding cramped                      | Hover any item in `Titlebar` top row on `/setup` | `src/components/hmi/Titlebar.tsx`, `src/components/nav/AppBreadcrumb.tsx`                                                               |
| 18  | header-duplicated-control-automation           | closed (plan 66 SH-01) | high | Global header repeated title, no breadcrumb                                 | Every route pre-fix                              | `src/components/app-shell/AppHeader.tsx` (deleted)                                                                                      |
| 19  | rules-editor-program-panel-and-layer-arrow     | open                   | med  | Legacy Program panel, narrow Layer rows, chevron on left                    | Open `/setup/rules`, expand a rule               | `src/components/editor/layers/LayerRow.tsx`, program-panel component                                                                    |
| 20  | tools-collapse-chevron-unprofessional          | open                   | low  | Tools dock collapse chevron is 12px, ghosted, no tooltip                    | Editor route, collapse Tools panel               | `src/components/editor/toolbox/*`, `src/components/editor/rail/RightRail.tsx`                                                           |
| 21  | panels-not-draggable-floatable                 | open                   | high | Layers and Settings cannot float, drag, close, or minimize                  | Editor route, try to grab any panel header       | `src/components/editor/EditorShell.tsx`, `DockableFrame.tsx`, `panel-registry.ts`                                                       |
| 22  | duplicate-header-still-present                 | closed (plan 66 SH-01) | high | Titlebar + breadcrumb bar read as two headers                               | Every route pre-fix                              | `src/components/app-shell/Titlebar.tsx`, `AppBreadcrumb.tsx`                                                                            |
| 23  | home-screen-steps-terrible                     | open                   | med  | Home lacks a clear numbered workflow, cards feel orphaned                   | Visit `/`                                        | `src/routes/index.tsx`, `src/components/home/*`                                                                                         |
| 24  | setup-rules-form-ui-and-category-picker        | closed (plan 70)       | med  | Rules form validation weak, category picker missing                         | `/setup/rules` create flow pre-fix               | `src/routes/setup.rules.tsx`, `src/lib/projects/*`                                                                                      |
| 25  | worker-notice-cut-and-poor-error-visualization | open                   | high | Worker offline card clips on narrow viewports, error path skips spec tokens | Narrow viewport, kill worker                     | `src/components/editor/validation/WorkerHealthBanner.tsx`, `src/lib/errors/errorStore.ts`, `src/components/errors/GlobalErrorModal.tsx` |
| 26  | ui-seed-values-not-facaded                     | open                   | med  | UI screens read hard-coded demo data instead of the seed facade             | Load `/projects`, inspect data path              | `src/lib/projects/facade.ts`, `src/lib/projects/seed.ts`, callers under `src/routes/` and `src/components/home/`                        |

## Allowlist for step 32 (`rg "status:\\s*open"`)

Issues that must remain `open` until their upstream plan lands:

- none within 17 to 26; every open item in this range must close inside Plan 73.

Everything else flagged `open` by ripgrep after step 31 is a regression and blocks step 32.

## Severity legend

- high: blocks a core workflow (editor, error surfacing, header identity).
- med: visible polish gap the user has called out repeatedly.
- low: cosmetic, no workflow impact.

## Cross-plan links

- Plan 66 SH-01 already asserts one shell header via `tests/e2e/playwright_single_header.py`; steps 10 and 22 extend that test rather than reintroducing it.
- Plan 70 supplied the category picker; step 27 only closes residual validation gaps.
- Plan 71 supplied `WorkerHealthBanner` + `GlobalErrorModal`; step 29 closes residual clipping and correlation-id copy.
- Plan 72 supplied the seed facade; step 31 finishes wiring remaining UI reads through it.
