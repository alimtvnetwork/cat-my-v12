# Home Hub, Projects, Rule Sets, Trial Run, AI Testing

Slug: home-hub-projects-rulesets
Steps: 30
Status: completed
Created: 2026-07-15

## Context

The user has repeatedly stated that `/` must be a hub exposing top-level
actions (Setup, Create new project, Open project, Trial run, AI testing),
with each section carrying its sub-options in a top-of-screen bar, and that
a Project is the container for rule sets (rule sets are authored from an
image, then run in trial and AI-testing modes). Current `/` is only a
4-tile launcher; there is no Project model, no per-project rule set store,
no image-driven ruleset creation, no trial-run route, and no AI-testing
route. This plan builds the hub, the project model, and the five sectioned
surfaces end-to-end with a client-side persisted store, deterministic-stub
evaluators where needed, and vitest coverage.

Related:

- Command: `.lovable/spec/commands/09-home-hub-top-nav.md`
- Issue: `.lovable/issues/10-home-missing-projects-and-top-nav.md`
- Existing: `src/routes/index.tsx`, `src/components/editor/rail/*`,
  `src/components/hmi/HmiShell.tsx`, vitest wired via `vitest.config.ts`

## Steps

1. Lock information architecture and section-bar contract. See ./subtasks/34-home-hub-projects-rulesets/SS-01-information-architecture.md
2. Add `SectionTopBar` component at `src/components/nav/SectionTopBar.tsx` (props `{ section, active }`) rendering sub-option `<Link>` row per SS-01.
3. Add `SectionTopBar` unit test that snapshots the sub-option list per section id.
4. Implement Project + RuleSet Zustand store with persist middleware. See ./subtasks/34-home-hub-projects-rulesets/SS-02-project-store.md
5. Add vitest coverage for the store (create/rename/delete cascade, persistence round-trip).
6. Rewrite `src/routes/index.tsx` as the hub: 5 tiles (Setup, New project, Open project, Trial run, AI testing) with `<SectionTopBar section="home" />` pinned at top.
7. Update `/` head metadata to reflect "Control Automation - Home hub" and matching og tags.
8. Add `src/routes/projects.tsx` (layout with `<Outlet />`) and `src/routes/projects.index.tsx` listing projects with a Create button that opens a name dialog.
9. Wire Create-project dialog to `createProject`, then `navigate` to `/projects/$projectId`.
10. Add `src/routes/projects.$projectId.tsx` layout: reads `selectProject`, throws `notFound()` if missing, renders `<SectionTopBar section="project" />` plus `<Outlet />`.
11. Add `src/routes/projects.$projectId.index.tsx` overview: project name, ruleset count, quick links to Rule sets / Trial run / AI testing, legacy operator links grouped under "Operator".
12. Add `errorComponent` and `notFoundComponent` to every new project route (root already has notFoundComponent).
13. Add `src/routes/projects.$projectId.rulesets.tsx` layout + `.index.tsx` list route showing rulesets for the project with a New button.
14. Implement the "create ruleset from image" route. See ./subtasks/34-home-hub-projects-rulesets/SS-03-ruleset-from-image.md
15. Add `src/routes/projects.$projectId.rulesets.$rulesetId.tsx` editor route that mounts the existing HMI editor shell with `imageRef` as background and `ruleset.rules` bound to `updateRulesetRules`.
16. Ensure the RightRail edits within the ruleset editor route flow through `updateRulesetRules` (no direct writes to the legacy rules store).
17. Implement trial-run route + engine stub + history. See ./subtasks/34-home-hub-projects-rulesets/SS-04-trial-run.md
18. Add `TrialResult` and `TrialRun` types to `src/lib/trial/types.ts`; export from a barrel.
19. Add vitest for `runRuleset` stub (one result per rule) and trial-history FIFO cap.
20. Implement AI-testing route + aggregate + history. See ./subtasks/34-home-hub-projects-rulesets/SS-05-ai-testing.md
21. Add vitest for aggregate math and AI-testing history cap.
22. Add a global `Home` link in `EditorTopBar` that routes to `/` (verify no duplicate after prior edits).
23. Remove Jobs/TaskPane imports from `/` (already done) and audit `src/components/home/*` for unused exports; delete files that are no longer imported anywhere.
24. Run typecheck (`bunx tsgo --noEmit`) and fix any breakage from renamed/deleted files.
25. Run `bunx vitest run` and ensure the new store, SectionTopBar, ruleset-from-image, trial-run, and AI-testing tests all pass.
26. Capture screenshots via Playwright for `/`, `/projects`, `/projects/$id`, `/projects/$id/rulesets`, `/projects/$id/trial-run`, `/projects/$id/ai-testing` at desktop viewport 1280x1800.
27. Verify each captured screen shows the `SectionTopBar` at the top with the correct sub-options highlighted for the active route.
28. Update `.lovable/spec/commands/09-home-hub-top-nav.md` with a "Landed in Plan 34" footnote and link to this plan.
29. Update `.lovable/issues/10-home-missing-projects-and-top-nav.md` status to `resolved` with the fixing-plan reference.
30. Move this plan file: `mv .lovable/plans/pending/34-home-hub-projects-rulesets.md .lovable/plans/done/34-home-hub-projects-rulesets.md` and flip `Status:` frontmatter to `completed`.

## Verification

- Build: `bun run build` succeeds; typecheck clean.
- Tests: `bunx vitest run` all green (existing per-kind editor tests + new store/section/trial/ai suites).
- Manual (Playwright screenshots per step 26): five section surfaces render with pinned top bar; hub `/` shows 5 actions and no queue lists.
- Persistence: reload after creating a project + ruleset preserves both entities under localStorage key `ca:projects:v1`.
- Spec/issue hygiene: command file updated (step 28), issue closed (step 29), plan moved to completed (step 30).

## Appended from prior pending tasks

None: pending plans 29 (denial-burst threshold tuning), 32 (SG-31-01 PatternEdge), and 33 (Plan 29 read phase) are unrelated backend/security scopes and are not merged into this UI-hub plan.
