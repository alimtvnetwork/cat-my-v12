# Plan 83 — UI completion, seed hardening, and top-tier craft pass

Slug: plan50-ui-completion-and-seed-hardening
Steps: 50
Status: pending
Created: 2026-07-19

## Seed contract superseded (Plan 86 Step 44, 2026-07-19)

Any references in this plan to `src/lib/seed/bundle.json`, per-slice bootstrap hooks, on-boot seed fan-out, or ad-hoc "seed if empty" logic are RETIRED. The current seed contract is the v2 bundle: `src/lib/seed/data/bundle.v2.json`, validated by `src/lib/seed/schemas-v2.ts`, applied via `src/lib/seed/orchestrator-v2.ts` and the `cmd:apply-seed-profile` command, with reads flowing through the `DomainFacade<T>` layer (`src/lib/facades/slice-facades.ts`, `useFacadeOrStore`). Profiles are frozen at 6 (see `SS-10-frozen-seed-surface-matrix.md`, `SS-08-frozen-id-conventions.md`, `SS-09-facade-contract-additions.md`). Read residual steps against those artifacts; do not re-add pre-v2 seed paths.

## Context

Consolidated 50-step completion pass covering every unfinished item in
Plans 79 (UI V4), 80 (V4 polish), 81 (settings + rules polish), and 82
(100-step V4 shortcuts + address bar + seed). The user asks for a
top-tier UI, comprehensive seed data on every hub, no dead links, and no
leaking or half-shipped features. Steps 1-8 audit and document what is
already done vs pending across those four plans. Steps 9-45 execute the
consolidated pending work, prioritized by user-visible impact (seed and
routes first, editor bridges second, palette + settings polish third,
tests + a11y last). Steps 46-50 verify, document, version, and close.

Captured commands (new this turn):

- `.lovable/spec/commands/36-top-tier-ui-craft-baseline.md`

Prior captured commands still governing this plan:

- `.lovable/spec/commands/29-fullscreen-and-shortcut-conventions.md`
- `.lovable/spec/commands/30-inline-edit-commit-semantics.md`
- `.lovable/spec/commands/31-padding-and-readability-baseline.md`
- `.lovable/spec/commands/32-address-bar-nav.md`
- `.lovable/spec/commands/33-properties-selection-bridge.md`
- `.lovable/spec/commands/34-hud-follows-shape.md`
- `.lovable/spec/commands/35-seed-fixtures-per-screen.md`

No new bug reports were filed this turn. Prior open issues #28-#34
remain and are triaged during step 3.

Subtasks:

- `./subtasks/83-plan50-ui-completion-and-seed-hardening/SS-01-pending-audit-report.md`

Applies coding-guidelines and error-manage rules from `spec/` and
`.lovable/coding-guidelines/`. Every user-visible failure MUST route
through `showToastError` + `useErrorStore.captureException`.
Alim rule: never add retry logic; surface errors directly.

## Steps

