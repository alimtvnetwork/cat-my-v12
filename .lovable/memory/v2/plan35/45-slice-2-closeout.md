# Plan 35 slice 2 close-out (v3.485.0)

## Landed gap

Gap #1 from `40-slice-2.md`: duplicate brand mark at top-left corner.
`<AgentLogo />` (fixed, `cat-my-ui` wordmark) no longer overlaps the
Titlebar's `<HeaderBrand />` ("Control Automation") on any HmiShell
route.

## Commits (all in one turn)

- `src/components/cli/AgentLogo.tsx`: added `agent-logo-fixed` class
  token on the `<Link>` className list.
- `src/styles.css`: appended a Plan 58 block
  `body:has([data-app-shell="true"]) .agent-logo-fixed { display: none; }`
  directly under the Plan 75 `global-home-affordance` rule.
- `src/components/cli/__tests__/AgentLogo.test.tsx`: new. Two cases,
  one asserts the CSS hook class is present, the second asserts the
  wordmark stays in the DOM (so CSS drives visibility, not JSX). Both
  went red then green.
- `.lovable/memory/v2/plan35/40-slice-2.md`, new scope memo.
- `.lovable/memory/v2/plan35/45-slice-2-closeout.md`, this file.

No src/ churn outside the two files above; no store, no route, no
server-fn edits.

## Verification

- Test: `bunx vitest run src/components/cli/__tests__/AgentLogo.test.tsx`
  transitions red -> green with only the `agent-logo-fixed` class
  edit. 2/2 pass.
- Typecheck: `bunx tsgo --noEmit` exits 0 (no output).
- Full suite: `bunx vitest run` 1295 pass / 6 fail; the 6 failures are
  pre-existing (facade ratchets, save-conflict resolver, palette
  registry, PanelChrome collapsed body) and unrelated to
  AgentLogo / styles.css / titlebar. No regression introduced by this
  slice.
- Playwright: `/tmp/browser/plan58/verify_fix.py` on `/` at 1280x800
  DPR=2 confirms `.agent-logo-fixed` computed `display: none`,
  bounding rect 0x0. Screenshot `zoom/after_topleft.png` shows the
  Titlebar brand row clean (single "Control Automation" wordmark,
  history nav, breadcrumb chip, no ghost "cat-my-ui" text).

## Slice-1 vs slice-2 delta

- Slice-1 (Plan 57): docs-only, spec §10.6 addition.
- Slice-2 (this): runtime fix, 1 component + 1 CSS rule + 1 test.

## Remaining gaps

Two carry-overs from `40-slice-2.md`:

1. `/cli/settings` 500 (`E_FE_TRANSPORT`). BE reachability, not a
   density defect. Owner: separate BE issue (not Plan 35 scope).
2. Audit method: recursive `main *` walk to catch duplicate borders
   more than one level deep. Attach to Plan 59 as a preflight step,
   then run the E2E flow.

Plan 35 stays pending. Plan 59 remains its closer.

## Next slice pointer

`.lovable/plans/pending/59-plan35-layers-slice-3-and-closeout.md`.
