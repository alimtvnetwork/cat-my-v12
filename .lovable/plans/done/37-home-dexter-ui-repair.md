# Home Dexter UI Repair

Slug: home-dexter-ui-repair
Steps: 12
Status: done (absorbed by Plan 67, v3.415.0)
Created: 2026-07-16

## Context

Restore the home-first workflow UI, remove the `src_v3` rollback direction, preserve an always-available Home route, and improve the React app menu into a Dexter-style HMI command surface using the attached screenshots as visual references. Captured command: `.lovable/spec/commands/12-home-dexter-ui-flow.md`; captured issues: `.lovable/issues/13-home-screen-regression.md`, `.lovable/issues/14-src-v3-rollback-regression.md`, `.lovable/issues/15-global-home-menu-missing.md`.

Conflict noted: the pasted generic lifecycle text says `completed/`, but the active project lifecycle command says archived plans go to `.lovable/plans/done/`; this plan follows `.lovable/spec/commands/08-plan-lifecycle-done-folder.md`.

## Steps

1. Persist the three attached screenshots into the project asset/reference flow and write the reference index before touching UI. See ./subtasks/37-home-dexter-ui-repair/SS-01-reference-assets.md.
2. Supersede Plan 36 by removing every `src_v3` port and Jobs + Tasks home replacement item from its executable scope; keep only menu-improvement concepts that do not conflict with the home launcher.
3. Remove `src_v3/` from the repo after confirming no production file imports it. See ./subtasks/37-home-dexter-ui-repair/SS-04-remove-src-v3.md.
4. Restore `/` as the four-entry home workflow screen: Projects, Setup, Trial run, AI testing, matching the screenshot card rhythm and selected-card affordance. See ./subtasks/37-home-dexter-ui-repair/SS-02-home-flow.md.
5. Add a first-class Home action to the global chrome and top menu so every route can return to `/` without browser back.
6. Rebuild the top menu as a Dexter-style HMI command surface with Home, Project, Setup, Rules, Test, and Run groups. See ./subtasks/37-home-dexter-ui-repair/SS-03-dexter-menu.md.
7. Define the project workflow under project routes: project selection, setup recipe, settings, rule setup, image upload, test, and run, without moving those workflows onto `/`.
8. Apply the screenshot visual language to the React UI using semantic tokens only: dark HMI surface, cyan status accents, compact borders, readable card text, and no generic gradient/orb styling.
9. Preserve and improve the editor/setup screen shown in the reference: HOME button, PROGRAM title, Setup/Ops/Results tabs, rule layers panel, save/publish controls, and rule-tool rail.
10. Add route and interaction tests proving `/` renders the four workflow cards, Home navigation works from setup/project/test routes, and no `src_v3` dependency remains.
11. Capture desktop screenshots for `/`, `/setup`, one project route, trial run, and AI testing; compare visually against the saved references for layout, contrast, and menu access.
12. Close by updating `.lovable/memory/index.md` with the landed home/menu repair evidence and moving this plan to `.lovable/plans/done/37-home-dexter-ui-repair.md` with `Status: completed`.

## Verification

- Exactly three screenshot references are saved and indexed.
- `src_v3/` is absent and production imports do not reference it.
- `/` shows Projects, Setup, Trial run, and AI testing as the primary home workflow.
- A visible Home control returns to `/` from every tested route.
- The menu uses the Dexter/HMI group structure and active route state.
- Tests and screenshots prove home, setup, project flow, trial run, and AI testing did not regress.

## Appended from prior pending tasks

- Plan 29 remains pending for denial-burst threshold tuning and is unrelated to this UI repair.
- Plan 32 remains pending for SG-31-01 PatternEdge.
- Plan 33 remains pending for Plan 29 read/data phase closure.
- Plan 35 remains pending for layers/properties and density work; keep its density audit and layer repair, but do not let it replace the home workflow.
- Plan 36 is superseded where it ports `src_v3`, removes `SectionTopBar`, or replaces `/` with Jobs + Tasks.
- Existing issue 10 (`home-missing-projects-and-top-nav`) remains relevant and is reopened by issue 13 until this plan lands.
