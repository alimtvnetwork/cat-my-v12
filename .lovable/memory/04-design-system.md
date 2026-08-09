# Design System (from spec/07-design-system + spec/17-consolidated-guidelines/07)

## Non-negotiables

1. **Variable-first** — every color/spacing/radius/shadow comes from a CSS custom property. No hardcoded hex, no arbitrary Tailwind values in components.
2. **Semantic tokens** — name by purpose (`--primary`, `--accent`, `--muted`), never by value (`--purple`).
3. **HSL color model** in canonical spec; this project uses `oklch()` in Tailwind v4 `@theme` (equivalent semantic contract).
4. **Dark/light parity** — every token defined for both themes; components never branch on theme.
5. **CSS3 motion only** — no JS animation libraries.
6. **Portability** — tokens must work with any CSS-capable framework.

## This project's implementation

- Tokens live in `src/styles.css` under `@theme inline` — palette namespace is `--ca-*` (Control Automation); `hmi-*` names are utility/spacing aliases, not palette tokens.
- Do NOT create `tailwind.config.js` — Tailwind v4 CSS-first.
- Fonts loaded via `<link>` in `src/routes/__root.tsx`, never `@import` in CSS.
- 4px base grid; fixed chrome heights: titlebar 32, action header 40, tool ribbon 72, bottom bar 44.
- Typography: Inter body, JetBrains Mono for tabular numbers (`hmi-tabular`).

## Cross-links

- Canonical: `spec/07-design-system/00-overview.md`
- Condensed: `spec/17-consolidated-guidelines/07-design-system.md`
- App-specific: `spec/24-app-ui-design-system/`
- Project brief: `mem://design/hmi-brief`, tokens `mem://design/hmi-tokens`

## Plan 30 QA evidence (v3.74.0, 2026-07-15)

Ship-gate reports for the editor design system (per `spec/24-app-ui-design-system/08-testing.md`):

| Gate                                            | Report                                                                                                        | Status                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Unit: coords + hit-test + undo + math-evaluator | `tests/unit/editor-coords.test.ts`, `tests/unit/editor-hit-test.test.ts`, `tests/unit/math-evaluator.test.ts` | 28/28 green                                  |
| Persistence (S-1, K-1/K-2, E-1/E-6)             | `tests/reports/e2e-editor-persistence.json`                                                                   | Passed                                       |
| Perf p95 with 200 seeded rules (C-8)            | `tests/reports/e2e-editor-perf.json`                                                                          | Passed                                       |
| Axe WCAG AA, zero color-contrast on /setup\*    | `tests/reports/a11y-axe-editor.json`                                                                          | Passed                                       |
| Keyboard-only pass (WCAG 2.1.1)                 | `tests/reports/e2e-editor-keyboard.json`                                                                      | Passed                                       |
| Visual snapshots @ 1440x900 + 1024x768          | `tests/reports/visual/` + `tests/reports/e2e-editor-visual.json`                                              | Passed (6 baselines, maxDiffPixelRatio 0.01) |

Test hooks entrypoint: `src/lib/editor/test-hooks.ts` (opt-in via `?e2e=1` or `VITE_EDITOR_E2E=1`).

## Plan 31 QA evidence (v3.89.0, 2026-07-15)

Pre-93 panel gaps closed. Reports extended to cover the four resolver-mounted panels (number, color, blob, pattern):

| Gate                                                      | Report                                       | Status                                    |
| --------------------------------------------------------- | -------------------------------------------- | ----------------------------------------- |
| Unit: v1 -> v2 rule migration                             | `tests/unit/editor-migrate-v1-to-v2.test.ts` | Green                                     |
| Keyboard per-panel first-focusable                        | `tests/reports/e2e-editor-keyboard.json`     | Passed (4/4 panels)                       |
| Axe WCAG AA per panel                                     | `tests/reports/a11y-axe-editor.json`         | Passed (zero contrast)                    |
| Visual per-panel snapshots @ 1440x900 + 1024x768          | `tests/reports/visual/panel-*.png`           | Baselines seeded (maxDiffPixelRatio 0.01) |
| Persistence round-trip via `roundTrip()` hook             | `tests/reports/e2e-editor-persistence.json`  | Passed                                    |
| Perf p95 with `seedMix(196, [number,color,blob,pattern])` | `tests/reports/e2e-editor-perf.json`         | Passed (<= 20 ms p95, <= 33 ms max)       |

Subtasks: SS-01 gap matrix, SS-02 schema migration, SS-03 panel token map, SS-04 test-hook contract under `.lovable/plans/subtasks/31-pre-93-panel-gaps-completion/`.

PatternEdge panel + `setPatternEdge` hook: landed under Plan 32 (v3.443.0). SG-31-01 closed; DOM selector `data-panel-controller="pattern-edge"` matches spec 05-rule-controller.md.

## Plan 73 closeout tokens (v3.507.0, 2026-07-18)

New semantic token added during Plan 73 a11y remediation (step 41b):

- `--ca-on-primary` (oklch(0.16 0.02 300)) plus `--color-ca-on-primary` alias. Purpose: WCAG AA compliant ink for any element painted on `--ca-primary` fills. Use `text-ca-on-primary` (never `text-ca-chrome-ink` / `text-white`) on primary CTAs.
- Active-state pill pattern for tinted-primary backgrounds: `border-ca-primary/60 bg-ca-primary/25 text-ca-ink` (see `src/components/nav/FavoritesBar.tsx`). Contrast 4.13:1, AA pass.

Closed issues (17 to 26) referencing this token / pattern:

- 17 menu-hover-jitter-and-padding, 19 rules-editor-program-panel-and-layer-arrow, 20 tools-collapse-chevron-unprofessional, 21 panels-not-draggable-floatable, 23 home-screen-steps-terrible, 25 worker-notice-cut-and-poor-error-visualization, 26 ui-seed-values-not-facaded. All `Status: closed` as of v3.506.0; regression coverage via `tests/e2e/axe_a11y.py` (WCAG2 AA, 8 routes, zero violations) and Plan 69 visual baselines.

Rule reinforced: never hardcode a foreground color on a primary-tinted surface; pick the matching `-on-*` token or add one to `src/styles.css` under `@theme inline`.
