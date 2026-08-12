# Plan 85 — Plan 83 residual shepherd: 20-step execution slice

Slug: plan83-residual-shepherd
Steps: 20
Status: completed
Created: 2026-07-19
Predecessor: Plan 84 (completed at v3.787.0)
Drives: Plan 83 residual (~39 of 50 steps)

## Seed contract superseded (Plan 86 Step 44, 2026-07-19)

Any references in this plan to `src/lib/seed/bundle.json`, per-slice bootstrap hooks, on-boot seed fan-out, or ad-hoc "seed if empty" logic are RETIRED. The current seed contract is the v2 bundle: `src/lib/seed/data/bundle.v2.json`, validated by `src/lib/seed/schemas-v2.ts`, applied via `src/lib/seed/orchestrator-v2.ts` and the `cmd:apply-seed-profile` command, with reads flowing through the `DomainFacade<T>` layer (`src/lib/facades/slice-facades.ts`, `useFacadeOrStore`). Profiles are frozen at 6 (see `SS-10-frozen-seed-surface-matrix.md`, `SS-08-frozen-id-conventions.md`, `SS-09-facade-contract-additions.md`). Read residual steps against those artifacts; do not re-add pre-v2 seed paths.

## Context

Plan 84 landed 8 fully + 3 partial of Plan 83's 50 steps and closed
issues 29-33. Plan 83 remains `Status: pending` with ~39 unfinished
steps spanning seed bundle additions, ruleset editor Categories tab,
settings reworks, thumbnails, a11y + axe + visual + e2e suites,
error-notify audit, docs, and closeout.

This plan groups those residuals into a 20-step ordered execution
slice biased toward "small, verifiable, ship-in-one-turn" units so
each "next 1 step" call maps cleanly to one line here. High-risk /
high-value items (Categories tab, seed bundle, thumbnails, axe) run
first; broad rewrites (settings.\* reworks, visual specs) run last
because they compound risk.

Constraints (from user memory + CODE RED rules):

- Never re-add features removed for cause (Recipe vocabulary, dead
  "circuit" category, in-page breadcrumb strip, tools-hint strip).
- Bump minor version, changelog, release notes, README pin after every
  step.
- No SEO surfacing in remaining-work lists.
- No em dashes.

## Steps

1. **Plan 83 step 16 — Categories tab split** in ruleset editor:
   filter Rules panel to `isCategory === false`; add Categories tab
   reusing the row primitive. Close issue #28.
2. **Plan 83 step 10 — Seed bundle rulesets**: add "Pill Presence
   Grid", "Blister Pocket Count", "IC Solder Joint Inspection",
   "Carrier Tape Pocket" to `src/lib/seed/bundle.json` if missing.
3. **Plan 83 step 10 — Seed bundle projects**: add "Blister Pack QA",
   "SOIC-8 Line", "Carrier Tape Line 3" if missing.
4. **Plan 83 step 11 — Sample image assets**: generate or import
   `sample-pcb.jpg` + `blister-pack.jpg` under `src/assets/samples/`;
   wire into seeded projects via ImageSamples facade.
5. **Plan 83 step 13 — Orchestrator count Vitest**: boot orchestrator
   against mock IDB, assert entity counts match bundle.
6. **Plan 83 step 21 — Presence/Absence/Ignore + Color swatch** inline
   group at top of every properties pane; persist through rule facade.
7. **Plan 83 step 22 — Docked ↔ HUD parity Vitest**: dispatch update
   from docked pane, assert HUD reflects it and vice versa.
8. **Plan 83 step 23 (residual) — HUD prefs**: wire "HUD follows
   selection" + "HUD anchor" toggles into `useUiPrefsStore` (drag
   behavior itself already landed).
9. **Plan 83 step 24 — Reveal in canvas** action on docked properties
   panel; pans canvas to selected shape.
10. **Plan 83 step 31 — EmptyState adoption audit**: sweep Settings,
    Rules editor, Projects list; migrate any bespoke empty markup to
    the unified `<EmptyState>` primitive.
11. **Plan 83 step 12 — Per-hub seed CTA**: add "Seed sample data"
    button on hub empty states routed through the Command Palette
    seed action.
12. **Plan 83 step 37 — SavedBadge wiring audit**: enumerate every
    settings write path; ensure each mounts `SavedBadge` with the
    right `savedAt` source.
13. **Plan 83 step 38 — Command Palette settings entries**: add
    entries for every settings subsection via the `onCommand` bus.
14. **Plan 83 step 40 — Icon-only aria-labels**: audit Titlebar,
    Tools rail, Properties pane, address bar; add `aria-label`;
    add `aria-live="polite"` to toast region.
15. **Plan 83 step 44 — Error notify audit**: replace remaining
    `toast.error(` call sites with `showToastError`; add "Copy
    details" chip to `GlobalErrorModal` (JSON payload).
16. **Plan 83 step 45 — Error History drawer**: wire `Ctrl+Shift+E`;
    verify `installGlobalErrorHandlers` + `installGlobalErrorCapture`
    mount exactly once from `__root.tsx`.
17. **Plan 83 step 41 — Axe run**: add axe pass across `/`, `/projects`,
    `/projects/$id`, `/setup/rules`, `/setup/rules/$id`, `/settings`,
    `/settings/camera`; hold zero criticals.
18. **Plan 83 step 30 — RulePreviewThumbnail** generator (canvas -> 160x100 PNG)
    on save; surface in Rules list and Project rule-chain rows.
19. **Plan 83 step 46 — Verification sweep**: `tsgo --noEmit`, full
    vitest, Playwright + axe suites; attach summary to
    `.lovable/plans/subtasks/85-plan83-residual-shepherd/verification.md`.
20. **Plan 85 closeout**: flip Plan 85 to completed, move to
    `.lovable/plans/completed/`. Deferred to a Plan 86 shepherd:
    steps 26-29 (rules list rebuild, modal rebuild, toolbar collapse,
    tabbed accordion), 32-36 (settings.\* full reworks), 42-43
    (Playwright visual + e2e specs), 47-50 (docs addendum, spec
    status flip, plan-file moves, Plan 83 closeout). Rationale:
    those are multi-hour rewrites that need their own execution
    slice; Plan 85 focuses on ship-per-turn units.

## Verification

- After each step, subtask note under
  `.lovable/plans/subtasks/85-plan83-residual-shepherd/SS-NN.md`
  with root cause, change, evidence, unblocks.
- CHANGELOG + RELEASE_NOTES + README pin updated each turn.
- Plan 83's `## Progress` reconcile section updated at Plan 85 step 19.
- Plan 85 closes when steps 1-19 land and Plan 86 (or user decision to
  end there) is created for the deferred set.

## Deferred (explicit, to Plan 86)

- Plan 83 steps 26, 27, 28, 29 (rules list + modals + toolbar +
  accordion rewrites).
- Plan 83 steps 32, 33, 34, 35, 36 (settings.\* full reworks).
- Plan 83 steps 42, 43 (Playwright visual + e2e specs).
- Plan 83 steps 47, 48, 49, 50 (docs addendum, spec flip, plan moves,
  Plan 83 closeout).
