# SS-12 — Design Token Export

Ready-to-paste CSS variables derived from SS-04 (palette), SS-05 (type),
SS-07 (icon rules), SS-08 (grid/spacing). These are documentation tokens —
they get merged into `src/styles.css` `@theme` when the build phase begins
(not now; SS-11 R3 scope discipline).

Values use hex for readability; convert to `oklch()` at import time to
match the existing template convention.

## 1. Color tokens

```css
:root {
  /* Chrome (window frames, title bar) */
  --hmi-chrome-900: #2b2b2b; /* deep bezel / titlebar text */
  --hmi-chrome-800: #3a3a3a;
  --hmi-chrome-700: #4a4a4a; /* app title bar background */
  --hmi-chrome-600: #6b6b6b;

  /* Panels (tool config, side rails) */
  --hmi-panel-100: #f2f2f2;
  --hmi-panel-200: #e6e6e6;
  --hmi-panel-300: #d4d4d4; /* default panel bg */
  --hmi-panel-400: #b8b8b8; /* panel borders */

  /* Viewport (camera canvas) */
  --hmi-viewport-bg: #1a1a1a;
  --hmi-viewport-grid: #2a2a2a;

  /* Functional accents */
  --hmi-accent-primary: #1e78c8; /* Run / primary action */
  --hmi-accent-primary-hover: #2a8ad8;
  --hmi-accent-select: #f5c800; /* selected tool / anchor */
  --hmi-accent-select-strong: #f39c00;

  /* Status */
  --hmi-status-ok: #2ea043;
  --hmi-status-ng: #d13438;
  --hmi-status-warn: #e8a317;
  --hmi-status-info: #1e78c8;

  /* ROI overlays (drawn on viewport) */
  --hmi-roi-search: #f5c800; /* dashed */
  --hmi-roi-model: #2ea043; /* solid */
  --hmi-roi-mask: #d13438; /* hatched */

  /* Text on dark chrome vs light panel */
  --hmi-text-on-chrome: #f2f2f2;
  --hmi-text-on-panel: #1a1a1a;
  --hmi-text-muted: #6b6b6b;
}
```

## 2. Typography tokens

```css
:root {
  --hmi-font-sans: system-ui, "Segoe UI", Inter, Arial, sans-serif;
  --hmi-font-mono: ui-monospace, "Cascadia Mono", Consolas, monospace;

  --hmi-fs-titlebar: 13px;
  --hmi-fs-menu: 12px;
  --hmi-fs-header: 14px;
  --hmi-fs-body: 13px;
  --hmi-fs-counter: 20px; /* tabular-nums */
  --hmi-fs-dialog: 12px;

  --hmi-fw-regular: 400;
  --hmi-fw-medium: 500;
  --hmi-fw-bold: 700;

  --hmi-lh-tight: 1.15;
  --hmi-lh-normal: 1.35;
}

.hmi-counter {
  font-variant-numeric: tabular-nums;
}
```

## 3. Spacing / grid (4px base — SS-08)

```css
:root {
  --hmi-space-1: 4px;
  --hmi-space-2: 8px;
  --hmi-space-3: 12px;
  --hmi-space-4: 16px;
  --hmi-space-6: 24px;
  --hmi-space-8: 32px;

  --hmi-h-titlebar: 32px;
  --hmi-h-header: 40px;
  --hmi-h-ribbon: 72px;
  --hmi-h-actionbar: 44px;

  --hmi-radius-none: 0px;
  --hmi-radius-sm: 2px; /* HMI panels are near-square */
  --hmi-radius-md: 4px;

  --hmi-border-hairline: 1px;
  --hmi-border-strong: 2px;
}
```

## 4. Elevation / focus

Per SS-07: no drop shadows, no gradients. Focus = 2px inner ring in
`--hmi-accent-primary`. State expressed via background color, not shadow.

```css
:root {
  --hmi-focus-ring: 0 0 0 2px var(--hmi-accent-primary) inset;
  --hmi-selected-bg: var(--hmi-accent-select);
}
```

## 5. Adoption notes

- Do NOT wire these into `src/styles.css` yet. Build phase (post-SS-15)
  merges them into `@theme` block and converts hex → oklch to match template.
- Existing shadcn tokens (`--primary`, `--background`) remain the app-wide
  defaults; `--hmi-*` are a parallel namespace for HMI clone surfaces only.
- Never hardcode a hex in a component — always reference the token.

## Verification

- Palette values cross-checked with SS-04.
- Type roles cross-checked with SS-05.
- Grid heights cross-checked with SS-08.
- No dev-server code changed → no new logs, no regression risk.
