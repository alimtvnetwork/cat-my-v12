# Project Memory Index

Read this file first. Every entry below is a file in `.lovable/memory/`. For the full onboarding map (folder structure + task-to-files matrix), see [`../what-to-read.md`](../what-to-read.md).

| File                                                                                                     | Purpose                                                                                                                         | Read when                                                             |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [01-code-red.md](./01-code-red.md)                                                                       | Hard prohibitions + function/file size caps                                                                                     | Before every code change                                              |
| [02-naming.md](./02-naming.md)                                                                           | DB / boolean / function / API naming rules                                                                                      | Before schema, models, or API                                         |
| [03-error-manage.md](./03-error-manage.md)                                                               | 3-tier error architecture, `apperror`, logging contract                                                                         | Before writing any business logic                                     |
| [04-design-system.md](./04-design-system.md)                                                             | Token/theme rules, Tailwind v4 CSS-first                                                                                        | Before UI/styles edits                                                |
| [05a-pipeline-and-research.md](./05a-pipeline-and-research.md)                                           | On-demand digest of research + pipeline specs (05, 06, 08–16, 21–24)                                                            | Task touches one of those folders                                     |
| [05b-linters.md](./05b-linters.md)                                                                       | `linters/` ruleset map (phpcs, sonarqube, stylecop, golangci-lint)                                                              | Editing a ruleset or downstream CI                                    |
| [05c-linter-scripts.md](./05c-linter-scripts.md)                                                         | `linter-scripts/` runner + CI/doc linter map                                                                                    | Editing CI checks, prompts, specs, docs, or linter waivers            |
| [05d-scripts.md](./05d-scripts.md)                                                                       | `scripts/fix-repo/` and `scripts/visibility-change/` invariants                                                                 | Editing repo maintenance scripts                                      |
| [06-spec-map.md](./06-spec-map.md)                                                                       | `.lovable/` inventory + `spec/` mandatory-vs-on-demand map                                                                      | Onboarding, before refactors                                          |
| [07-lovable-folder-guide.md](./07-lovable-folder-guide.md)                                               | Structural guide to the `.lovable/` control tree                                                                                | Editing anything under `.lovable/`                                    |
| [08-vision-inspection-app.md](./08-vision-inspection-app.md)                                             | Vision Inspection v1 spec digest — runtime, DB, UI, cross-cutting, gates                                                        | Editing anything under `spec/21-app/` or the app code                 |
| [v2/00-kickoff.md](./v2/00-kickoff.md)                                                                   | Plan 14 v2 kickoff snapshot - baseline version, head, pending-plan state, and six v2 workstreams                                | Before ranking or executing v2 workstreams                            |
| [v2/01-ranked-backlog.md](./v2/01-ranked-backlog.md)                                                     | Plan 14 Step 2 ranked v2 backlog with source citations and acceptance criteria                                                  | Before auditing or sequencing v2 workstreams                          |
| [v2/02-status-audit.md](./v2/02-status-audit.md)                                                         | Plan 14 Step 3 per-item implementation status with `path:line` citations                                                        | Before scoring v2 workstreams                                         |
| [v2/03-effort-risk-scoring.md](./v2/03-effort-risk-scoring.md)                                           | Plan 14 Step 4 effort/risk scoring; locks v2.0.1 target = Vendor discovery + Settings UI selection                              | Before choosing next v2 workstream                                    |
| [../../spec/21-app/62-v2-execution-order.md](../../spec/21-app/62-v2-execution-order.md)                 | Plan 14 Step 5 locked v2 release sequence (v2.0.1..v2.0.6) with exit criteria                                                   | Before starting any v2 release                                        |
| [../../spec/25-app-audit/99-signoff.md](../../spec/25-app-audit/99-signoff.md)                           | **Blind-AI GO signoff (v2.77.0)** - mean **98.0/100**, 0 blockers, threshold met                                                | Before opening any remediation or spec change under `spec/21-app/`    |
| [../../spec/25-app-audit/90-findings-summary.md](../../spec/25-app-audit/90-findings-summary.md)         | Plan 22 -> Plan 23 delta: mean +31.4, blockers -46; class-by-class clearance                                                    | Before proposing new audit criteria                                   |
| [../../spec/25-app-audit/93-remediation-evidence.md](../../spec/25-app-audit/93-remediation-evidence.md) | Blocker -> step -> memory-note mapping (Plan 23) with reproduction commands                                                     | Before re-opening any cleared finding                                 |
| [../../spec/25-app-audit/latest/99-consolidated.md](../../spec/25-app-audit/latest/99-consolidated.md)   | Consolidated diagnostics bundle (regenerated) - single source                                                                   | Before consuming any audit path                                       |
| [10-loop-engineering.md](./10-loop-engineering.md)                                                       | Loop Engineering protocol: state files, batch execution, plan queue order, and automatic progression                            | Before executing any pending plans or resuming a task loop            |
| [10-session-3.100-3.103-ui-hit-area.md](./10-session-3.100-3.103-ui-hit-area.md)                         | Session log v3.100-3.103: 40px hit-area sweep, 13px font floor, MachineFrame reference image, locked next 2 steps               | Before UI hit-area work, editor canvas, or planning rule-creation UX  |
| [11-phase1-substitute-map.md](./11-phase1-substitute-map.md)                                             | Substitutes for the read-memory prompt's missing `.lovable/` files; `spec/17-consolidated-guidelines/` = actual guidelines home | Every "read memory" onboarding run                                    |
| [12-query-wrapper-and-enums.md](./12-query-wrapper-and-enums.md)                                         | Enforces strict rules for Query Wrappers, TS Enums with Type suffix, and explicit boolean checks (isFail)                       | Before writing any DB query or TypeScript types                       |
| [12-ui-v4-state-management.md](./12-ui-v4-state-management.md)                                           | Store structure and synchronization                                                                                             | Before UI state edits                                                 |
| [13-avoid-blind-mass-refactors.md](./13-avoid-blind-mass-refactors.md)                                   | Rules against untargeted AST search-and-replace.                                                                                | Before doing mass search-and-replace or large refactors               |
| [14-commit-and-newline-rules.md](./14-commit-and-newline-rules.md)                                       | Requirements for single unified commits and single-statement newline exceptions.                                                | Before committing code                                                |
| [24-coding-and-error-rulebook.md](./24-coding-and-error-rulebook.md)                                     | Distilled rules from spec/02-coding-guidelines + spec/03-error-manage (naming, TS, error arch, security, CI)                    | Before writing or reviewing any code                                  |
| [25-integer-ids-and-edit-surface.md](./25-integer-ids-and-edit-surface.md)                               | HARD RULES: integer-only URL ids (never uuid/slug), Edit -> `/setup/roi`, single identity header per workspace                  | Before any routing, address-bar, breadcrumb, or workspace-header edit |
| [26-split-db-cli-cheatsheet.md](./26-split-db-cli-cheatsheet.md)                                         | Split-DB tier ownership, conventions, lifecycle, and error mapping for Worker + Processing CLI (Plan 90 Step 2)                 | Before Plan 90 Steps 3-12, 33-42, 43-70 (any CLI DB code)             |
| [28-daheng-host-matrix.md](./28-daheng-host-matrix.md)                                                   | Host dependencies and setup for Daheng cameras                                                                                  | Before working with hardware or Daheng SDK setup                      |
| [29-daheng-adapter-cheatsheet.md](./29-daheng-adapter-cheatsheet.md)                                     | Daheng adapter primitives, error mapping, observability, hardware test flags, and replay facade                                 | Before touching `DahengCameraFacade` or vendor primitives             |
| [workflow/01-session-v3-summary.md](./workflow/01-session-v3-summary.md)                                 | Summary of Session V3 (UI overlap fix, pycache gitignore fix, strict enum/boolean rule enforcement)                             | General session reference                                             |
| [specs/01-query-wrapper-and-types.md](./specs/01-query-wrapper-and-types.md)                             | Query wrapper plan and strict TS type rules (no string unions, required Enum Type suffix, explicit booleans)                    | When adding API endpoints or performing refactors                     |
| [workflow/02-session-v4-summary.md](./workflow/02-session-v4-summary.md)                                 | Summary of Session V4 (Strict TS rules applied, type errors pending, run.ps1 test pending)                                      | General session reference                                             |
| [workflow/03-session-v4-bugfix-summary.md](./workflow/03-session-v4-bugfix-summary.md)                   | Bugfix session mapping the Vite instanceof hazard for `EnvelopeError` and the UI updates for `EnvelopeErrorBoundary`.           | General session reference                                             |

