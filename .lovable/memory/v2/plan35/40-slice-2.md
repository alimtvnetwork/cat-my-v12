# Plan 35 slice 2, density audit + duplicate-brand fix (v3.485.0)

Source: `.lovable/memory/v2/plan35/25-read-phase-summary.md` line 16 (gap
#2 by blast radius: "Density audit: 19-screen sweep + duplicate-border
fix (steps 5-6). Requires Playwright captures under `/tmp/browser/plan58/`").

## Audit executed

- Tool: Playwright headless chromium, 19 routes x 2 viewports
  (1280x800 and 1920x1080), domcontentloaded + 400ms settle, screenshots
  under `/tmp/browser/plan58/{viewport}/*.png`.
- Raw metrics: `/tmp/browser/plan58/results.json`.
- Method caveat: the direct-child border/section-bar detector reached
  only one level under `<main>` on 16/19 routes (`mainChildCount = 1`),
  so numeric duplicate-border scores under-report real defects.
  Compensated by side-by-side visual review of each screenshot and by
  direct DOM inspection on `/` and `/projects`.

## Ranked gaps found

1. **Duplicate brand mark at top-left corner (real, visual + DOM).**
   Both `<AgentLogo />` (fixed `top-2 left-2 z-40`, wordmark
   `cat-my-ui`) and the Titlebar's `<HeaderBrand />` ("Control
   Automation") render in the exact same rectangle at
   x=[8..212]px y=[0..40]px on every HmiShell route. DOM proof: the
   `cat-my-ui` span sits at x=40, y=13.9, h=20.15, while the
   "Control Automation" span sits at x=34, y=7.25, h=25.5, giving a
   ~6px vertical, ~4px horizontal overlap plus icon collision.
   Blast radius: 1 CSS rule + 1 className on 1 component.
2. **`/cli/settings` 500 (E_FE_TRANSPORT).** Not a density defect.
   Deferred; tracked in the residual list.
3. **Method blind spot: recursive selector needed.** The audit script
   should walk `main *` two levels deep before duplicate-border scores
   can be trusted. Deferred to slice 3.

## Contract diff (Gap 1)

Before: `<AgentLogo />` always renders as a fixed top-left brand,
overlapping the Titlebar's own brand row on every route that mounts
`HmiShell` (which is the default for all app routes since Plan 61).
After: `<AgentLogo />` carries the class `agent-logo-fixed`; a new CSS
rule `body:has([data-app-shell="true"]) .agent-logo-fixed { display:
  none; }` hides it whenever the Titlebar is present, mirroring the
Plan 75 pattern for `GlobalHomeAffordance`. Behaviour on shell-less
routes (if any remain) is unchanged, so the "cat-my-ui" CLI-quick-jump
affordance is preserved for that surface.

## Target files

- `src/components/cli/AgentLogo.tsx` (add class token).
- `src/styles.css` (append 3-line rule under the existing Plan 75
  block at line ~4317).
- `src/components/cli/__tests__/AgentLogo.test.tsx` (new; failing test
  asserting the class token is present so the CSS gate works).

## Fixture rows

No fixtures. The failing test renders `<AgentLogo />` in-memory and
asserts `container.querySelector('.agent-logo-fixed')` is non-null.

## Rollback plan

Revert the two src edits + delete the CSS rule at the pinned line
range. No store, no schema, no test-data changes to unwind.

## Blast radius

- Diff: 1 component (AgentLogo.tsx), 1 stylesheet block (styles.css),
  1 new test file, 2 memos.
- No store touch; no route touch; no server-fn touch.

## Next slice pointer

Plan 59 (Playwright E2E for the editor layers flow + Plan 35 close-out).
Slice 3 should also carry the "deepen density selector" method fix
listed as residual gap #3 above.
