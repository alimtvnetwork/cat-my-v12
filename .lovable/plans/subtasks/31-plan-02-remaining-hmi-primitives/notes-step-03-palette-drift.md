# Plan 31 Step 3 - SS-01 palette-lock verification

Recorded: 2026-07-15
Status: DRIFT DETECTED

## SS-01 lock (2026-07-09)

Palette: "High-Contrast Neutral" (light). See
.lovable/plans/subtasks/02-control-automation-redesign/ss-01-palette-lock.md

## Current src/styles.css (lines 170-185)

Palette: dark oklch slate. Every neutral inverted vs SS-01.

## Drift matrix

| Token           | SS-01 hex       | current oklch                 | direction              |
| --------------- | --------------- | ----------------------------- | ---------------------- |
| --ca-bg         | #fafafa         | oklch(0.16 0.006 264)         | LIGHT to DARK          |
| --ca-panel      | #e4e4e7         | oklch(0.21 0.008 264)         | LIGHT to DARK          |
| --ca-panel-2    | #f4f4f5         | oklch(0.245 0.009 264)        | LIGHT to DARK          |
| --ca-border     | #a1a1aa         | oklch(0.32 0.010 264)         | LIGHT to DARK          |
| --ca-chrome     | #3f3f46         | oklch(0.185 0.008 264)        | mid-dark to near-black |
| --ca-chrome-ink | #fafafa         | oklch(0.97 0.003 264)         | equivalent             |
| --ca-ink        | #111111         | oklch(0.96 0.003 264)         | BLACK to WHITE         |
| --ca-ink-muted  | #52525b         | oklch(0.66 0.012 264)         | dark to mid-light      |
| --ca-viewport   | #0a0a0a         | oklch(0.11 0.006 264)         | equivalent             |
| --ca-primary    | #1e78c8         | oklch(0.68 0.17 248)          | close                  |
| --ca-select     | #f5c800 (amber) | oklch(0.42 0.19 268) (indigo) | HUE FLIP               |
| --ca-ok         | #2ea043         | oklch(0.74 0.17 154)          | close                  |
| --ca-ng         | #d13438         | oklch(0.66 0.22 22)           | close                  |
| --ca-warn       | #e0a800         | oklch(0.80 0.16 78)           | close                  |

## Blocker for Plan 31 Step 4

Cannot mark accepted variant until user chooses:

- Option A: honor SS-01 lock, rewrite palette to light "High-Contrast Neutral" (hex to oklch conversion).
- Option B: promote current dark palette to the SS-01 lock, update ss-01-palette-lock.md and ss-01-palette-options.md accordingly.

Semantic accent --ca-select is the sharpest divergence (amber vs indigo). Requires explicit call.
