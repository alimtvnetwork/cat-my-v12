# Plan 75 - Issue 13 verification (Step 4)

Date: 2026-07-18
Version: v3.512.0

## Root cause (one sentence)

Issue 13 was filed against a Plan 36 direction that would have replaced the home launcher; that direction never landed on `/`, and `src/routes/index.tsx` still renders the four-entry launcher required by `.lovable/spec/commands/09-home-hub-top-nav.md`.

## Evidence

`src/routes/index.tsx` lines 82-134 declare `WORKFLOWS` with exactly the four required entries (typed by line 72 `to: "/setup" | "/projects" | "/run" | "/ai-testing"`):

- id `setup` label "Setup" to `/setup` (lines 86-98)
- id `projects` label "Projects" to `/projects` (lines 100-110)
- id `trial` label "Trial run" to `/run` (lines 112-122)
- id `ai` label "AI testing" to `/ai-testing` (lines 124-134)

Playwright dump at `http://localhost:8080/` (script `/tmp/browser/plan75/dump.py`) confirms all four labels render as SETUP, PROJECTS, TRIAL RUN, AI TESTING with the intended sub-actions (Camera/Rules/Lighting/ROI, New/Open, Image/Results, Batch/Report). Screenshot at `/tmp/browser/plan75/baseline/home-verified.png`.

## Outcome

No source change required for issue 13. Acceptance criteria from `.lovable/memory/v2/plan75/01-issue-map.md` are met: four entries, frontend-only, all visible and clickable. Issue will be flipped to `Status: closed` in step 18 with pointer to this memo.

## Log surface

No new error path introduced. Existing `HomeErrorBoundary` + `HomeError` + `HomeErrorComponent` (index.tsx lines 55-64) route render failures to `errorStore` via the shared boundary, per `.lovable/memory/03-error-manage.md`. No silent catches added.
