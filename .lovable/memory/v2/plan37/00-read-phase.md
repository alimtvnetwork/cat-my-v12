# Plan 37 read-phase memo (v3.213.0 slice)

Scope: audit landed state of the home-dexter UI repair plan before touching UI.
Method: `rg`/`ls` reads only. No source changes this slice.

## Landed already (from prior slices, verified this turn)

- `src_v3/` and `src-v3/` are absent on disk (`ls src_v3` and `ls src-v3` both
  return "No such file or directory"). `rg -l 'src_v3|src-v3' src tests scripts`
  matches nothing. Plan step 3 (remove `src_v3/`) is satisfied.
- `src/routes/index.tsx` renders the four-entry workflow home (Setup, Projects,
  Trial run, AI testing) via `HmiShell` with `pendingComponent`, `errorComponent`,
  `notFoundComponent`, and a `HomeErrorBoundary` wrapper. Plan step 4 core is
  satisfied. Visual affordance polish vs. reference screenshots is not verified.
- `src/components/hmi/Titlebar.tsx` mounts a `<Link to="/" aria-label="Home">`
  in every route that uses `HmiShell`. Plan step 5 (Home reachable from every
  route) is satisfied for the 13 routes that mount the shell; the raw
  `admin.security.denial-burst.tsx` route added by Plan 51 does NOT use
  `HmiShell` yet (cross-ref: `.lovable/memory/v2/plan36/10-shell-inventory.md`).
- `src/routes/__tests__/home-smoke.test.tsx` and `home-missing-data.test.tsx`
  already cover the four workflow labels and every fallback path. Plan step 10
  route/interaction coverage is partially satisfied for `/`; Home navigation
  from setup/project/test routes is NOT yet asserted end-to-end.

## Not landed (deferred, honestly)

- Step 1: three reference screenshots are not persisted under
  `.lovable/spec/references/` or an equivalent index. Cannot proceed without the
  user re-attaching them; do NOT fabricate placeholder assets.
- Step 6: top menu is a single Home link, not the Home/Project/Setup/Rules/
  Test/Run Dexter-style command surface described. Requires the reference
  screenshots before implementing to avoid guessing the visual language.
- Step 8: semantic-token audit of home surfaces vs. reference is not done.
- Step 9: editor/setup screen (HOME button, PROGRAM title, Setup/Ops/Results
  tabs, rule layers panel, save/publish, rule-tool rail) is not verified against
  the reference.
- Step 11: desktop Playwright screenshots for `/`, `/setup`, one project route,
  trial run, AI testing are not captured this slice.
- Step 12: plan is not moved to `.lovable/plans/done/` because steps 1, 6, 8,
  9, 11 remain open.

## Blocker

Steps 1, 6, 8, 9 depend on the three reference screenshots called out in the
plan preamble. They are not in the repo. Ask the user to re-attach before the
next slice; do not invent a Dexter menu layout from filename alone.
