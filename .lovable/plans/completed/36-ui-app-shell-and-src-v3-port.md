---
title: UI App-Shell Overhaul + src_v3 Port (50 steps, max enforcement)
slug: ui-app-shell-and-src-v3-port
plan: 36
status: completed
created: 2026-07-16
revised: 2026-07-16
subtasks_dir: .lovable/plans/subtasks/36-ui-app-shell-and-src-v3-port/
---

# Plan 36 - UI App-Shell Overhaul + src_v3 Port

Goal: turn the current "website" home into a Windows-style desktop HMI shell (titlebar row + menubar with 8 dropdown groups + status bar + `Cmd/Ctrl+K` command palette), replace the marketing tile grid with the real Jobs + Tasks operator surface, and port every reusable surface from `src_v3/` file by file. Exactly 50 atomic steps. Do not execute this plan the same turn it is written (per `.lovable/spec/commands/01-plan-50-workflow.md`).

Revision note (2026-07-16): SEO/route-hygiene group removed at user request; those six steps are replaced with per-file src_v3 port steps and per-enum extraction steps. No SEO work in this plan.

Rescope note (2026-07-18, Plan 76 SS-03): Large portions of this umbrella plan have already shipped through other plans. Residual scope is narrow and delegated:

- `src_v3/` reference tree was fully removed under Plan 75 (issue 14 closed). The frozen manifest step (Prep 2) is obsolete.
- Titlebar row, dock chrome, breadcrumb, and menubar groups landed under Plan 67 (Titlebar + dock + breadcrumb) and Plan 75 (chrome dedup pass).
- App-mode switching and the global error dialog landed under Plan 43 and Plan 71 respectively; error visualization is not part of the residual scope.
- Seed / bundle facade landed under Plan 72 (issue 26 closed).
- Remaining scope for Plan 36 is umbrella-only, delegated to downstream plans: theme tokens migration => Plan 62, nav sidebar port => Plan 63, slice-1 shell execution => Plan 61. Do not execute steps 4-50 directly under this plan; open a fresh slice plan for any residual work.

## Why this plan exists

The current `/` route (`src/routes/index.tsx`, 183 lines) renders a 4-tile "Pick a workflow" hub with animated accent glows. That is website chrome, not machine HMI chrome. Line operators need: a persistent app menubar with keyboard-driven navigation, a Jobs list on the left, a Tasks table on the right, and a status bar showing the active program. `src_v3/src/routes/index.tsx` already implements the operator surface in 42 lines and `src/components/nav/TopMenuBar.tsx` already implements 4 of the needed menus. What is missing is: 4 more menu groups, keyboard shortcuts, the palette, the titlebar/status-bar chrome, and the migration of the Home body from tiles to Jobs+Tasks. This plan does exactly that, plus every reusable src_v3 port catalogued in the prior turn.

## Prep

1. **Baseline test snapshot.** Why: any regression after Step 4 must be attributable, not conflated with pre-existing failures. Run `bunx vitest run` and `bunx tsgo --noEmit`; save both transcripts under `subtasks_dir/00-baseline/`. Verify: both green; if any pre-existing failure, list it in `00-baseline/known-failures.md` before touching code.
2. **Freeze the src_v3 diff manifest.** Why: `src_v3/` is a moving reference that could drift while porting; a frozen manifest lets us re-verify every port against the exact same source state. `diff -rq src src_v3 > subtasks_dir/00-baseline/src-v3-diff.txt`. Verify: file non-empty, matches Step 2 output in this chat turn.
3. **Register plan in memory index.** Why: `.lovable/memory/index.md` is the always-read entry point; without a row here, the next agent will miss that plan 36 is in flight and may collide. Append one row pointing at this file. Verify: row present, no other rows mutated.

## Group A - Windows-style menubar and app chrome (Steps 4-16)

