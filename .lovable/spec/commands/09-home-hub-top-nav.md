# Command: Home hub as the top-level launcher with sectioned top-nav

Scope: app UI (all future home / project screens).
Applies from: 2026-07-15 onward, every planning + implementation turn touching navigation.

Verbatim (user, repeated multiple times):

> There should be a home screen where all these options should be there, what we want
> to do. Setup, create new project, and inside the project we can have rule sets. We
> can create rule sets alone based on the image. We can do a trial run, AI testing,
> things like that, that should be on the top of the screen. Each one of the sections
> we go, then we have multiple options.

Rules:

- The route `/` is a hub, not a workspace. It shows top-level actions only:
  Setup, Create new project, Open project, and the global cross-cutting tools
  (Trial run, AI testing) pinned to the top of the screen.
- A project is the primary container. Inside a project the user can create
  and manage rule sets, run trials against uploaded images, and run AI tests.
- Every section (Setup, Project, Rule set, Trial run, AI testing) exposes its
  sub-options through a persistent top-of-screen section bar. No sub-option
  hides inside a modal-only path.
- Do not put queue lists, task panes, or per-job detail on `/`. Those belong
  under `/projects/$projectId/...`.
- One thing per page: each section route owns exactly one primary surface.

Enforcement: any plan that adds a route or a home-page block MUST reference this
command and MUST NOT reintroduce operator queues on `/`.

---

## Landed in Plan 34

Plan `.lovable/plans/pending/34-home-hub-projects-rulesets.md` (moving to
`done/` at step 30) implemented this command: the `/` route is now a
five-action hub (Setup, New project, Open project, Trial run, AI testing)
with a pinned `SectionTopBar`, and project routes under `/projects/$id/...`
own the queue and workspace surfaces. Screenshot verification recorded in
CHANGELOG v3.125.0.
