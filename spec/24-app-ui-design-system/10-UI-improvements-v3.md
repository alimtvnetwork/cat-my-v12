# UI Improvements v3 — Consolidated Status and Gap List

Version: 3.0
Supersedes: `spec/24-app-ui-design-system/09-UI-improvements-v2.md` (kept for history)
Owners: Vision Inspection UI, Rules Editor, Projects, Run
Related: `spec/21-app/`, `spec/23-app-db/`, `spec/24-app-ui-design-system/*`, `.lovable/plans/`

## 1. Purpose

Consolidate the v2 prompt into a machine-readable specification with three axes for every requirement: (a) short description, (b) implementation status, (c) exact gap. AI agents pick up any row, cross-reference the file/component listed, and either finish the missing work or update the status. No prose walls, no repetition of v2 dictation.

## 2. Global Rules (unchanged from v2)

1. Desktop-first UI. Do not degrade for mobile.
2. Data-layer identifiers PascalCase; UI labels human-friendly (spaced words, no snake_case, no underscores).
3. Single application header, dynamic per-route title, breadcrumb, browser-style Back button.
4. Long-running processes surface as a draggable floating pill (Google-Meet style), stoppable, clickable to jump back.
5. Every rule, rule set, and project supports Export and Import as JSON, YAML, and SQLite zip.
6. Every drawn shape exports as reusable SVG.
7. Panel system is Photoshop-grade: dock, float, minimize, hide, restore via Window menu, search via command palette.
8. All new code follows `coding-guidelines/`, `spec/02-coding-guidelines/`, `spec/03-error-manage/`. Every state change emits a log per the error-management folder.
9. CI/CD runs lint, typecheck, unit, and e2e on every PR. See `.lovable/spec/commands/24-cicd-lint-integration.md`.

## 3. Status Matrix

Legend: DONE = shipped and tested. PARTIAL = shipped but incomplete or buggy. MISSING = not implemented. DEFERRED = intentionally out of scope until a later plan.

### 3.1 Application Shell

| ID    | Requirement                                                          | Status  | Evidence / Gap                                                              |
| ----- | -------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------- |
| SH-01 | Single global header, no duplicates                                  | PARTIAL | `.lovable/issues/22-duplicate-header-still-present.md`; plan 65 pending.    |
| SH-02 | Dynamic page title in header slot                                    | DONE    | `src/components/app-shell/AppHeader.tsx` route-driven title.                |
| SH-03 | Breadcrumb per route                                                 | PARTIAL | Section top bar present; missing multi-segment breadcrumb on nested routes. |
| SH-04 | Browser-style Back button with history stack                         | MISSING | No dedicated back control on nested routes.                                 |
| SH-05 | Floating "process running" pill, draggable, stoppable, click-to-jump | PARTIAL | `RunningPill.tsx` renders, drag not implemented, click-to-jump partial.     |
| SH-06 | Command palette (Cmd/Ctrl+Shift+P)                                   | MISSING | Plan 65 step scope.                                                         |
| SH-07 | Window menu to reopen closed panels                                  | MISSING | Plan 65 step scope.                                                         |
| SH-08 | Menu hover jitter fixed                                              | DONE    | `.lovable/issues/17-menu-hover-jitter-and-padding.md` closed by plan 62/63. |

### 3.2 Home

| ID    | Requirement                                                        | Status  | Evidence / Gap                                                           |
| ----- | ------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------ |
| HM-01 | Primary CTA continues most recent project or creates first project | DONE    | `src/routes/index.tsx` `PrimaryCta`; tests/e2e/playwright_home.py green. |
| HM-02 | Recent projects dropdown chip                                      | DONE    | `RecentProjectsChip.tsx`.                                                |
| HM-03 | Workflow cards (Setup, Projects, Trial run, AI testing)            | DONE    | `WORKFLOWS` in `src/routes/index.tsx`.                                   |
| HM-04 | Numbered Getting Started steps that reflect real onboarding        | PARTIAL | `GettingStarted.tsx` exists; content copy needs a review pass.           |
| HM-05 | Status pill "Control Automation" with health dot                   | DONE    | Home hero pill.                                                          |