4. **File menu.** Why: the current menubar has no File group, so operators cannot see New / Open / Save / Quit at all - this is the single most reported "does not feel like an app" symptom. Add File to `TopMenuBar.tsx` GROUPS with: New job, Open job, Recent (submenu), Save, Save as, Export ruleset, Quit. Verify: 7 entries render; Recent shows submenu shell. Depth: [SS-01](../subtasks/36-ui-app-shell-and-src-v3-port/SS-01-menubar-groups.md).
5. **Edit menu.** Why: Undo/Redo currently live only inside the rule editor; they must be reachable globally so any control-surface undo (drag ROI, resize layer) has a consistent affordance. Add: Undo, Redo, Cut, Copy, Paste, Delete, Preferences. Verify: menu opens; Preferences links to `/settings`.
6. **View menu.** Why: operators need zoom + status-bar toggles without hunting; today zoom lives on individual canvas widgets only. Add: Zoom in, Zoom out, Fit, Reset zoom, Toggle status bar, Toggle sidebar, Fullscreen. Verify: Fullscreen calls `document.documentElement.requestFullscreen()` guarded by `useHydrated`.
7. **Window menu.** Why: a Windows-style app exposes every top-level surface in a Window menu so it is discoverable without knowing the URL. Add: Editor, Live run, Results, NG events, AI testing. Verify: each item is a typed `<Link>`.
8. **Reorder GROUPS.** Why: menubar order must match desktop convention or muscle memory breaks (File first, Help last). Final order: File, Edit, View, Setup, Run, Window, Settings, Help. Verify: DOM tab order matches.
9. **Extract `MenuGroupId` enum.** Why: CODE-RED rule 8 (no magic strings) + rule 12 (enum for kind). Move group ids out of inline literals into `src/lib/enums/menu-group-id.ts`. Verify: `rg '"file"|"edit"|"view"' src/components/nav/` returns zero matches.
10. **Extract `MenuShortcut` enum.** Why: same rule; also lets the palette and menubar share one source (rule 10 DRY). Create `src/lib/enums/menu-shortcut.ts`. Verify: enum imported by both `TopMenuBar` and the future palette.
11. **`useMenuShortcuts` hook.** Why: today no menu items have keyboard equivalents; a Windows-style app is unusable for power users without them. Implement a single window-scoped listener that maps `MenuShortcut` → callback, ignores form-control focus, uses positive booleans only. Verify: fires the correct callback for each combo in the SS-02 table. Depth: [SS-02](../subtasks/36-ui-app-shell-and-src-v3-port/SS-02-shortcuts.md).
12. **Wire shortcuts into every menu item.** Why: the label on a menu item ("Save … Ctrl+S") is a lie if the accelerator is not bound. Pass each entry's `shortcut` into `useMenuShortcuts` and render it via `MenubarShortcut`. Verify: `Cmd/Ctrl+S` triggers Save handler and closes any open menu.
13. **Titlebar row in `HmiShell`.** Why: the current shell has no titlebar; the menubar sits alone at the top which looks like a browser toolbar, not an app. Add a 40 px row above the menubar with app icon slot, program name, drag region, ghost min/max/close buttons (presentational only, no OS integration). Verify: renders at 40 px; hit-area sweep passes.
14. **Status bar footer in `HmiShell`.** Why: operators need capture-connection state, active program, run counter, ok/ng tally, and clock visible at all times; today those live only inside the Live Run screen. Add a 32 px footer below `<Outlet />` that reads from `run-store.ts` + `program-store.ts` (see Step 32). Verify: renders; toggled by View → Toggle status bar.
15. **Command palette (`Cmd/Ctrl+K`).** Why: with 8 menus + submenus, fuzzy search is faster than menu traversal for anyone who knows the target. Ship a shadcn `<CommandDialog>` driven by the same `PaletteItem[]` the menubar renders (rule 10 DRY). Verify: `Mod+K` opens; typing "new" filters to New job; Enter navigates. Depth: [SS-03](../subtasks/36-ui-app-shell-and-src-v3-port/SS-03-command-palette.md).
16. **Axe sweep of the shell.** Why: adding a titlebar + menubar + status bar without an accessibility pass will regress keyboard-only operators. Run axe against `/`. Verify: `tests/reports/a11y-axe.json` shows zero serious/critical violations.

## Group B - Home = Jobs + Tasks operator screen (Steps 17-22)

17. **Copy v3 home data module.** Why: `src_v3/src/components/home/data.ts` already defines `HomeJobStatus` / `HomeTaskStatus` enums per rule 12; recreating them would violate rule 10 (DRY). Copy verbatim to `src/components/home/data.ts`. Verify: byte-identical except any `@/` import path adjustments.
18. **Copy v3 `JobList.tsx`.** Why: the JobList component is the left-pane operator list; it already uses `formatIdentifierLabel` from `src/lib/display-labels.ts` which exists in `src/`. Verify: mounts, selects, keyboard `↑/↓` navigation still works.
19. **Copy v3 `TaskPane.tsx`.** Why: right-pane task table with Setup / Run per-row actions - the exact operator flow the user described. Verify: three tasks render for the first job; Setup/Run links resolve.
20. **Rewrite `src/routes/index.tsx`.** Why: the current 183-line file with `HUB_ACTIONS`, `ACCENT_STYLES`, `HubActionTile` is the "website home" symptom. Replace with the 42-line v3 shape: `HmiShell` + `JobList` + `TaskPane`. Verify: file < 50 lines; no `Sparkles`; no accent-glow gradients.
21. **Remove `SectionTopBar` from Home / Trial-run / Projects.** Why: after Group A lands, the menubar owns navigation; SectionTopBar becomes a second horizontal nav strip (rule 10 violation). Delete the imports and JSX from `src/routes/index.tsx`, `src/routes/trial-run.tsx`, `src/routes/projects.index.tsx`. Verify: only one horizontal nav strip on each route.
22. **Visual baseline for `/`.** Why: without a baseline PNG, later CSS drift will not be caught. Playwright screenshot at 1280×1800, save to `tests/reports/visual/home.png`. Verify: file exists, dimensions correct.

