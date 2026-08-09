# Issue 10: Home screen missing Projects, Rule Sets, Trial Run, AI Testing

Status: resolved
Reported: 2026-07-15
Reporter: user (repeated correction, "mentioned several times")
Resolved: 2026-07-15

## Symptom

The current `/` route is a 4-tile launcher (Setup, Run, Audit, AI Workflows)
that jumps straight into operator surfaces. There is no concept of a Project,
no way to create a project, no place to author rule sets scoped to a project,
no trial-run entry point that accepts an image, and no AI-testing entry point.
The top of the screen has no persistent section bar exposing these choices.

## Expected

- `/` is a hub with: Setup, Create new project, Open project, Trial run,
  AI testing (see `.lovable/spec/commands/09-home-hub-top-nav.md`).
- A project route exists (`/projects/$projectId`) where rule sets are created,
  a trial run can be executed on an uploaded image, and AI testing can be run.
- Each section carries its sub-options in a top-of-screen bar.

## Actual

- Home renders 4 workflow tiles that map to legacy operator routes only.
- No `/projects` route, no project model, no rule-set-per-project surface.
- Trial run and AI testing are not first-class entries.

## Related files

- `src/routes/index.tsx`
- `src/components/editor/shell/EditorTopBar.tsx`
- `src/components/hmi/HmiShell.tsx`
- `src/routes/setup.tsx`, `src/routes/run.tsx`, `src/routes/errors.tsx`, `src/routes/results.tsx`

## Fix vehicle

Fixed by Plan 34 (`.lovable/plans/pending/34-home-hub-projects-rulesets.md`).

## Resolution

Plan 34 delivered the Home hub, Projects, per-project Rule sets, Trial run,
and AI testing routes, then verified the section top bar across the captured
desktop screenshots. The remaining lifecycle step is to archive Plan 34 after
this resolved issue record is committed.
