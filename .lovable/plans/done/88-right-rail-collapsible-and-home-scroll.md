# Right rail collapsible sections + home scroll/status bar fix

Slug: right-rail-collapsible-and-home-scroll
Steps: 10
Status: pending
Created: 2026-07-20

## Context

Two related UX defects reported by the user: (1) the homepage does not scroll and its bottom status bar overlaps content; (2) the Rule editor right rail (Preview / Layers / Properties) is a rigid block with no collapse, hide, close, or sub-section minimize controls. This plan makes every right-rail section an independent collapsible/hideable/closable panel, breaks Properties into minimizable sub-groups, persists panel state, and fixes home scroll + status bar layout.

Captured this turn:

- Issue: `.lovable/issues/36-home-no-scroll-and-status-bar.md`
- Issue: `.lovable/issues/37-right-rail-not-collapsible.md`

Primary files: `src/routes/index.tsx`, `src/components/status/StatusBar.*`, `src/components/editor/rail/RightRail.tsx`, `src/components/editor/InspectorSurface.tsx`, `src/components/editor/panels/PropertiesPanel.tsx`, `src/components/editor/panels/LayersPanel.tsx`, `src/components/nav/WindowMenu.tsx`.

## Steps

1. Fix homepage scroll: audit `src/routes/index.tsx` root containers, remove any `overflow-hidden` or fixed `100dvh` that traps content, ensure the scroll region has `min-h-0` + `overflow-y-auto` and reserves `padding-bottom: var(--status-bar-h)` so the fixed status bar never clips content.
2. Turn the bottom status bar into a proper fixed footer: define `--status-bar-h` token in `src/styles.css`, apply it to `<body>` bottom padding on routes that render the bar, and give the bar `position: fixed; inset-inline: 0; bottom: 0; z-index: hmi-status`.
3. Build a reusable `CollapsiblePanelSection` primitive under `src/components/editor/panels/CollapsiblePanelSection.tsx` with header controls: chevron (collapse), eye (hide body but keep header), x (close/remove), grab handle for future DnD. ARIA: `role="region"`, `aria-expanded`, `aria-label`.
4. Add a `useRailPanelState` hook (`src/hooks/useRailPanelState.ts`) that persists per-section `{ collapsed, hidden, closed, order }` to `localStorage` under `hmi.rail.v1`, subscribable via `useSyncExternalStore`. See ./subtasks/88-right-rail-collapsible-and-home-scroll/SS-01-rail-state-shape.md
5. Extract current section headers from `InspectorSurface.tsx` and `LayersPanel.tsx` into thin wrappers that consume `CollapsiblePanelSection`, keeping their existing children unchanged so behaviour is preserved during the wrap.
6. Refactor `RightRail.tsx` to render Preview / Layers / Properties each wrapped in `CollapsiblePanelSection`, driven by `useRailPanelState`; keep existing props stable.
7. Split `PropertiesPanel` into sub-sections (Transform, Appearance, Condition, Validation, Advanced) each using `CollapsiblePanelSection` with independent persisted state under `hmi.rail.properties.v1`. See ./subtasks/88-right-rail-collapsible-and-home-scroll/SS-02-properties-subsections.md
8. Wire the Window menu (`src/components/nav/WindowMenu.tsx`) to list every rail section with a checkbox; toggling restores a closed section and resets `closed=false`. Include "Reset panel layout" action.
9. Add motion + a11y polish: 160ms ease collapse (respecting `prefers-reduced-motion`), inset focus rings on header controls, keyboard: `Enter/Space` toggles collapse, `H` toggles hide, `Delete` closes when header focused.
10. Verification pass: run home scroll Playwright script, capture right-rail screenshots with each combination (all expanded, properties collapsed, layers hidden, preview closed + restored via Window menu), bump minor version, update CHANGELOG and RELEASE_NOTES, pin version in root README.

## Verification

- Home: `tests/e2e/home_route_smoke.py` extended to assert `scrollHeight > clientHeight` and status bar `getBoundingClientRect().bottom === innerHeight`.
- Rail: new `tests/e2e/right_rail_collapsible.py` toggles collapse/hide/close per section, reloads page, asserts persisted state, restores via Window menu.
- Visual: screenshots under `/tmp/browser/plan88/` for each state; compared against baseline.
- Build: `bun run build` green; `tsgo` clean.

## Appended from prior pending tasks

None pulled in this turn (existing pending plans 29-87 remain owned by their own slugs; this plan is scoped strictly to the two reported issues to avoid churn).