## Group C - src_v3 port, file by file (Steps 23-40)

23. **Port `HmiShell.tsx` diff.** Why: v3 is the canonical shell per memory 10 (session 3.100-3.103 hit-area sweep). Diff-merge into `src/components/hmi/HmiShell.tsx`, keeping the Step 13-14 titlebar/status-bar additions. Verify: 40 px hit-area sweep still passes.
24. **Port `MachineFrame.tsx` diff.** Why: v3 fixed the reference-image z-index bug logged in memory 10. Verify: reference image renders behind the editor canvas at every zoom level.
25. **Port `GlobalNav.tsx` diff.** Why: v3 unified the mobile nav collapse with the menubar; today the mobile shell breaks at < 768 px. Verify: mobile viewport (375×812) shows a working nav drawer.
26. **Port `SettingsDialog.tsx` diff.** Why: v3 exposes a keyboard-close on Escape that the current dialog lacks; also needed for the `Cmd/Ctrl+,` shortcut from Step 12. Verify: Escape closes; focus returns to trigger.
27. **Port `BarPanel.tsx`.** Why: rule editor is missing the Bar detector panel; users cannot author bar rules today. Copy to `src/components/editor/panels/`. Verify: mounts via `data-panel-controller="bar"`.
28. **Port `EdgePanel.tsx`.** Why: same reason for Edge detector. Verify: mounts via `data-panel-controller="edge"`.
29. **Port `ReferenceCapturePanel.tsx`.** Why: allows re-capturing the reference frame from inside the editor; today users have to leave to `/setup/reference` and lose state. Verify: mounts; capture button calls the reference-image server function.
30. **Merge `panels/resolver.tsx` + `panels/index.ts`.** Why: the resolver is the single dispatch point for the three new panels; merging preserves the panels `src/` has that v3 lacks (Inspector, Properties). Verify: `PanelKind` enum lists every kind; no panel is unreachable.
31. **Port `RuleList.tsx` + `RuleRow.tsx` + `GeometryInputs.tsx`.** Why: `src/components/editor/rail/RightRail.tsx` has inline row markup that duplicates styling across every rule type (rule 9, 10 violation). v3 factored them out. Verify: right-rail keyboard test still passes.
32. **Diff-merge `RightRail.tsx`.** Why: after Step 31, RightRail must render via `<RuleRow>` and drop the inline `<article>` block. Verify: file shrinks by > 40 lines; visual baseline unchanged.
33. **Port `ProgramSwitcher.tsx` + wire into `EditorTopBar`.** Why: switching program currently requires a full route change; v3 does it in-editor without unmounting the canvas. Verify: switching updates program-store; canvas state preserved.
34. **Port `program-store.ts`.** Why: prerequisite for Step 4 (Recent submenu), Step 14 (status bar), and Step 33. Confirmed missing today via `test -f src/lib/program-store.ts`. Verify: unit test covers set/get/recent list capped at 5.
35. **Port `jobs.functions.ts`.** Why: Home Jobs+Tasks (Group B) must load jobs via a server function, not from a hardcoded `HOME_JOBS` array long-term. Ship the server fn now; keep Step 17's static data as fallback until real data lands. Verify: `useServerFn(getJobs)` returns v3 shape.
36. **Port `reference-image.functions.ts`.** Why: today the reference upload path goes through client-only code with no server validation (RLS bypass risk). v3 routes it through a `createServerFn` with input validation. Verify: `/setup/reference` upload still works; server fn receives the ULID.
37. **Diff-merge `ReferenceImageCard.tsx`.** Why: card must consume the Step 36 server fn via `useServerFn` (per `tanstack-query-integration` - no `useEffect` fetching). Verify: no `useEffect` + `fetch` remains in the component.
38. **Port `editor/store/history-slice.ts`.** Why: v3 fixed a redo-after-branch bug not yet backported. Verify: `bunx vitest run src/lib/editor/store/__tests__` green with unchanged undo depth.
39. **Port `editor/store/history-types.ts`.** Why: type surface must move with the slice or the diff produces `any` at the boundary. Verify: no new `any` in the store surface.
40. **Port `editor/store/rules-slice.ts`.** Why: v3 tightened the migration path from v1 rules; needed so any newly imported v1 ruleset from Step 35 job data survives. Verify: forward-migration unit test extended and green.