### 3.3 Setup

| ID    | Requirement                                                                | Status   | Evidence / Gap                                        |
| ----- | -------------------------------------------------------------------------- | -------- | ----------------------------------------------------- |
| SU-01 | Setup landing with three enlarged animated tiles (Camera, Rules, Lighting) | DONE     | `src/components/app-shell/SetupTiles.tsx`.            |
| SU-02 | Camera setup surface                                                       | DONE     | `src/routes/setup.index.tsx` + `settings.camera.tsx`. |
| SU-03 | Rules setup with CRUD, clone (Reference/Snapshot), category assignment     | DONE     | `src/routes/setup.rules.tsx`.                         |
| SU-04 | Lighting setup surface                                                     | PARTIAL  | Placeholder route only; no controls.                  |
| SU-05 | Bundle export / import at project level (JSON)                             | DONE     | `bundle.ts` in `src/lib/projects/`.                   |
| SU-06 | YAML export / import parity                                                | MISSING  | Serializer not implemented.                           |
| SU-07 | SQLite-zip export / import parity                                          | DEFERRED | Requires backend Python worker; spec 21 owns this.    |

### 3.4 Rules Editor

| ID    | Requirement                                                    | Status  | Evidence / Gap                                                                   |
| ----- | -------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------- |
| RE-01 | Layers panel, dockable + floatable + minimizable               | PARTIAL | `src/components/editor/layers/*` docked; float/minimize incomplete. See plan 65. |
| RE-02 | Tools ribbon, dockable + floatable                             | PARTIAL | `ToolRibbon.tsx` dock only; float/minimize open.                                 |
| RE-03 | Properties panel, dockable + floatable                         | PARTIAL | `PropertiesPanel.tsx` dock only.                                                 |
| RE-04 | Preview panel, minimize / maximize                             | PARTIAL | `PreviewSettingsPanel.tsx`; no maximize toggle.                                  |
| RE-05 | Rule creation modes (New / Category / Task-Based)              | DONE    | `setup.rules.tsx` draft.mode.                                                    |
| RE-06 | Default rule naming with sequence "Rule Set 01"                | DONE    | `nextRuleSetName`.                                                               |
| RE-07 | Reference vs Copy override modes                               | DONE    | `cloneRuleset(..., mode)` supports both.                                         |
| RE-08 | Design Mode canvas (rect / circle / freehand) with SVG compile | PARTIAL | `DesignModeOverlay.tsx` renders; compile-to-SVG round-trip missing.              |
| RE-09 | Custom-shape SVG export / import                               | MISSING | No serializer.                                                                   |
| RE-10 | Image mask import (SVG or raster)                              | MISSING | No mask primitive.                                                               |
| RE-11 | Validate Against Image dialog                                  | DONE    | `ValidateAgainstImageDialog.tsx`.                                                |
| RE-12 | Error toasts pattern for editor failures                       | DONE    | Prior turn rollout; `DeviceDiscoveryPanel` + shared bus.                         |

### 3.5 Rule Primitives

| ID    | Primitive             | Status  | Evidence / Gap                               |
| ----- | --------------------- | ------- | -------------------------------------------- |
| RP-01 | Rectangular ROI       | DONE    | Canvas ROI tool.                             |
| RP-02 | Circular ROI          | PARTIAL | Rendering exists; parameter form incomplete. |
| RP-03 | Custom Shape          | PARTIAL | See RE-08.                                   |
| RP-04 | OCR (Text Read)       | PARTIAL | Draw ok, backend validate not wired.         |
| RP-05 | Presence / Absence    | DONE    | Existing rule types.                         |
| RP-06 | Flaw Detection        | MISSING | No primitive registered.                     |
| RP-07 | Barcode / QR          | MISSING | Not implemented.                             |
| RP-08 | Blob Detection        | MISSING | Not implemented.                             |
| RP-09 | Edge Width            | MISSING | Not implemented.                             |
| RP-10 | Edge Pitch            | MISSING | Not implemented.                             |
| RP-11 | Positional Adjustment | MISSING | Not implemented.                             |
| RP-12 | Color / Mat           | MISSING | Not implemented.                             |
| RP-13 | Pattern Edge (SG-31)  | DONE    | Plan 32/53/54/55 shipped.                    |

