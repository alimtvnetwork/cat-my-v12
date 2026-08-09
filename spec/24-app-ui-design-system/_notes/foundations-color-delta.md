# Foundations — Color Token Delta Report

**Version:** 1.0  
**Updated:** 2026-07-14  
**Sources:** `spec/24-app-ui-design-system/01-foundations.md` (target) vs `src/styles.css` (live) + component/route scan.  
**Purpose:** freeze the delta between target foundations and live tokens BEFORE implementation (plan 30 step 36+), so token refactor PRs cannot silently regress plan 24's zero-hardcoded-hits gate.

---

## Baseline scans

| Scan                                                                | Result |
| ------------------------------------------------------------------- | ------ |
| Hardcoded `#hex` / `rgb()` / `hsl()` in `src/components/**`         | 0 hits |
| Hardcoded `#hex` / `rgb()` / `hsl()` in `src/routes/**`             | 0 hits |
| Live `--ca-*` tokens declared in `src/styles.css` `:root` + `.dark` | 16     |
| Live shadcn `--color-*` mappings via `@theme inline`                | 26     |

**Baseline is clean.** Zero-hit gate from plan 24 is currently satisfied at project v3.28.0.

---

## Token inventory (live)

### Semantic surface family (Control Automation HMI, locked v0.20.0)

| Token             | Purpose                                      |
| ----------------- | -------------------------------------------- |
| `--ca-bg`         | Root canvas background                       |
| `--ca-panel`      | Primary panel surface (left nav, right rail) |
| `--ca-panel-2`    | Secondary/nested panel surface               |
| `--ca-border`     | Panel + divider strokes                      |
| `--ca-chrome`     | Header/chrome band                           |
| `--ca-chrome-ink` | Ink on chrome                                |
| `--ca-ink`        | Primary text                                 |
| `--ca-ink-muted`  | Secondary text                               |
| `--ca-viewport`   | Canvas/image viewport background             |
| `--ca-primary`    | Brand primary (actionable)                   |
| `--ca-select`     | Selection highlight (rules, shapes)          |
| `--ca-ok`         | OK / pass status                             |
| `--ca-ng`         | NG / fail status                             |
| `--ca-warn`       | Warning status                               |
| `--ca-focus-ring` | Keyboard focus ring                          |
| `--ca-scrim`      | Modal/overlay scrim                          |

### Radii family

`--radius`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-2xl`, `--radius-3xl`, `--radius-4xl`.

---

## Delta vs `01-foundations.md`

| #   | Foundations target                       | Live token                                                                                                              | Status      | Action                                                                                                                                            |
| --- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Semantic surfaces family                 | `--ca-bg`, `--ca-panel`, `--ca-panel-2`, `--ca-border`, `--ca-chrome`, `--ca-chrome-ink`, `--ca-viewport`, `--ca-scrim` | ✅ present  | none                                                                                                                                              |
| 2   | Ink family                               | `--ca-ink`, `--ca-ink-muted`                                                                                            | ✅ present  | none                                                                                                                                              |
| 3   | Status family                            | `--ca-ok`, `--ca-ng`, `--ca-warn`                                                                                       | ✅ present  | none                                                                                                                                              |
| 4   | Brand + interaction                      | `--ca-primary`, `--ca-select`, `--ca-focus-ring`                                                                        | ✅ present  | none                                                                                                                                              |
| 5   | Radii scale                              | `--radius*` (8 steps)                                                                                                   | ✅ present  | none                                                                                                                                              |
| 6   | Motion tokens (duration/easing)          | **not declared as CSS vars**                                                                                            | ⚠️ gap      | Add `--motion-fast`, `--motion-base`, `--motion-slow` + easing tokens in step 23 deep-dive (motion tuning). Non-blocking for step 36 canvas work. |
| 7   | Elevation tokens (shadow scale)          | Individual utility use only                                                                                             | ⚠️ gap      | Introduce `--elevation-1..4` variables tied to shadcn `--shadow-*` in step 24 deep-dive.                                                          |
| 8   | Typography scale (font-size step tokens) | `--text-hmi-title/header/body/tile/counter/badge/caption`                                                               | ✅ resolved | Existing `--text-hmi-*` tokens are canonical. No `--fs-*` aliases and no raw Tailwind text sizes in editor implementation.                        |

**Blocking gaps:** 0.  
**Non-blocking gaps (motion/elevation/typography variables):** 0 after v3.31.0.

---

## Regression guards (must run in CI before every implementation PR under plan 30)

1. `rg -nE "#[0-9a-fA-F]{3,8}\b|\brgb\(|\bhsl\(" src/components src/routes` → must return **0 hits**.
2. `rg -n "\bstyle=\{\{[^}]*(color|background|border)" src/components src/routes` → each hit must resolve to `var(--...)`.
3. `rg -n "--ca-" src/styles.css | wc -l` ≥ 16 (do not remove existing tokens without a spec bump).
4. `rg -n "text-(xs|sm|base|lg|xl|2xl|3xl)" src/components/editor src/routes/setup.tsx src/routes/setup.roi.tsx src/routes/setup.reference.tsx` → 0 hits once editor implementation starts; use `text-hmi-*` classes.

Any regression in these guards blocks the PR and must be resolved before merge.

---

## Sign-off

- Baseline clean at project v3.28.0.
- Delta report captures every gap; implementation may proceed on canvas/store/controller work under the guards above.
- Foundations-level token gaps are closed. Implementation may proceed without introducing new typography aliases.
