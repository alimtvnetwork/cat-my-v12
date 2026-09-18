# Plan 36 / Plan 62 theme token map (v3.485.0)

## Source-of-truth status

No `src-v3/` tree exists in the repo (see `15-v3-inventory.md`). The
"migration" for Plan 62 therefore reduces to: document the already-landed
HMI token surface in `src/styles.css` and shrink the hardcoded-color
utility count in `src/`. No new tokens were added; the existing surface
is already the target.

## Landed tokens (all under `@theme inline` in `src/styles.css`)

### Color (Control Automation HMI, `--ca-*`)

| Semantic role     | Token             | Utility class        |
| ----------------- | ----------------- | -------------------- |
| App background    | `--ca-bg`         | `bg-ca-bg`           |
| Panel surface     | `--ca-panel`      | `bg-ca-panel`        |
| Panel surface 2   | `--ca-panel-2`    | `bg-ca-panel-2`      |
| Border            | `--ca-border`     | `border-ca-border`   |
| Chrome background | `--ca-chrome`     | `bg-ca-chrome`       |
| Body ink          | `--ca-ink`        | `text-ca-ink`        |
| Muted ink         | `--ca-ink-muted`  | `text-ca-ink-muted`  |
| Viewport fill     | `--ca-viewport`   | `bg-ca-viewport`     |
| Primary accent    | `--ca-primary`    | `bg-ca-primary`      |
| On-primary        | `--ca-on-primary` | `text-ca-on-primary` |
| Selection         | `--ca-select`     | `bg-ca-select`       |
| OK status         | `--ca-ok`         | `text-ca-ok`         |
| NG status         | `--ca-ng`         | `text-ca-ng`         |
| Warn status       | `--ca-warn`       | `text-ca-warn`       |
| Focus ring        | `--ca-focus-ring` | `ring-ca-focus`      |
| Scrim             | `--ca-scrim`      | `bg-ca-scrim`        |

### CLI log severities (Plan 90 step 130)

| Role       | Token               | Utility              |
| ---------- | ------------------- | -------------------- |
| Info line  | `--cli-log-info`    | `text-cli-log-info`  |
| Warn line  | `--cli-log-warn`    | `text-cli-log-warn`  |
| Error line | `--cli-log-error`   | `text-cli-log-error` |
| Debug line | `--cli-log-debug`   | `text-cli-log-debug` |
| Log row bg | `--cli-log-line-bg` | `bg-cli-log-line-bg` |

### Spacing (Plan 87)

`--space-1`..`--space-8` with `--space-scale` multiplier. Legacy
`--spacing-hmi-*` aliases feed `p-hmi-*` / `gap-hmi-*` utilities and stay
in lockstep. Item-row padding tiers: `item-pad-chip`, `item-pad-btn`,
`item-pad-cta`, `item-row-gap`.

### Typography

`--font-display` (Ubuntu/Poppins), `--font-sans` (Poppins),
`--font-hmi`, `--font-hmi-mono`. Sizes: `--text-hmi-title`,
`--text-hmi-header`, `--text-hmi-body`, `--text-hmi-tile`,
`--text-hmi-counter`, `--text-hmi-badge`, `--text-hmi-caption` (all
`clamp()`-scaled).

### Radius

`--radius-sm|md|lg|xl|2xl|3xl|4xl` derived from `--radius`.

### Elevation

`--shadow-hmi-panel`, `--shadow-hmi-modal`, `--shadow-hmi-popover`,
`--shadow-hmi-glow`.

### Fixed grid rows

`--spacing-hmi-titlebar` (2rem), `--spacing-hmi-actionbar` (2.5rem),
`--spacing-hmi-ribbon` (4.5rem), `--spacing-hmi-bottombar` (2.75rem),
`--status-bar-h` (2rem).

## Replacement rules for hardcoded-color offenders

| Hardcoded         | Replace with          |
| ----------------- | --------------------- |
| `text-white`      | `text-ca-ink`         |
| `text-white/NN`   | `text-ca-ink/NN`      |
| `bg-black`        | `bg-ca-bg`            |
| `bg-black/NN`     | `bg-ca-bg/NN`         |
| `border-white/NN` | `border-ca-border/NN` |

Do NOT touch shadcn variant files under `src/components/ui/**`.
