# SS-01 - Palette Lock

**Decision:** Dark Slate (oklch). Locked 2026-07-09, superseded 2026-07-15 to match shipped `src/styles.css` and spec/24-app-ui-design-system/01-foundations.md (dated 2026-07-14). Rationale in `.lovable/plans/subtasks/31-plan-02-remaining-hmi-primitives/notes-step-03-palette-drift.md`.

Status: completed

## Chrome + panel neutrals (oklch, hue 264)

| Token             | oklch                          | Role                       |
| ----------------- | ------------------------------ | -------------------------- |
| `--ca-bg`         | `oklch(0.16 0.006 264)`        | App background             |
| `--ca-panel`      | `oklch(0.21 0.008 264)`        | Panel / ribbon surface     |
| `--ca-panel-2`    | `oklch(0.245 0.009 264)`       | Raised panel / hover       |
| `--ca-border`     | `oklch(0.32 0.010 264)`        | Hairline border (1px)      |
| `--ca-chrome`     | `oklch(0.185 0.008 264)`       | Title bar, action header   |
| `--ca-chrome-ink` | `oklch(0.97 0.003 264)`        | Text on chrome             |
| `--ca-ink`        | `oklch(0.96 0.003 264)`        | Primary text               |
| `--ca-ink-muted`  | `oklch(0.66 0.012 264)`        | Secondary text             |
| `--ca-viewport`   | `oklch(0.11 0.006 264)`        | Camera viewport background |
| `--ca-scrim`      | `oklch(0.08 0.004 264 / 0.72)` | Modal scrim                |

## Semantic accents

| Token             | oklch                  | Role                                             |
| ----------------- | ---------------------- | ------------------------------------------------ |
| `--ca-primary`    | `oklch(0.68 0.17 248)` | Run / primary CTA (electric blue)                |
| `--ca-select`     | `oklch(0.42 0.19 268)` | Selected ROI/tile (deep indigo, white-text safe) |
| `--ca-ok`         | `oklch(0.74 0.17 154)` | Judgment OK (emerald)                            |
| `--ca-ng`         | `oklch(0.66 0.22 22)`  | Judgment NG (signal red)                         |
| `--ca-warn`       | `oklch(0.80 0.16 78)`  | Warning (amber)                                  |
| `--ca-focus-ring` | `oklch(0.68 0.17 248)` | Focus ring (matches primary)                     |

## Rationale

Dark chrome (near-black slate) plus low-chroma panel elevations survive on low-gamut factory panels. Accents (blue/emerald/red/amber) pop against the dark surface without competing with the chrome hue. `--ca-select` moved from amber (#f5c800) to deep indigo so white text on selected tiles stays WCAG AA compliant.

## Cross-links

- Shipped: `src/styles.css:170-185`
- Spec/24 alignment: `spec/24-app-ui-design-system/01-foundations.md` (canvas-bg reuses this hue)
- Prior light-palette proposal archived: this file (git history)