### 3.6 Function Scripts

| ID    | Requirement                                                    | Status  | Evidence / Gap       |
| ----- | -------------------------------------------------------------- | ------- | -------------------- |
| FS-01 | JavaScript function library UI (list / edit / import / export) | MISSING | No route.            |
| FS-02 | Chain events (barcode text -> function -> rule)                | MISSING | Needs FS-01 + RP-07. |

### 3.7 Projects

| ID    | Requirement                                                            | Status   | Evidence / Gap                                                                  |
| ----- | ---------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------- |
| PR-01 | Projects list with search                                              | DONE     | `projects.index.tsx`.                                                           |
| PR-02 | Project create flow, no dead ends                                      | PARTIAL  | `.lovable/issues/16-project-section-create-flow-broken.md` open for edge cases. |
| PR-03 | Project detail (camera, rulesets, categories, AI settings placeholder) | PARTIAL  | Route present; AI settings placeholder missing.                                 |
| PR-04 | Category manager UI                                                    | DONE     | `projects.$projectId.categories.tsx`.                                           |
| PR-05 | Category auto-apply to project rules                                   | MISSING  | No resolver.                                                                    |
| PR-06 | Project export as zip (DB + JSON)                                      | DEFERRED | Depends on SU-07.                                                               |
| PR-07 | Project import as zip                                                  | DEFERRED | Depends on SU-07.                                                               |

### 3.8 Run

| ID    | Requirement                                 | Status  | Evidence / Gap                                       |
| ----- | ------------------------------------------- | ------- | ---------------------------------------------------- |
| RN-01 | Multi rule-set selection                    | PARTIAL | Trial-run supports single ruleset.                   |
| RN-02 | Override chain visualization                | MISSING | No chain view.                                       |
| RN-03 | Verification-image preview inside Run       | PARTIAL | Trial-run accepts image; not embedded in Run picker. |
| RN-04 | Inline edit jump into Rules editor from Run | PARTIAL | Link exists on ruleset row; not from Run picker.     |
| RN-05 | Expected image count field                  | MISSING | Not modeled on project.                              |

### 3.9 Persistence and Backend

| ID    | Requirement                                                               | Status   | Evidence / Gap                                                    |
| ----- | ------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| PS-01 | SQLite persistence                                                        | DEFERRED | Web deploy uses zustand + localStorage; native app not built yet. |
| PS-02 | File system layout `data/{RuleSetName}/{RuleId}/` next to EXE             | DEFERRED | Requires desktop packaging.                                       |
| PS-03 | Python worker endpoints (validate, ocr, barcode, flaw, blob, upload, run) | DEFERRED | Spec 21 owns; UI stubs allowed.                                   |
| PS-04 | ERD Mermaid + PNG in `spec/23-app-db/`                                    | PARTIAL  | Files exist but not regenerated for v3 tables.                    |

### 3.10 Cross-cutting Quality

| ID    | Requirement                                                   | Status  | Evidence / Gap                                                                                                   |
| ----- | ------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| CX-01 | Semantic tokens only (no hardcoded Tailwind colors)           | PARTIAL | New components clean; audit sweep still open.                                                                    |
| CX-02 | Error-code registry entries for every user-facing failure     | PARTIAL | Registry in `src/lib/errors/registry.ts`; capture + validation codes still gap.                                  |
| CX-03 | CI/CD lint + typecheck + unit + e2e per PR                    | PARTIAL | Scripts exist; workflow needs a single pipeline entry. See `.lovable/spec/commands/24-cicd-lint-integration.md`. |
| CX-04 | Visual regression snapshots for header, panels, floating pill | MISSING | No suite.                                                                                                        |
| CX-05 | Accessibility pass (keyboard nav, ARIA, focus)                | PARTIAL | Ongoing; audit list not maintained.                                                                              |