## Cross-references

- Onboarding prompt: `.lovable/prompts/32-read-memory.md` (alias: "read memory")
- Prompt registry: `.lovable/prompt.md`
- Live plans: Plan 23 (blind-AI remediation) **complete**, archived under `.lovable/plans/done/`. Latest next-task prompt: `.lovable/prompts/277-next-task.md`.
- Active plan (Plan 100 UI V4 100-step polish): `.lovable/plans/pending/82-plan100-ui-v4-100steps.md`. Spec: `spec/21-app/53-ui-improvements-v4.md` §12-21 (Plan 100 references, fullscreen + shortcuts, address bar, properties bridge, HUD follow, seed fixtures per screen, inline edit, padding baseline, rules vs categories, error funnel). Subtasks under `.lovable/plans/subtasks/82-plan100-ui-v4-100steps/`. Commands 29-35 under `.lovable/spec/commands/`. Issues I-28..I-34 under `.lovable/issues/`. Screenshots `spec/21-app/53-ui-improvements-v4-assets/plan82/upload-71..76.png`.
- `mem://index.md` — high-level design brief and tokens

- [Enums + results shape](.lovable/memory/09-enums-and-results-shape.md) — PascalCase enums, 4-digit image seq, per-image ruleSet, safeZone metrics
- [SDK Facade pattern](spec/21-app/52-sdk-facade-pattern.md) - Cat\* domain objects + <Vendor>SdkFacade seam; PascalCase, lint rules, 9 open holes
- [UI Improvements V4](spec/21-app/53-ui-improvements-v4.md) - Rule = Category, `appliesBefore` chain, Project chain expansion, Photoshop palettes, seed + facade mandate (Plan 79)
- [V4 palette + badge rules](.lovable/memory/design/v4-photoshop-palettes.md) - Fixed numbers for tool rail, palette rows, ROI badges (13px tabular-nums), tooltip + long-press flyout semantics
- [V4 Rule/Category/Project model](.lovable/memory/features/rule-category-project-model.md) - Rule == Category invariant, `appliesBefore` semantics, `computeEffectiveChain`, cycle rejection
- [V4 Facade + seed contract](.lovable/memory/features/facade-and-seed.md) - **v2 Addendum (Plan 86)** at top: `bundle.v2.json` + `schemas-v2.ts`, `DomainFacade<T>` from `domain-facade.ts`, `orchestrator-v2.ts` + `cmd:apply-seed-profile`, read via `useFacadeOrStore` / `useSeededSurfaces`, 6 frozen profiles, SS-08 id prefixes, SS-10 13-slice matrix, Step 38/39/40 ratchets. Pre-v2 Plan 79 wiring kept for back-compat only.
- [Plan 90 Steps 145-146](.lovable/memory/v2/plan90/02-steps-145-146-compare-and-dev-frames.md) - Compare-sessions split view + Show-developer-frames operator toggle (SSR-safe localStorage, gating precedence)
- [Vite instanceof Hazard](.lovable/memory/v2/plan90/03-vite-instanceof-hazard.md) - Explains why `err instanceof EnvelopeError` fails in TanStack Start server functions and how to fix it via `err.name === "EnvelopeError"`.

