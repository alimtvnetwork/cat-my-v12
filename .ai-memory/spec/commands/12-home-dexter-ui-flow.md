# Command: Home-first Dexter-style project workflow

Sequence: 12
Captured: 2026-07-16
Scope: app UI, home route, project flow, global navigation, visual references.

## Verbatim intent

> The UI should look like the attached home screenshots. Put the home-screen reference into the assets folder. The user can get back to the home screen at any time. The home screen should have the four things discussed before. First is project. Under project, the user picks setup, settings, rule-based things, then puts images in, tests it, and runs project by project. Make the menu better. Make it like a Dexter-based UI look in the React-based thing. Remove the source V3 folder. Revert back the home screen how it was, but improve it.

## Rules

- `/` is always a real home screen, never removed or replaced by a jobs-only screen.
- Global chrome must always expose a Home action that returns to `/` from every route.
- Home presents the primary four workflow entries: Projects, Setup, Trial run / image testing, and AI testing / review.
- Project pages own the per-project flow: setup recipe, settings, rule-based setup, image upload, test, run.
- Use the attached screenshots as visual references and store durable reference assets under the project asset flow during implementation.
- Remove `src_v3/`; do not use it as a live source of truth.
- Improve the menu into an app-like Dexter/HMI command surface, not a marketing website nav and not a blind v3 rollback.

## Applies when

- Any plan or implementation touches `/`, project navigation, global menu, shell chrome, `src_v3/`, home cards, or project workflow IA.
