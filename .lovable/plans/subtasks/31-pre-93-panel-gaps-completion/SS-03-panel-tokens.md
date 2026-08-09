# SS-03 Panel Token Map

Slug: panel-tokens
Parent: 31-pre-93-panel-gaps-completion
Status: completed
Created: 2026-07-15
Completed: 2026-07-15 (Plan 31 step 23)

Verified against `src/components/editor/panels/*.tsx` on 2026-07-15. Tokens
enumerated by `grep -hoE '(ca-[a-z0-9-]+|hmi-[a-z0-9-]+)' src/components/editor/panels/*.tsx`.
No hex literals present. No `text-white` or `bg-black` shortcuts.

## Semantic tokens (design system, `src/styles.css`)

| Surface / role   | Token               | Used by                                            |
| ---------------- | ------------------- | -------------------------------------------------- |
| Panel background | `bg-ca-panel`       | Number, Color, Blob, Reference, Lighting           |
| Nested surface   | `bg-ca-panel-2`     | ReferenceAssetPanel thumbnail, ColorPanel swatches |
| Border           | `border-ca-border`  | all panels (1px)                                   |
| Body ink         | `text-ca-ink`       | headings and inputs                                |
| Muted ink        | `text-ca-ink-muted` | helper text, unit suffix, legacy placeholder       |
| Accent           | `text-ca-accent`    | active affordance in LightingDrawer                |
| Danger           | `text-ca-danger`    | `role=alert` messages (min > max, invalid range)   |

## Spacing (HMI scale)

| Slot            | Token                   | Notes                     |
| --------------- | ----------------------- | ------------------------- |
| Row gap         | `gap-hmi-2` / `p-hmi-2` | 8px inter-control spacing |
| Section padding | `p-hmi-3`               | 12px, panel section shell |
| Fine gap        | `gap-hmi-1`             | 4px, label-to-input       |

## Typography

| Slot            | Token              | Notes                                                    |
| --------------- | ------------------ | -------------------------------------------------------- |
| Section heading | `text-hmi-heading` | Ubuntu, 16px                                             |
| Body / label    | `text-hmi-body`    | Poppins, 13px                                            |
| Numeric input   | `text-hmi-caption` | JetBrains Mono, tabular figures on `<input type=number>` |

## Focus and radius

Focus ring is inherited from shadcn primitives (Input, Slider, Button) which
already bind `--ca-focus-ring` at the base layer, so panels do not re-declare
it. Radius follows the panel primitive default. No overrides required.

## Enforcement

- `spec/24-app-ui-design-system/08-testing.md` C-3 forbids hex literals in
  components; grep gate stays green.
- `tests/e2e/editor_a11y.py` Axe sweep (Plan 31 step 19) covers all four
  resolver panels; zero contrast violations confirms the token map above
  meets WCAG AA against the current theme.