## Core (V4)

- Rule and Category share the same editor; category is a Rule with `isCategory = true`. `appliesBefore` runs pre-rules in order before the current rule.
- Project chain expansion: `flatten(rules.map(r => [...r.appliesBefore, r])).dedupeByIdKeepFirst()`. Cycles rejected at save.
- Every new persistence surface goes through `src/lib/<domain>/facade.ts`; every fake facade gets a TODO under `.lovable/pending-facades/`.
- Every V4 screen ships with seed data (2 categories, 4 rules with X3 chained on X1/X2, 2 camera settings, 1 mic settings, `My Proj 1`).
- Backend mode + SDK facade rule (Command 40)

## Plan 28 closure (v3.5.0 - 2026-07-14)

- Plan 28 (Chromium Shell Spec) CLOSED. Rescore 100/100. Archived at `.lovable/plans/done/28-chromium-shell-spec.md`.
- Deliverables: chapters 00-25 + nine Mermaid diagrams under `spec/21-app/shell/`.
- Open follow-ups tracked in `spec/21-app/shell/24-open-questions.md` (SH-Q-01..08).
- Next: Rank 4 Denial-burst threshold tuning (plan 29 to be drafted).

## Plan 30 CLOSED (v3.76.0 - 2026-07-15)

- All 100 steps done. Plan archived at `.lovable/plans/done/30-app-ui-rule-editor-revamp.md` (`Status: completed`).
- QA evidence linked from `04-design-system.md` (unit 28/28, persistence, perf p95, Axe zero-contrast, keyboard-only, 6 visual baselines).
- Reports: `tests/reports/e2e-editor-{persistence,perf,keyboard,visual}.json`, `tests/reports/a11y-axe-editor.json`, `tests/reports/visual/*.png`.
- Next backlog top: Plan 29 (denial-burst threshold tuning); Plan 31 (pre-93 panel gaps) largely closed, see below.

## Plan 31 QA-linked (v3.91.0, 2026-07-15)

