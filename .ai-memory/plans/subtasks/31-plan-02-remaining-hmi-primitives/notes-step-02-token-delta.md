# Plan 31 Step 2 — Token delta: spec/24 vs src/styles.css

Recorded: 2026-07-15

## Missing tokens (must land at Plan 31 Step 26 / primitive migration)

| Token           | Spec ref              | Purpose                        |
| --------------- | --------------------- | ------------------------------ |
| --canvas-bg     | 01-foundations.md L46 | Workspace surface behind image |
| --overlay-line  | L47                   | Default SVG overlay stroke     |
| --rule-idle     | L48                   | Unselected shape outline       |
| --rule-hover    | L49                   | Hover shape outline            |
| --rule-selected | L50                   | Active shape outline + handle  |
| --rule-error    | L51                   | Validation-fail outline        |
| --font-display  | L52                   | Ubuntu display family          |

## Drift

- src/styles.css:88 --font-hmi -> "Inter", ... . spec/24 L24 requires Poppins. Fix in Plan 31 Step 6 (link tag) + primitive migrations.

## Present + correct

--ca-bg, --ca-panel, --ca-panel-2, --ca-border, --ca-chrome, --ca-chrome-ink,
--ca-ink, --ca-ink-muted, --ca-viewport, --ca-primary, --ca-select,
--ca-ok, --ca-ng, --ca-warn, --ca-focus-ring, --ca-scrim,
--shadow-hmi-panel/modal/popover/glow, --text-hmi-title/header/body/tile/counter/badge/caption,
--spacing-hmi-1/2/3/4/6/8 + titlebar/actionbar/ribbon/bottombar,
--font-hmi-mono.

## Notes

- --ca-focus-ring already covers Plan 31 Step 26 --ca-focus need; rename not required.
- --spacing-hmi-5 and --spacing-hmi-7 are absent; spec scale lists 8 slots. Add only if a primitive needs them.
