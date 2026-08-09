# UI Craft: 30 improvements for padding, visualization, breadcrumbs, header, and AI test

Slug: ui-craft-30-improvements
Steps: 30
Status: completed
Created: 2026-07-19

## Context

Focused visual + interaction pass across shell, canvas, inspector, breadcrumb,
header, and the AI/test surface. Every step must ship a seedable fixture
through the v2 seed facade (`src/lib/seed/bundle.v2.json` +
`orchestrator-v2.ts`) so the state is reproducible in Playwright + preview.
Related commands: `.lovable/spec/commands/31-padding-and-readability-baseline.md`,
`.lovable/spec/commands/36-top-tier-ui-craft-baseline.md`,
`.lovable/spec/commands/37-json-seedable-config-facade-ui.md`.
Related open issues: `.lovable/issues/12-ui-overlap-and-density.md`,
`.lovable/issues/17-menu-hover-jitter-and-padding.md`,
`.lovable/issues/22-duplicate-header-still-present.md`,
`.lovable/issues/27-properties-panel-and-badges-crappy.md`,
`.lovable/issues/34-rule-set-fill-section-padding-broken.md`.

## Steps

1. Baseline audit: capture screenshots of Home, Projects, Ruleset editor, ROI editor, AI Test, Settings; store under `docs/verification/ui-craft-baseline/` and log gaps in step notes.
2. Introduce a shared `--space-*` scale in `src/styles.css` (4/8/12/16/24/32) and map `hmi-*` utilities onto it; no visual change yet, just token unification.
3. Adopt a shared `Section` primitive (`src/components/ui/section.tsx`) with consistent header/padding/gap; refactor `GettingStarted`, `ProjectsPanel`, `RulesetEditor` sidebar cards to use it.
4. Header refactor: split `AppShellHeader` into `HeaderBrand`, `HeaderCrumbs`, `HeaderActions`; remove residual duplicate action strip flagged in issue 22.
5. Breadcrumb v2: replace slash-separated crumbs with chip-style crumbs (rounded, hover popover for sibling nav) in `src/components/shell/AddressBar.tsx` companion `Breadcrumbs.tsx`.
6. Breadcrumb overflow: middle-truncate with a "…" popover listing hidden ancestors when total width exceeds container.
7. AddressBar polish: monospace segment font, subtle divider glyph, copy-URL button with toast; keep sanitize helper untouched.
8. Global command palette (`Ctrl+K`) shell wired to seeded command list (`bundle.v2.json` -> `commands` array); actions call existing router / store handlers.
9. AI Test section refresh: rebuild `src/routes/ai-test.tsx` (or nearest equivalent) into a 3-pane layout: input, run controls, result timeline; use seeded sample runs.
10. AI Test seed: add `ai-test-runs` collection to `bundle.v2.json` with 6 canned runs (pass/fail/timeout/warning/partial/empty) so the timeline renders without a live worker.
11. AI Test result cards: color-coded status pill, elapsed ms badge, ROI thumbnail from seeded pocket images, expand-to-JSON drawer.
12. Canvas HUD density: reduce HUD button hit target from 28px to 24px with 8px gap; verify HUD still readable at 100% zoom via Playwright screenshot.
13. LayersPanel spacing: unify row height (28px), align chevrons, right-align order badge; add 8px section gap between Rules and Categories groups.
14. Properties inspector chip row: promote current pane chip strip to a sticky sub-header inside `TabbedBody`; add scroll shadow when body overflows.
15. Properties inspector empty states: reuse `PalettePlaceholder` across all panes; add "Try a sample selection" button that dispatches a seeded selection.
16. Selection context menu: raise base font from 12px to 13px, tighten row padding to 6px/10px, add subtle divider color from token `--ca-border-subtle`.
17. Toast system pass: standardize on top-right stack, 320px width, 4s auto-dismiss, `role="status"` for info and `role="alert"` for errors.
18. Error History drawer polish: virtualized list, filter chips (level/scope), copy-payload button; seed 20 sample errors via `bundle.v2.json`.
19. Home screen hero: tighten vertical rhythm (top 48/24/16), swap generic icon set for Lucide `Sparkles`/`Layers`/`Bot`, add subtle gradient token.
20. Projects grid: add hover elevation, ruleset count badge, last-run timestamp; seed 6 demo projects with varied ruleset counts.
21. Ruleset editor toolbar: collapse rarely used actions into an overflow menu; keep Run, Save, Undo/Redo, Snap in the primary row.
22. Rule row micro-interaction: 120ms row highlight on selection, focus ring visible on keyboard nav, drag handle only appears on hover.
23. Focus styles: enforce a single `focus-visible` outline recipe via `@utility focus-ring` in `src/styles.css`; audit buttons/inputs/rows.
24. Density toggle: add a `Comfortable / Compact` switch in header user menu, persisted in `ui-prefs-store`, driving `--space-scale` multiplier.
25. Motion polish: introduce `useReducedMotion` guard; wrap panel open/close and toast entry in framer-motion with 160ms ease-out.
26. Skeleton loaders: add `Skeleton` variants for Projects grid, Layers panel, AI Test timeline; render while seeded data streams in.
27. Seed profile expansion: add `ui-craft-demo` profile to `orchestrator-v2.ts` combining projects, ai-test runs, error history, commands so a single seed populates every new surface.
28. Playwright coverage: add `tests/e2e/ui_craft_smoke.py` that boots the `ui-craft-demo` seed profile and screenshots Home, Projects, Ruleset, AI Test, Settings.
29. Docs: write `docs/verification/ui-craft-improvements.md` with before/after screenshots and the seed profile invocation.
30. Release: bump minor version, update `CHANGELOG.md` and `RELEASE_NOTES.md`, pin the new version in root `README.md`, then move this file to `.lovable/plans/completed/87-ui-craft-30-improvements.md` with status flipped.

## Verification

- Build + `tsgo --noEmit` clean after each slice.
- Playwright `ui_craft_smoke.py` produces 5 screenshots that visually match the target compositions.
- `bunx vitest run src/lib/seed` green after seed additions (schema + relationship tests).
- Manual: cycle Properties inspector modes (rail → accordion → tabs), open Ctrl+K, run AI Test with seeded profile, confirm no console errors.

## Appended from prior pending tasks

Deferred from prior sweeps (kept scoped out of this plan; tracked in their own files):

- `35-ui-ux-photoshop-layers-overhaul.md`
- `36-ui-app-shell-and-src-v3-port.md`
- `79-ui-improvements-v4.md` / `80-ui-improvements-v4-polish.md`
- `81-settings-rules-and-misc-polish.md`
- `82-plan100-ui-v4-100steps.md`
- `85-plan83-residual-shepherd.md`
