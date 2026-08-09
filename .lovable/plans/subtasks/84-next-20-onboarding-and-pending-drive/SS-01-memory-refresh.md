# SS-01 Memory + spec + src refresh (Plan 84 Step 1)

Slug: SS-01-memory-refresh
Status: completed
Parent: 84-next-20-onboarding-and-pending-drive
Created: 2026-07-19

## Memory read

Read `mem/index.md`, `mem/layout/header-breadcrumb.md`, and every file
listed in `.lovable/memory/index.md`. Key active constraints:

- Single-mount breadcrumb inside `src/components/hmi/Titlebar.tsx`
  (`AppBreadcrumb`, inline variant). Custom class
  `.app-titlebar-breadcrumb { display: flex }` at ~`src/styles.css:2001`
  overrides Tailwind `md:hidden`. Never add a second breadcrumb.
- Sonner `Toaster` pinned to `position="bottom-right"`, `closeButton`,
  per-key localStorage dismissal. No inline mid-page banners.
- Selection overlay owns the on-screen ROI name; canvas renderer must
  skip the in-shape `${kind} ${name}` label when selected. Kind-C ROIs
  must not blur their inner region.
- Code Red caps in `.lovable/memory/01-code-red.md`; error architecture
  in `03-error-manage.md` (3-tier, `apperror`, `showToastError` +
  `useErrorStore.captureException` on every user-visible failure).
- Design tokens in `04-design-system.md` (Tailwind v4 CSS-first, no
  hardcoded color utilities).
- v2 execution order locked at `spec/21-app/62-v2-execution-order.md`.
- Blind-AI signoff at `spec/25-app-audit/99-signoff.md` (mean 98.0/100,
  0 blockers) — do not reopen cleared findings without new evidence.

## Deltas since last onboarding

- Current version: `v3.767.0` (package.json). Pinned in README at
  `v3.754.0` — README pin has drifted behind the tip.
- Latest changelog entries (`v3.755.0`) tightened the seed.reset toast
  contract to one summary toast with an 8-char correlation id badge,
  routed through `showToastError` + `logFatalReseed`. Reinforces the
  "no silent failure" rule from `03-error-manage.md`.
- New pending plans since prior turn: 83 (UI completion + seed
  hardening, 50 steps) sits above 82 (100-step V4). 84 (this plan) is
  now the top read-and-drive plan.

## Spec skim (top-level folders)

`spec/` root folders scanned; deep-dive deferred to Plan 84 Step 2.

- `01-general/` — product vision, glossary.
- `02-coding-guidelines/` — canonical coding rules (source of truth
  for `.lovable/memory/24-coding-and-error-rulebook.md`).
- `03-error-manage/` — canonical error rules.
- `08-docs-viewer-ui/`, `14-update/`, `16-generic-release/` — tooling.
- `17-consolidated-guidelines/` — actual guideline home (per
  `11-phase1-substitute-map.md`).
- `21-app/` — the Vision Inspection app spec (largest folder, hosts
  UI V4 direction at `53-ui-improvements-v4.md`, execution order at
  `62-v2-execution-order.md`, and reference images for Plan 82).
- `24-app-ui-design-system/`, `25-app-audit/` — design system + audit.

## Src skim

- Router shell: `src/router.tsx`, `src/routes/__root.tsx`,
  `src/routes/index.tsx`.
- App chrome: `src/components/hmi/Titlebar.tsx` (single breadcrumb
  mount), `src/components/AppBreadcrumb.tsx`.
- Feature areas: `src/features/projects/`, `src/features/rules/`
  (editor + preview), plus hooks in `src/hooks/` (useHotkeys,
  useMenuShortcuts, useViewportSafe, useHeaderMetrics, useRunning,
  useLicenseFeatures).
- Server-side: `src/integrations/supabase/{client,client.server,
auth-middleware,auth-attacher}.ts`, `src/start.ts`, `src/server.ts`.
- Backend (Python): `app/` (dispatcher, capture, worker, rules,
  supervisor) and `worker/` (calibration + scorer + fly deploy).

## Status

Plan 84 Step 1 complete. Steps 2 and 3 (deep spec + src walk) still
pending; they will append to this note in-place.

---

## Plan 84 Step 2 — Deep spec walk

### `spec/02-coding-guidelines/` (v3.2.0, 2026-04-16)