1. Read all four plan files (79, 80, 81, 82) end-to-end plus their subtask folders and list every step verbatim into a working scratch under `docs/plan-83/raw-steps.md`.
2. Grep `src/` for each artifact named in every step (component file, hook, store, route, spec) and record whether it exists and is imported from a live route. Record the finding in the scratch file.
3. Reconcile open issues `.lovable/issues/28`..`34` against grep evidence: mark each as fixed/partial/still-open with a one-line justification.
4. Produce `docs/plan-83/pending-audit.md` following the structure in `./subtasks/83-plan50-ui-completion-and-seed-hardening/SS-01-pending-audit-report.md`.
5. From the audit, build the ordered consolidated backlog (seed gaps, broken routes, editor bridges, palette polish, settings polish, tests, a11y) and freeze it as a bulleted list at the top of `docs/plan-83/pending-audit.md`.
6. Cross-link `docs/plan-83/pending-audit.md` from `spec/21-app/53-ui-improvements-v4.md` under a "Plan 83 audit" heading.
7. Update `.lovable/memory/index.md` with a one-line pointer to Command 36 (top-tier UI craft baseline) so future sessions apply the rule without re-reading this plan.
8. Bump minor version, append a "Plan 83 audit" line to `CHANGELOG.md` and `RELEASE_NOTES.md`, refresh the README version pin.
9. Verify `src/lib/seed/orchestrator.ts` seeds swatches, categories, rules, rulesets, cameras, mic-settings, projects, image-samples. Add any missing entity per Plan 82 steps 62-69. Only-when-empty guard stays intact.
10. Extend `src/lib/seed/bundle.json` with the missing rulesets ("Pill Presence Grid", "Blister Pocket Count", "IC Solder Joint Inspection", "Carrier Tape Pocket") and the missing projects ("Blister Pack QA", "SOIC-8 Line", "Carrier Tape Line 3") if any are not already present.
11. Generate or import sample images (`sample-pcb.jpg`, `blister-pack.jpg`) under `src/assets/samples/` if missing; wire them into the seeded projects' Image Samples via the ImageSamples facade.
12. Ensure every hub route (Home, Projects, Setup/Rules, Setup/Camera, Setup/Rulesets, Settings/\*) renders seeded content on first boot; add an `EmptyState` fallback that also offers a "Seed sample data" button using the Command Palette hook.
13. Add a Vitest that boots the orchestrator against a mock IndexedDB and asserts entity counts match the bundle (rules >= 6, rulesets >= 4, projects >= 3, cameras >= 3, mic-settings >= 3, samples >= 2 per project).
14. Confirm `src/routes/projects.$projectId.rulesets.$rulesetId.rules.$ruleId.tsx` exists and mounts the ROI editor from the Rule facade (Plan 82 step 35, issue #29). Create if missing.
15. Make every rule row in the ruleset editor navigate to that route on row-click and on Enter-key; add an explicit Edit icon-button with `aria-label`.
16. Filter the ruleset editor Rules panel to `isCategory === false`; move category rows to a dedicated Categories tab reusing the same row primitive (issue #28).
17. Delete the residual "Tools · dock on the left" hint strip between header and canvas; move the hint to a tooltip on the Tools rail header (issue #32).
18. Remove any surviving in-page breadcrumb strip on the Rule Set page and any page that already shows the titlebar AddressBar breadcrumb (issue #31).
19. Verify `AddressBar` in `Titlebar.tsx` resolves segments to human labels via facades (project name, ruleset name) rather than raw ids, and that `Ctrl+L` focuses it for editing.
20. Wire the Properties selection bridge: rebuild `PropertiesPalette.tsx` to consume `useSelectedRuleShape()` and render the kind-specific pane, matching the HUD content (Plan 82 steps 41-44, issue #30).
21. Add the Presence / Absence / Ignore toggle and Color swatch picker inline group at the top of every properties pane; persist through the rule facade.
22. Add a unit test that dispatches an update from the docked pane and asserts the HUD reflects it, and vice versa.
23. Wire "HUD follows selection" + "HUD anchor" settings into `useUiPrefsStore`; update `SelectionOverlay.tsx` to re-anchor while dragging (Plan 82 steps 45-47, issue #33).
24. Add "Reveal in canvas" action on the docked properties panel that pans the canvas to the selected shape.
25. Add Playwright spec `tests/visual/properties-selection-bridge.spec.ts` covering docked <-> HUD parity and follow-drag behaviour at 1% tolerance.
26. Rebuild `/setup/rules` list with drag handles, kind badges (13px tabular-nums), before/after arrow visualisation, inline enable toggle, and search + category chip (Plan 81 step 12).
27. Rebuild the rule create/duplicate/rename modals to match the projects Create dialog: 2-column with a live preview aside. See Plan 81 subtask SS-02.
28. Collapse the rules editor top toolbar to a single 40px band with grouped icon clusters (Selection / Transform / Snap / View) and an overflow menu; the 48px left tools rail stays untouched.
29. Convert the Properties palette 10 panes into a tabbed accordion that keeps only one pane open at a time on narrow docks; remember the last-open pane per rule kind.
30. Add a `RulePreviewThumbnail` generator (canvas -> 160x100 PNG) on save; surface the thumbnail in the Rules list and in Project rule-chain rows.
31. Unify empty states across Settings, Rules list, Rules editor, and Projects list into a single `<EmptyState>` component (icon slot, headline, body, primary CTA).
32. Rebuild `settings.index.tsx` into two collapsible sections ("Device and capture", "Operator and retention"); persist collapse state; convert retention inputs into stepper + presets.
33. Rework `settings.camera` into a two-column layout (form left, live preview / test-shot right) with a sticky "Save and test" action bar.
34. Rework `settings.trigger` into a diagram-first view (source -> debounce -> action) with editable pill nodes and a timing preview strip.
35. Rework `settings.lighting` with per-channel sliders, a colour-temperature swatch row, and a "flash test" button that logs the pulse via `showToastError` on failure.
36. Rework `settings.shortcuts` into a searchable, category-grouped table (Editor / Navigation / Rules / Runs) with inline rebind capture, conflict detection, reset-to-default.
37. Standardise the "Saved at HH:MM:SS" chip into a `SavedBadge` (relative time, fades after 4s) wired to every settings write path.
38. Add Command Palette entries for every settings subsection ("Open Camera settings", "Open Shortcuts", etc.) via the `onCommand` bus so cmd/ctrl-K jumps directly.
39. Audit every panel header for `px-4 py-3`; remove all `text-[10px]`/`text-[11px]` occurrences per Command 31; ensure ROI badges are 13px tabular-nums and never truncate `X · Y | W × H`.
40. Add `aria-label` to every icon-only button in the Titlebar, Tools rail, Properties pane, and address bar; add `aria-live="polite"` to the toast region.
41. Add axe a11y run to `/`, `/projects`, `/projects/$id`, `/setup/rules`, `/setup/rules/$id`, `/settings`, `/settings/camera`; keep zero criticals.
42. Add Playwright visual specs for `tests/visual/settings-index.spec.ts`, `tests/visual/settings-camera.spec.ts`, `tests/visual/setup-rules-list.spec.ts`, `tests/visual/rules-editor-toolbar.spec.ts`, `tests/visual/ruleset-editor.spec.ts`, `tests/visual/address-bar.spec.ts` at 1% tolerance, dark + light themes, seeded IndexedDB.
43. Add Playwright e2e specs: `tests/e2e/rule_row_to_editor.py` (click rule row -> editor route), `tests/e2e/seed_first_boot.py` (wipe IDB -> boot -> assert seeded content visible on every hub), `tests/e2e/hud_follows_shape.py`.
44. Audit every `toast.error(` call site; replace with `showToastError` from `src/lib/errors/notify.ts`; add "Copy details" chip to `GlobalErrorModal` that copies `{ id, correlationId, name, message, stack, context }` as JSON.
45. Wire `Ctrl+Shift+E` to open the Error History drawer; ensure `installGlobalErrorHandlers` + `installGlobalErrorCapture` mount exactly once from `__root.tsx`.
46. Run `tsgo --noEmit`, `bunx vitest run`, and the full Playwright + axe suite; attach the summary to `docs/plan-83/verification.md`. No retry logic anywhere: any failing task surfaces its error and stops.
47. Update `docs/plan-100/README.md` (Plan 82 step 94) with a Plan 83 addendum linking to the audit and verification docs; add before/after screenshots for the settings, rules, and projects reworks.
48. Update `spec/21-app/53-ui-improvements-v4.md` "Status" line to note Plan 83 completion and the closed-out items from Plans 79/80/81/82.
49. Move each of Plans 79, 80, 81, 82 from `.lovable/plans/pending/` to `.lovable/plans/completed/` using `mv`, flipping their `Status:` frontmatter to `completed` if and only if the audit in step 4 shows every remaining item was absorbed into Plan 83 and shipped. Any plan with still-open unabsorbed work stays in `pending/` with a note appended.
50. Bump minor version, update `CHANGELOG.md` + `RELEASE_NOTES.md`, pin the final version in `README.md`, and `mv` this plan file to `.lovable/plans/completed/83-plan50-ui-completion-and-seed-hardening.md` with `Status: completed`.

## Verification

- `docs/plan-83/pending-audit.md` exists and lists every step of Plans 79/80/81/82 with status + evidence.
- Booting on a wiped IndexedDB shows seeded rules, categories, rulesets, cameras, mic-settings, projects, and image samples on every hub route.
- Rule row click navigates to `/projects/$/rulesets/$/rules/$` and mounts the ROI editor.
- Selecting a shape updates both the docked Properties palette and the floating HUD; dragging the shape moves the HUD when the setting is on.
- `tsgo --noEmit`, Vitest, Playwright visual gate, e2e specs, and axe all pass.
- Version pin in README matches the version listed in CHANGELOG's Plan 83 entry.
- Plans 79/80/81/82 either live under `completed/` with `Status: completed`, or carry an explicit "unabsorbed" note explaining why they stay pending.

## Progress (Plan 84 reconcile, 2026-07-19)

Landed under Plan 84 (v3.775.0 → v3.784.0). Plan 83 stays in `pending/` — not all 50 steps are done.

Step-by-step markers:

- [~] 1-8: audit + docs. Audit outputs live at `.lovable/plans/subtasks/84-next-20-onboarding-and-pending-drive/SS-01…SS-07.md` and `.lovable/plans/subtasks/83-plan50-ui-completion-and-seed-hardening/SS-01-pending-audit-report.md` rather than `docs/plan-83/`. Cross-link into `spec/21-app/53-ui-improvements-v4.md` (step 6) and memory-index update (step 7) NOT done. Version pin bump (step 8) done incrementally each turn.
- [x] 9: seed-orchestrator entity coverage verified in SS-12 (rules/rulesets/projects/cameras/mic-settings/samples all present; no missing entities).
- [ ] 10-11: bundle.json ruleset additions ("Pill Presence Grid", "Blister Pocket Count", "IC Solder Joint Inspection", "Carrier Tape Pocket") and sample-image assets NOT added. Category-union hardening (SS-13) dropped the dead `"circuit"` variant so the sample-image gap identified in SS-12 is now schema-enforced.
- [ ] 12: `EmptyState` primitive exists (`src/components/common/EmptyState.tsx`, Plan 81 step 17) but no per-hub "Seed sample data" CTA wired.
- [ ] 13: orchestrator-count Vitest NOT added.
- [x] 14: rule-editor route `src/routes/projects.$projectId.rulesets.$rulesetId.rules.$ruleId.tsx` verified present and mounted (SS-08, issue #29 closed).
- [x] 15: rule-row click + Enter-key navigation + `aria-label` Edit button verified (SS-08).
- [ ] 16: Categories tab split (`isCategory === false` filter, issue #28) NOT done.
- [x] 17: tools "dock on the left" hint strip already removed (SS-15, issue #32 closed).
- [x] 18: in-page breadcrumb duplication already resolved (SS-15, issue #31 closed; single mount at `Titlebar.tsx:77`).
- [x] 19: `AddressBar` Ctrl+L focus + facade-resolved labels verified (SS-15, `src/components/shell/AddressBar.tsx:38`).
- [x] 20: `PropertiesPalette` wired to `useSelectedRuleShape()` (SS-09, issue #30 closed).
- [ ] 21: Presence/Absence/Ignore + Color swatch inline group NOT added.
- [ ] 22: docked ↔ HUD dispatch parity Vitest NOT added.
- [x] 23: HUD follow-during-drag confirmed live in `SelectionOverlay.tsx` (SS-10, issue #33 closed). `useUiPrefsStore` "HUD follows selection"/"HUD anchor" toggles NOT added.
- [ ] 24: "Reveal in canvas" action NOT added.
- [ ] 25: `tests/visual/properties-selection-bridge.spec.ts` NOT added.
- [ ] 26-30: rules list rebuild, modal rebuild, toolbar collapse, tabbed accordion, thumbnail generator NOT done.
- [~] 31: `EmptyState` unified primitive exists (Plan 81 step 17); adoption across Settings/Rules editor/Projects NOT audited this turn.
- [ ] 32-36: settings.\* reworks NOT done.
- [~] 37: `SavedBadge` exists (`src/components/settings/SavedBadge.tsx`, Plan 81 step 4); wiring to every settings write path NOT audited.
- [ ] 38: Command Palette entries for every settings subsection NOT added.
- [x] 39 (partial): `text-[10px]` audit run in SS-16; the sole _content_ violation at `LivePreviewBadge.tsx:92` fixed. 22 remaining stylistic-label uses (kbd chips, uppercase eyebrows, mono correlation ids) enumerated and deferred as non-content.
- [ ] 40-45: a11y labels, axe run, visual specs, e2e specs, error-notify audit, `Ctrl+Shift+E` drawer NOT done.
- [ ] 46-50: full verification suite, docs addendum, spec status flip, plan-file moves, closeout NOT done.

Landed count: 8 fully (steps 9, 14, 15, 17, 18, 19, 20, 23) + 3 partial (1-8, 31, 37, 39). Remaining: ~39 steps. Plan stays `Status: pending`.

## Appended from prior pending tasks

Absorbed backlog (executed during Plan 83):

- Plan 79 remaining: rule editor entry route, categories split, HUD/rotation polish, axe pass, visual baselines.
- Plan 80 remaining: Image Samples 3-column grid + drag reorder, Properties palette panes split, axe pass on `/projects/$id`.
- Plan 81: entire 20-step scope (settings rework, rules list rework, rule modals, editor toolbar collapse, empty-state unification, visual specs).
- Plan 82 remaining: seed orchestrator gaps (steps 62-70), error surfacing audit + Copy details (71-75), padding baseline (76-85), documentation + release (94-100).

Untouched (owned by their originating plans, not absorbed):

- 29-denial-burst-threshold-tuning, 35-ui-ux-photoshop-layers-overhaul, 36-ui-app-shell-and-src-v3-port, 40-tools-images-spec-docs, 41-keyboard-dnd-and-code-quality-pass, 44-plan43-execution-slice-1, 49/50-plan29-_, 51/52-plan50-_, 58/59-plan35-_, 61/62/63-plan36-_.
