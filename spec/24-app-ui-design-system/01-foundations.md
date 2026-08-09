# 01 — Foundations

**Version:** 1.0 (draft)  
**Owner:** Plan 30 (App UI — Rule-based Editor Revamp)  
**Depends on:** `../_notes/token-inventory.md`

---

## Purpose

Single source of truth for the tokens, typography, spacing, elevation, motion, iconography, and a11y baseline used by every other file in this spec set (`02-layout`, `03-canvas`, `04-rule-layers`, `05-rule-controller`, `06-state-persistence`, `07-errors-logging`, `08-testing`).

Every other file references tokens here by name, never by value. No file may introduce new tokens; only this file adds them, and only under the "New tokens" section below.

---

## Typography

Two font families. Nothing else.

| Role    | Token                             | Family     | Weights               | Applied to                                |
| ------- | --------------------------------- | ---------- | --------------------- | ----------------------------------------- |
| Display | `--font-display`                  | Ubuntu     | 400 / 500 / 700       | `h1`, `h2`, `h3`, `h4`, `h5`, `h6`        |
| Body    | `--font-hmi` (aliased to Poppins) | Poppins    | 300 / 400 / 500 / 600 | `body`, all UI text                       |
| Mono    | `--font-hmi-mono`                 | (existing) | 400 / 500             | OCR expected text, math expression editor |

Fonts are loaded via `<link rel="preconnect">` + `<link rel="stylesheet">` in `src/routes/__root.tsx` head (impl step 51). No `@import url(...)` in `src/styles.css` — Tailwind v4 Lightning CSS cannot resolve remote imports.

Sizes reuse `--text-hmi-caption / -body / -badge / -header / -title / -tile / -counter` from `src/styles.css`. These existing `--text-hmi-*` values are the canonical app UI size scale. Do not introduce `--fs-*` aliases, and do not use raw Tailwind text sizes inside editor UI once implementation starts.

---

## Naming (Plan 64)

Two shapes for every domain identifier.

| Layer                                       | Shape                       | Example                                           |
| ------------------------------------------- | --------------------------- | ------------------------------------------------- |
| DB columns, enum values, TS union members   | PascalCase (single token)   | `RectangleOcr`, `FlawDetection`, `BarcodeQr`      |
| JSON/YAML export keys                       | PascalCase                  | `"kind": "RectangleOcr"`                          |
| UI labels, breadcrumb tokens, dialog titles | Title Case with spaces      | `Rectangle OCR`, `Flaw Detection`, `Barcode / QR` |
| Route path segments                         | kebab-case                  | `/setup/rules/rule-sets`                          |
| CSS custom properties                       | kebab-case with `--` prefix | `--menu-item-px`                                  |

Hard rules:

- Never render a raw PascalCase or snake_case token to the user. Route every displayed enum through a `formatLabel(pascal)` helper (Plan 64 step 91) that maps PascalCase to Title-Case-with-spaces and applies known acronyms (`OCR`, `QR`, `SVG`, `JS`, `AI`).
- Never introduce a domain term in only one shape. Every new enum member ships with (a) PascalCase storage token, (b) Title-Case UI label, and (c) an entry in `formatLabel`'s acronym map if applicable.
- Underscores are banned in every UI-visible string. Underscores in identifiers are banned in TS domain code; use PascalCase or camelCase there. Snake_case is allowed only in Python and SQL, and never crosses into the API surface.

---

## Color tokens

### Reused (do not redefine)

Application surfaces: `--ca-bg`, `--ca-panel`, `--ca-panel-2`, `--ca-viewport`, `--ca-chrome`, `--ca-scrim`.  
Ink: `--ca-ink`, `--ca-ink-muted`, `--ca-chrome-ink`.  
State: `--ca-ok`, `--ca-warn`, `--ca-ng`, `--ca-primary`, `--ca-select`, `--ca-focus-ring`, `--ca-border`.  
shadcn semantic: `--background`, `--foreground`, `--primary`, `--destructive`, `--border`, `--ring`, `--muted`, `--accent`.

### New tokens (exactly 7 — any 8th is a review failure)