## Group D - Coding-guideline sweep (Steps 41-46)

41. **Enum extraction sweep.** Why: rules 5, 8, 12; the remaining string unions (`SectionId`, run status, run lock, panel kind, group id) are the biggest single source of magic strings in the UI. Complete the SS-05 table. Verify: `rg '"[a-z][a-z0-9-]*"\s*\|\s*"[a-z]' src/ -g '*.ts' -g '*.tsx'` returns zero UI hits. Depth: [SS-05](../subtasks/36-ui-app-shell-and-src-v3-port/SS-05-enum-extraction.md).
42. **Negative-boolean rename.** Why: rule 3, 4; e.g. `!isLoading`, `isNotEmpty`, `hasNoResults` all violate the naming policy and cascade into nested-if code. Rename to positive form. Verify: `rg -n '\bisNot|\bhasNo|!\s*is[A-Z]' src/` returns zero.
43. **Function-length waiver audit.** Why: rule 1; functions 16-25 lines that lack `# lint-allow` are silent violations that compound over time. Add the waiver header only where the function cannot be split. Verify: `bash linter-scripts/run.sh function-length` green.
44. **Nested-if extraction.** Why: rule 2; nested-if is the single most common source of missed error paths in the editor code. Extract every case > 2 levels into a lookup table or typed dispatch. Verify: cyclomatic linter reports zero regressions.
45. **Catch-block log-rethrow audit.** Why: rule 6 + error-manage tier 3; a silent catch here would drop an `E_*` code before it reaches the audit sink from Plan 20. Verify: `python linter-scripts/check-mws-error-codes.py` green.
46. **File-size cap enforcement.** Why: rule 7 (80-100 lines); today `src/routes/index.tsx` (183), `src/components/nav/TopMenuBar.tsx`, and a few editor files exceed the cap. After Step 20 the Home file already drops under; audit the rest and split. Verify: `bash scripts/check-editor-budgets.sh` green.

## Group E - Setup route hygiene (Steps 47-48)

47. **Create `src/routes/setup.index.tsx`.** Why: `src/routes/setup.tsx` currently doubles as layout + content; per `tanstack-route-architecture` a layout must render `<Outlet />` only. Move the current Setup body into `setup.index.tsx`. Verify: `/setup` still renders overview; `/setup/roi` and `/setup/reference` still mount.
48. **Reduce `src/routes/setup.tsx` to `<Outlet />`.** Why: same rule; a layout with non-Outlet body silently unmounts children. Verify: file is under 20 lines and exports only the layout route.

## Group F - QA + release (Steps 49-50)

49. **Full test sweep.** Why: 46 preceding steps touch shell, menubar, editor rail, editor panels, editor store, home, and setup routes; a full sweep is the only way to catch cross-cutting regressions. Run `bunx vitest run` + all Playwright suites under `tests/e2e/`. Verify: 100% pass; six visual baselines under `tests/reports/visual/` refreshed for `/`, `/projects`, `/trial-run`, `/setup`, `/run`, `/results`.
50. **Archive.** Why: plan-workflow spec says archived plans move to `done/` with `Status: completed`. Move this file to `.lovable/plans/done/36-ui-app-shell-and-src-v3-port.md`, flip `status:` frontmatter, append a closure row to `.lovable/memory/index.md`. Verify: `pending/` no longer contains plan 36; memory index closure row present.

## Not in scope

- SEO / route hygiene / sitemap / robots. Removed at user request 2026-07-16.
- AI Testing routes and `src/lib/ai-testing/` - v3 has neither.
- The `projects.$projectId.*` route family - richer in `src/` than in v3.
- `src/components/editor/{InspectorSurface,PropertiesPanel}.tsx` - newer than v3 counterparts.

## Exit criteria

- Home is a Jobs + Tasks split, no marketing tiles.
- Menubar has File / Edit / View / Setup / Run / Window / Settings / Help with keyboard shortcuts, titlebar row, status bar, and `Cmd/Ctrl+K` palette.
- Every catalogued src_v3 surface ported, file by file, covered by tests.
- Coding-guideline sweep passes every linter script.
- Version bumped, plan archived, memory index updated.