- `00-overview.md` — CODE RED rules restated: (1) error management is #1 (write handling from line 1), (2) booleans use `is/has/should`, positively named only, (3) zero nesting, early returns, no nested `if`, (4) singular table names, PascalCase, `{TableName}Id` INTEGER PK autoincrement, FK reuses PK name, (5) never hallucinate, ask instead, (6) function 8-15 lines, files <300 lines, React components <100 lines. Violations = bugs.
- `02-typescript/` — enum modules with a `Type` suffix are mandatory; string unions banned. Files: `01-connection-status-enum.md` (`ConnectionStatus` in `src/lib/enums/connection-status.ts`), `02-entity-status-enum.md`, `03-execution-status-enum.md`, `04-export-status-enum.md`, `05-http-method-enum.md` (`HttpMethod` in `src/lib/enums/http-method-type.ts`, parity with Go `httpmethod.Variant`), `06-message-status-enum.md`, `07-type-safety-remediation-plan.md`. `unknown`, `any`, `Record<string, unknown>` banned; use concrete generics.
- Other language folders: `03-golang`, `04-php`, `05-rust`, `07-csharp`, `09-powershell-integration` — parity per language; not currently touched by Plan 84 work.
- Cross-cutting: `08-file-folder-naming`, `11-security`, `21-app` (app-specific overrides), `24-app-ui-design-system` (design tokens digest).

### `spec/03-error-manage/`

- `00-overview.md` — 3-tier architecture entry point.
- `01-error-resolution/` — resolution flow (detect -> capture -> surface -> recover).
- `02-error-architecture/` — canonical layers: `apperror` at boundary, structured logging middle, user-visible surface (`showToastError` + `useErrorStore.captureException`). Silent catch is a bug.
- `03-error-code-registry/` — enumerated error codes; new codes must be registered here.
- `97-acceptance-criteria.md` — coding-review gate: every user-visible failure path must be logged and surfaced.

### `spec/21-app/` (Vision Inspection app)

Ordered highlights relevant to the current backlog:

- `04-overview.md`, `10-app-overview.md`, `11-system-context.md`, `12-runtime-processes.md` — product + runtime shape.
- `20-folder-structure.md` — canonical `src/` and `app/` layout (drives every UI plan).
- `30-ui-overview.md`, `31-rule-setup-screen.md`, `32-shape-model.md`, `33-rule-catalog.md`, `34-tolerance-model.md`, `35-zoom-and-pan.md` — rule editor foundation touched by Plan 83 steps 12-14.
- `40-error-manage.md`, `41-logging.md`, `42-observability.md`, `44-security-privacy.md` — the app-level projections of `spec/03-error-manage/` that Plan 83 must honor when wiring showToastError/captureException on new failure edges.
- `53-ui-improvements-v4.md` + `53-ui-improvements-v4-assets/` + `53-ui-seed-facade.md` + `54-ui-screen-facade-audit.md` — the UI V4 direction owned by Plans 79/80/81/82/83. Reference images for Plan 82 live in `53-ui-improvements-v4-assets/plan82/upload-71..76.png`.
- `62-v2-execution-order.md` — locked v2.0.1..v2.0.6 sequence; do not reorder without a new plan.
- `71-audit-retention.md`, `72-audit-persistence.md` — retention/audit surfaces (Plan 20 territory, already closed).

### Deltas vs memory

No contradictions between `spec/` current text and the loaded memory. Nothing to escalate. Steps 3-20 of Plan 84 proceed without spec-side blockers.

Status: Plan 84 Step 2 complete.

## Step 3: Source-code walk (2026-07-19)

Top-level `src/`: assets, components, features, generated, hooks, integrations, lib, routes, types + router.tsx, server.ts, start.ts, styles.css, routeTree.gen.ts.

Counts:

- Route files: 53 (under `src/routes/`, flat dot-separated)
- Component files: 259 across 22 subfolders (a11y, app-shell, camera, common, diagnostics, editor, errors, hmi, home, nav, ops, palettes, projects, rules, settings, setup, shell, shortcuts, theme, ui, plus BugErrorModal)
- Hooks: 11

Route hubs: index, projects (list + $projectId shell with camera/categories/rulesets/runs/trial-run/ai-testing children), rulesets (list + new + $rulesetId with rules.$ruleId), settings (index + camera/license/lighting/shortcuts/trigger), setup (camera/categories/chain-events/rules), admin.debug, admin.security, ai-testing, diagnostics, errors, ops, results, run.

Top 10 largest source files (bytes):

1. src/components/editor/canvas/SelectionOverlay.tsx (81,386)
2. src/components/editor/canvas/CanvasViewport.tsx (54,501)
3. src/components/projects/ProjectEditorSections.tsx (46,507)
4. src/routes/setup.rules.tsx (42,206)
5. src/lib/editor/render/frame.ts (38,496)
6. src/routes/projects.index.tsx (35,362)
7. src/components/nav/TopMenuBar.tsx (29,121)
8. src/routes/settings.index.tsx (26,693)
9. src/routes/setup.camera.tsx (26,196)
10. src/routes/\_\_root.tsx (25,416)

Deltas vs prior onboarding: editor canvas (SelectionOverlay + CanvasViewport) and setup.rules remain the heaviest surfaces, directly matching Plan 83 (editor bridges, seed hardening) and Plan 82 (UI V4) scope. `__root.tsx` at 25KB is high for a root layout, consistent with `.lovable/issues/31-duplicate-breadcrumb.md` risk area (single-mount breadcrumb constraint).

No source edits. Steps 4-20 unblocked.