- Pre-93 panel gaps: LightingDrawer, ReferenceAssetPanel, NumberPanel, ColorPanel, BlobPanel, and pattern-via-Reference all mounted through `src/components/editor/panels/resolver.tsx` behind `data-panel-controller`.
- Forward-only v1 -> v2 rule migration live in `src/lib/editor/migrations.ts`, wired at the store boundary in `rules-slice.ts`.
- QA evidence table appended to `04-design-system.md` (unit migration, keyboard, Axe, per-panel visual, persistence round-trip, perf p95 mix).
- Subtasks completed: SS-01/SS-02/SS-03/SS-04 under `.lovable/plans/subtasks/31-pre-93-panel-gaps-completion/`.
- Spec: `spec/24-app-ui-design-system/05-rule-controller.md` amended with the Panels finalized section.
- PatternEdge panel + `setPatternEdge` hook: landed v3.202.0/v3.204.0, selector reconciled v3.443.0. SG-31-01 closed (Plan 32 in `.lovable/plans/done/`).
- Plan file archived under `.lovable/plans/done/31-pre-93-panel-gaps-completion.md` with `Status: completed`; step 30 backlog recheck remains.

- [Coding guidelines digest](mem://22-coding-guidelines-digest) — CODE RED rules, TS/generics/enums, promise-all, ESLint plugin, CI/CD SARIF.

## Plan 33 slice 2 CLOSED (v3.207.0, 2026-07-16)

- `getDenialBurstWindow` server-fn at `src/lib/security-telemetry.functions.ts` (admin-gated via `user_roles` under RLS, typed `DenialTelemetryError` with correlation id, non-admin logged via `console.warn`).
- Deterministic percentile snapshot at `.lovable/memory/v2/plan29/20-windows.json` plus `--check` mode in `scripts/security/plan29_windows.py`.
- Derivation memo `.lovable/memory/v2/plan29/30-derivation-inputs.md`: shipped default 5 unchanged, p95/p99 on 12-row fixture = 4 (not enough evidence to lower).
- Verification: `bunx tsgo --noEmit` 0, `bunx vitest run tests/unit/security-telemetry-window.test.ts` 6/6, `pytest tests/unit/export_denial_percentiles_test.py` 2/2.
- Plan 29 remains parked; Plan 33 file remains in `.lovable/plans/pending/` until close-out.

## Plan 35 read-phase + audit (v3.209.0, 2026-07-16)

- Four memos under `.lovable/memory/v2/plan35/`: `00-error-contract.md` (registered wire codes), `01-design-tokens.md` (hmi spacing/typography floors), `02-store-shape.md` (actions inventory), `03-current-rail.md` (rail/panels inventory), `04-slice-status.md` (landed vs open per step).
- Steps 1, 3, 7-14, 22-23 verified landed; tests 26/26 green across `rules-slice-groups`, `LayersPanel`, `PropertiesPanel`.
- Open: step 5-6 density audit (Playwright), step 21 E2E, step 24-25 spec doc updates. Plan 35 stays in `pending/`.

## Plans 43 + 45 CLOSED (v3.233.0, 2026-07-16)

- Plan 43 (coding quality, error dialog, AppMode flag) and Plan 45 (slice-2 call-site migration + readability sweep) archived under `.lovable/plans/done/`.
- Reality-aligned registries live in `src/lib/constants/`: `http.ts` (HttpMethod), `storage.ts` (StorageKey, 10 keys), `events.ts` (AppEvent, 4 keys). Speculative registries (`ipc.ts`, `error-codes.ts`, `camera.ts`, `sample-library.ts`) were deleted; the `camera.ts` file even invented vendor names that conflicted with the real `CaptureVendor` union in `src/lib/capture.shared.ts`.
- CI gate: `frontend-checks` job in `.github/workflows/ci.yml` runs `bun run lint` (composed = `eslint . --max-warnings=0 && check-magic-strings.sh --strict`), `bunx tsgo --noEmit`, and `bunx vitest run`.
- Lint state: 0 errors, 0 warnings. Real hook fixes landed in `CanvasViewport.tsx`, `run.tsx`, `DeviceDiscoveryPanel.tsx`, `admin.security.denial-burst.tsx`.
- Playwright smoke at v3.232.0: `/`, `/projects`, `/settings/camera` render clean, no pageerror or console.error.
- Deferred: sync of `spec/21-app/40..43*.md` with the reality-aligned registries remains open (doc-only, no code impact).
- vision-system-concepts: Concepts learned from 11 August session (Device vs Circuit, Camera Settings, Trigger Mode, etc.)
