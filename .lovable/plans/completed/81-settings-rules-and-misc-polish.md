# Settings, Rules, and cross-page polish (20 steps)

Slug: settings-rules-and-misc-polish
Steps: 20
Status: completed
Created: 2026-07-18

## Context

User asked for 20 concrete ways to improve the Settings index, misc settings subpages (camera, trigger, lighting, shortcuts, license), the Rules section (`/setup/rules`, `/setup/rules/$id`), and adjacent pages (projects list, project editor, home hub). Recent redesign work landed a card-based Settings index (v3.613.0) and a slimmer Projects list (v3.612.0). This plan continues that polish, tightens IA, and lifts the Rules editor and misc setting subpages to the same visual bar.

Related open issues: `.lovable/issues/09-setup-ui-not-modern.md`, `.lovable/issues/12-ui-overlap-and-density.md`, `.lovable/issues/17-menu-hover-jitter-and-padding.md`, `.lovable/issues/19-rules-editor-program-panel-and-layer-arrow.md`, `.lovable/issues/20-tools-collapse-chevron-unprofessional.md`, `.lovable/issues/24-setup-rules-form-ui-and-category-picker.md`, `.lovable/issues/27-properties-panel-and-badges-crappy.md`.

## Steps

1. Add a left settings sidenav (Camera / Trigger / Lighting / Shortcuts / License) with `aria-current="page"`; keep the tile grid on the index but active-highlight the current subsection when inside a leaf route.
2. Add a Settings search box that filters cards + subsection tiles by title/description keywords, persisted in `useUiPrefsStore` per session.
3. Extract the `SettingsCard` used in `settings.index.tsx` into `src/components/settings/SettingsCard.tsx` and reuse it across `settings.camera`, `settings.trigger`, `settings.lighting`, `settings.shortcuts`, `settings.license`.
4. Standardize the "Saved at HH:MM:SS" chip: replace with a `SavedBadge` that shows relative time ("saved 3s ago") and fades after 4s, wired to every settings write path.
5. Group the Settings index into two collapsible sections: "Device and capture" (subsections + vendor + discovery) and "Operator and retention" (operator, audit retention, tooltip prefs); persist collapse state.
6. Replace raw `<input type="number">` for retention with a labeled stepper (`-` / value / `+`) plus quick presets (30d, 90d, 1y, 5y) and (128MB, 512MB, 2GB, 10GB). See `./subtasks/81-settings-rules-and-misc-polish/SS-01-retention-stepper.md`.
7. Move `DeviceDiscoveryPanel` behind a "Scan devices" disclosure so the index is not dominated by discovery output; keep it expanded when `vendor` was just changed.
8. Rework `settings.camera` to a two-column layout: live preview / test-shot on the right, form controls on the left, with a sticky "Save and test" action bar.
9. Rework `settings.trigger` to a diagram-first view (source -> debounce -> action) with editable pill nodes and a timing preview strip.
10. Rework `settings.lighting` with per-channel sliders, a color-temperature swatch row, and a "flash test" button that logs the pulse through the error store.
11. Rework `settings.shortcuts` into a searchable, category-grouped table (Editor / Navigation / Rules / Runs) with inline rebind capture, conflict detection, and reset-to-default.
12. Redesign `/setup/rules` list: rule chain kanban-ish rows with drag handles, kind-token badges (13px tabular-numeric), before/after ordering visualized as arrows, and inline enable toggle.
13. Redesign the rule create/duplicate/rename modals to match the projects Create dialog (2-column with live preview aside). See `./subtasks/81-settings-rules-and-misc-polish/SS-02-rule-modals.md`.
14. Rules editor (`/setup/rules/$id`): collapse the top toolbar into a single 40px band with grouped icon clusters (Selection / Transform / Snap / View) and overflow menu; keep the 48px left tools rail untouched.
15. Rules editor Properties palette: convert the 10 panes into a tabbed accordion so only one pane is open at a time on narrow docks, remembering the last open pane per rule kind.
16. Add a "Rule preview" thumbnail generator that renders the current canvas to a 160x100 PNG on save and shows it in the Rules list and Project rule chain.
17. Unify empty states across Settings, Rules list, Rules editor, and Projects list into one `<EmptyState>` component with icon slot, headline, body, and primary CTA.
18. Add a Command Palette entry per settings subsection ("Open Camera settings", "Open Shortcuts", etc.) via `onCommand` bus so cmd/ctrl-K jumps directly.
19. A11y pass across Settings + Rules: verify every radiogroup, checkbox, and stepper has label association, `aria-describedby` for helper text, focus-visible rings on all interactive chips, and no non-button divs handling click.
20. Playwright visual regression: add `tests/visual/settings-index.spec.ts`, `tests/visual/settings-camera.spec.ts`, `tests/visual/setup-rules-list.spec.ts`, `tests/visual/rules-editor-toolbar.spec.ts` under 1% tolerance, dark + light themes, seeded IndexedDB.

## Verification

- Build passes (`tsgo --noEmit`) after each step.
- New components have unit tests where they hold logic (SavedBadge relative time, retention stepper clamp, shortcut conflict detection).
- Playwright visual specs land green on the first baseline run and stay stable across two consecutive runs.
- Manual pass: navigate every settings subsection, every rules screen, and the projects list on both themes; no overflow, no duplicated headers, no dead links.
- Version bumped once per landed step (minor), release notes updated, README pin refreshed.

## Appended from prior pending tasks

None routed into this plan. Prior pending plans (`29`, `35`, `36`, `40`, `41`, `44`, `49`, `50`, `51`, `52`, `58`, `59`, `61`, `62`, `63`, `79`, `80`) remain in `.lovable/plans/pending/` and are tracked independently; this plan is scoped strictly to Settings + Rules + adjacent-page polish.