| Token             | Purpose                             | Light                     | Dark                   |
| ----------------- | ----------------------------------- | ------------------------- | ---------------------- |
| `--canvas-bg`     | Workspace surface behind the image  | oklch(0.16 0.01 240)      | oklch(0.10 0.01 240)   |
| `--overlay-line`  | Default SVG overlay stroke          | oklch(0.95 0 0 / 0.55)    | oklch(0.95 0 0 / 0.55) |
| `--rule-idle`     | Shape outline, unselected           | var(`--ca-ink-muted`)     | var(`--ca-ink-muted`)  |
| `--rule-hover`    | Shape outline on hover              | var(`--ca-primary`)       | var(`--ca-primary`)    |
| `--rule-selected` | Active shape outline + handle fill  | var(`--ca-select`)        | var(`--ca-select`)     |
| `--rule-error`    | Shape outline when validation fails | var(`--ca-ng`)            | var(`--ca-ng`)         |
| `--font-display`  | Ubuntu family reference             | `"Ubuntu", ui-sans-serif` | same                   |

Wired in `src/styles.css` under `@theme` (impl step 54). No hex literals in components; use `bg-canvas-bg`, `stroke-rule-selected`, etc. via Tailwind v4 theme mapping.

---

## Spacing scale

Reuse `--spacing-hmi-1..8` verbatim (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64). Chrome slots reuse `--spacing-hmi-titlebar / -actionbar / -bottombar / -ribbon`. No new spacing tokens.

---

## Elevation

Four tiers, mapped 1:1 to existing shadow tokens.

| Tier         | Use                                               | Token                  |
| ------------ | ------------------------------------------------- | ---------------------- |
| 0 (flat)     | Canvas image, workspace body                      | none                   |
| 1 (raised)   | Right rail, tab strip, status strip               | `--shadow-hmi-panel`   |
| 2 (floating) | Tool ribbon, lighting drawer, kind-picker popover | `--shadow-hmi-popover` |
| 3 (modal)    | Confirm-delete dialog, program-picker             | `--shadow-hmi-modal`   |

`--shadow-hmi-glow` reserved for focus emphasis on selected shape handles.

---

## Motion

Reuse `animate-fade-in` + `animate-scale-in` from `spec/07-design-system/06-motion-transitions.md`.

- Panel open / kind switch: fade + scale, **200 ms**, ease `cubic-bezier(0.2, 0, 0, 1)`.
- Shape create / delete: fade only, 150 ms.
- `prefers-reduced-motion: reduce`: all transitions collapse to `duration: 1ms` (impl step 55 verifies).

No new motion tokens.

---

## Iconography (lucide)

One icon per rule kind. The RuleList (`04-rule-layers`) and kind picker (`05-rule-controller`) reference this table by kind, not by icon name.

| Rule kind | Icon        | Notes                |
| --------- | ----------- | -------------------- |
| Presence  | `Eye`       | positive detection   |
| Absence   | `EyeOff`    | negative detection   |
| OCR       | `Type`      | text extraction      |
| TextMatch | `Regex`     | pattern / regex      |
| Number    | `Hash`      | numeric compare      |
| Math      | `Sigma`     | expression evaluator |
| Color     | `Palette`   | color / deltaE       |
| Pattern   | `Image`     | template match       |
| Edge      | `Waypoints` | edge detect          |
| Blob      | `Circle`    | blob detect          |

Editor chrome icons: `MousePointer2` (select), `Square` (rect), `CircleDashed` (circle), `Pentagon` (polygon), `Undo2` / `Redo2`, `Lock` / `LockOpen`, `Eye` / `EyeOff` (visibility toggle — same glyph reused, different semantics from Presence/Absence rules).

---

## A11y baseline (WCAG 2.1 AA)

- Every interactive element renders `--ca-focus-ring` via `:focus-visible`, min 2 px, offset 2 px.
- Body text contrast ≥ 4.5:1 against its own surface token (verified per token pair in dark + light).
- Overlay strokes ≥ 3:1 contrast against `--canvas-bg`.
- Every non-decorative icon has an `aria-label` or an adjacent visible label; decorative icons carry `aria-hidden="true"`.
- Polygon drawing announces vertex count via `aria-live="polite"` (impl step 68).
- No motion-only feedback; every state change also updates a text label.

Verification gate: Axe zero color-contrast violations on `/setup`, `/setup/roi`, `/setup/reference` (plan step 96).

---

## Acceptance

- Every token used by `02-layout` through `08-testing` is defined here or in `spec/07-design-system/`.
- No file in this set introduces a new custom property.
- The 7 net-new tokens listed above appear in `src/styles.css @theme` after impl step 54, and every editor component references them via Tailwind classes, never hex literals.
- Reduced-motion audit passes (impl step 55).
- Axe gate on `/setup*` is zero (plan step 96).
