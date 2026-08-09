# SS-02 — Convert `--hmi-*` tokens to oklch and wire into @theme inline

Parent: 02-control-automation-redesign
Status: pending
Created: 2026-07-09

Once the user locks a palette (step 4), convert the chosen hex ramp to `oklch()` and place under `@theme inline` in `src/styles.css`. Keep shadcn defaults untouched.

Skeleton:

```css
@theme inline {
  --color-hmi-chrome-900: var(--hmi-chrome-900);
  --color-hmi-chrome-700: var(--hmi-chrome-700);
  --color-hmi-panel-100: var(--hmi-panel-100);
  --color-hmi-panel-300: var(--hmi-panel-300);
  --color-hmi-viewport-bg: var(--hmi-viewport-bg);
  --color-hmi-primary: var(--hmi-accent-primary);
  --color-hmi-select: var(--hmi-accent-select);
  --color-hmi-ok: var(--hmi-status-ok);
  --color-hmi-ng: var(--hmi-status-ng);
  --color-hmi-warn: var(--hmi-status-warn);
}

:root {
  --hmi-chrome-900: oklch(0.22 0.01 250);
  /* ...remaining ramp populated from locked option... */
  --hmi-accent-primary: oklch(0.58 0.15 245);
  --hmi-accent-primary-hover: oklch(0.63 0.15 245);
  --hmi-accent-select: oklch(0.85 0.17 95);
  --hmi-status-ok: oklch(0.63 0.16 145);
  --hmi-status-ng: oklch(0.6 0.2 25);
  --hmi-status-warn: oklch(0.75 0.15 75);
  --hmi-viewport-bg: oklch(0.18 0 0);
}
```

Rules:

- No remote `@import` for fonts — use `<link>` in `src/routes/__root.tsx` if a custom font is added.
- Do not create `tailwind.config.js`.
- Verify utilities like `bg-hmi-panel-100`, `text-hmi-ng` compile.