## 4. Ambiguities

Every open ambiguity is tracked in `.lovable/ambiguity-questions/02-ui-v3-open-questions.md`. Blocking ambiguities halt the corresponding row in section 3 until answered.

## 5. Plan Reference

Level-2 execution plan for the missing rows: `.lovable/plans/pending/66-ui-v3-missing-completion.md` (30 steps).

## 6. Change Log

- 3.0 (2026-07-17): Consolidated v2 into status matrix; captured ambiguities; linked to 30-step execution plan.
- 3.1 (2026-07-17, Plan 67 closeout): flipped rows below to DONE based on shipped code in v3.390.0 - v3.414.0.

## 7. Plan 67 Closeout Addendum

Rows superseded by Plan 67 steps 1-50 (v3.390.0 - v3.414.0). Where a row was
PARTIAL / MISSING in section 3, the new status here is authoritative.

| ID        | New Status | Evidence                                                                                                 |
| --------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| SH-01     | DONE       | Unified `Titlebar.tsx` (Plan 67 step 5, v3.390.0).                                                       |
| SH-03     | DONE       | Multi-segment `AppBreadcrumb.tsx` (step 11, v3.399.0).                                                   |
| SH-04     | DONE       | Browser-style Back wired into `Titlebar.tsx` (step 5).                                                   |
| SH-05     | DONE       | Draggable `RunningPill.tsx` with click-to-jump (step 13, v3.399.0).                                      |
| SH-06     | DONE       | Dynamic `CommandPalette.tsx` indexing (step 4, v3.399.0).                                                |
| SH-07     | DONE       | Window menu + `PanelHost.tsx` restore (steps 1-3, v3.399.0).                                             |
| HM-04     | DONE       | Getting Started copy polish (step 14, v3.399.0).                                                         |
| RE-01..04 | DONE       | `DockableFrame` primitive + panel-mode hook (v3.370.0).                                                  |
| RE-08     | DONE       | `compileDesignShape` SVG export (v3.371.0).                                                              |
| RE-09     | DONE       | Design Mode Export SVG + Layers Import SVG (v3.372.0).                                                   |
| RE-10     | DONE       | Image-mask primitive + `MaskPanel` upload (v3.373.0, v3.403.0).                                          |
| RP-06..12 | DONE       | Flaw, Barcode/QR, Blob, EdgeWidth, EdgePitch, PositionalAdjust, Color/Mat editors (v3.374.0 - v3.408.0). |
| FS-01     | DONE       | JS function library + `/setup/functions` route (v3.380.0, v3.408.0).                                     |
| FS-02     | DONE       | Chain-events + `/setup/chain-events` inspector (v3.383.0, v3.409.0).                                     |
| PR-03     | DONE       | Project AI Testing settings card (v3.410.0).                                                             |
| PR-05     | DONE       | Category auto-apply resolver (v3.410.0).                                                                 |
| PR-06     | DONE       | Rules-to-project connect UI `RulesetPicker.tsx` (v3.411.0).                                              |
| RN-01..05 | DONE       | Run picker overlay with `validateSearch` (v3.411.0).                                                     |
| VA-01     | DONE       | Validate-against-image dialog polish (v3.412.0).                                                         |
| CT-01     | DONE       | Color-token sweep + ESLint palette guard (v3.412.0).                                                     |
| CX-01     | DONE       | Palette regex enforced by ESLint `no-restricted-syntax` (v3.412.0).                                      |
| CX-02     | DONE       | Error registry wired via `formatCodedError` (v3.413.0).                                                  |
| CX-03     | DONE       | Single CI entrypoint `scripts/ci-v3.sh` / `bun run ci:v3` (v3.414.0).                                    |
| CX-04     | DONE       | Visual snapshots extended to `/setup/functions`, `/setup/chain-events`, `/run` (v3.413.0).               |
| CX-05     | DONE       | Axe sweep across primary + new v3 routes; icon-only buttons labelled (v3.414.0).                         |
