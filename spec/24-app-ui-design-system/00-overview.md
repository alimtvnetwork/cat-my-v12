# App UI — Design System

**Version:** 3.31.0  
**Updated:** 2026-07-14  
**AI Confidence:** Draft  
**Ambiguity:** None

---

## Keywords

`app-ui` · `app-design-system` · `theming` · `components` · `layout`

---

## Scoring

| Criterion                | Status |
| ------------------------ | ------ |
| `00-overview.md` present | ✅     |
| AI Confidence assigned   | ✅     |
| Ambiguity assigned       | ✅     |
| Keywords present         | ✅     |
| Scoring table present    | ✅     |

---

## Purpose

Application-specific UI and design-system specifications for whatever project this repo ships — web app, Chrome extension, CLI, plugin, mobile app, etc. Covers component patterns, theming decisions, layout conventions, and visual standards specific to this application.

---

## Domain Vocabulary (frozen by Plan 64, pending Q1)

Use these exact nouns in UI, spec, DB, and code. The prior term "Recipe" is deprecated and pending removal (see `.lovable/ambiguity-questions/01-ui-v2-open-questions.md` Q1).

| Term     | Meaning                                                                   |
| -------- | ------------------------------------------------------------------------- |
| Rule Set | Top-level aggregate. Contains many Rules. Cloneable (Reference/Snapshot). |
| Rule     | Leaf inspection step (Rectangle OCR, Presence, Flaw Detection, ...).      |
| Category | Optional grouping applied to a Project; auto-applies its Rule Sets.       |
| Project  | Runtime binding of Camera Settings + Lighting + Rule Sets + Categories.   |
| Run      | One execution of a Project against captured images.                       |

Storage form is PascalCase (`RuleSet`, `RectangleOcr`, `FlawDetection`). UI form is Title-Case-with-spaces (`Rule Set`, `Rectangle OCR`, `Flaw Detection`). Never expose snake_case or raw enum tokens in labels.

---

## Document Inventory

| #   | File                      | Purpose                                                                        |
| --- | ------------------------- | ------------------------------------------------------------------------------ |
| 00  | `00-overview.md`          | This document. Purpose, inventory, plan 24/30 compliance.                      |
| 01  | `01-foundations.md`       | Design tokens: color, typography, spacing, motion, elevation.                  |
| 02  | `02-layout.md`            | Global shell: header, left nav, right rail, canvas region.                     |
| 03  | `03-canvas.md`            | Canvas workspace: coord model, zoom/pan, drawing, selection, manipulation.     |
| 04  | `04-rule-layers.md`       | Rule List rail: anatomy, actions, keyboard model, selection contract, reorder. |
| 05  | `05-rule-controller.md`   | Rule Controller mount contract, kind picker, per-kind field matrix.            |
| 06  | `06-state-persistence.md` | Zustand store shape, action API, JSON persistence, migrations, undo/redo.      |
| 07  | `07-errors-logging.md`    | Error registry (`E_UI_*`/`W_UI_*`/`I_UI_*`), log-line format, boundaries.      |
| 08  | `08-testing.md`           | Unit + Playwright + visual test contract, perf/a11y gates, traceability.       |

---

## Plan 24 compliance (v2.0.6, sealed at v2.62.0)

Baseline: `.lovable/memory/v2/plan24/00-inventory.md` (pre-sweep raw counts).
Evidence: `.lovable/memory/v2/plan24/40-evidence.md`; screens: `.lovable/memory/v2/plan24/screens/`.

### Hardcoded token hits in `src/components/**` and `src/routes/**`

| Scope                                                                        | Before (v2.60.0) | After (v2.62.0) |
| ---------------------------------------------------------------------------- | ---------------- | --------------- |
| `src/components/hmi/**`                                                      | 0                | 0               |
| `src/components/ui/**` (drawer, dialog, sidebar, alert-dialog, sheet, chart) | 12               | 0               |
| `src/routes/setup.tsx`                                                       | 3                | 0               |
| `src/routes/settings.license.tsx`                                            | 4                | 0               |
| **Total**                                                                    | **19**           | **0**           |

### Axe WCAG 2.1 AA (`tests/reports/a11y-axe.json`, ruleset `wcag2a+wcag2aa`)

| Route               | Before                                           | After |
| ------------------- | ------------------------------------------------ | ----- |
| `/`                 | 0                                                | 0     |
| `/setup`            | 5 (color-contrast on disabled ToolTile children) | 0     |
| `/run`              | 0                                                | 0     |
| `/errors`           | not audited                                      | 0     |
| `/ops`              | not audited                                      | 0     |
| `/settings/license` | not audited                                      | 0     |

Root cause of `/setup` regressions: `opacity-40` on non-actionable disabled `ToolTile` buttons dropped muted text contrast below 4.5:1. Fix: `aria-hidden` + `tabIndex=-1` on disabled tiles so decorative placeholders are excluded from the AT tree; see `src/routes/setup.tsx:263-273`.

---

## Cross-References

- [Design System (Core)](../07-design-system/00-overview.md) — Foundational design system spec
- [App](../21-app/04-overview.md) — App-specific features and workflows
- [Consolidated Design System](../17-consolidated-guidelines/07-design-system.md) — Consolidated summary
- [UI Improvements V2 Enhancement (reconciled status)](./99d-ui-improvements-v2-enhancement.md) - single source of truth for what the V2 stream shipped, what is pending, and what is ambiguous. Search token: `v2-enhancement`.
- [UI Seed Facade (Rule 53)](../21-app/53-ui-seed-facade.md) - developer pointer: any UI surface that consumes seed data (categories, rule templates, tool presets, sample images, programs) MUST go through `useSeedSlice` / `useSeedBundle`. Direct imports from `src/lib/seed/data/**` outside `src/lib/seed/**` are forbidden. Canonical test wrapper: `<SeedProvider facade={new MemoryUiSeedFacade(fixture)}>` (see `src/lib/projects/__tests__/useCategoryOptions.test.tsx`).

---

_App UI — Design System — created 2026-04-10, renumbered 23→24 on 2026-04-16, slug renamed `24-app-design-system-and-ui` → `24-app-ui-design-system` on 2026-04-26_

---

## Verification

_Auto-generated section — see `spec/24-app-ui-design-system/97-acceptance-criteria.md` for the full criteria index._

### AC-ADS-000: App UI / design-system conformance: Overview

**Given** Scan app UI for raw colors and untokenized spacing; render Storybook (or equivalent) snapshot suite.  
**When** Run the verification command shown below.  
**Then** All components consume semantic tokens; snapshot diff is empty in light and dark themes.

**Verification command:**

```bash
npm run lint && npm run test
```

**Expected:** exit 0. Any non-zero exit is a hard fail and blocks merge.

_Verification section last updated: 2026-04-21_
