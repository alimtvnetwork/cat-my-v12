# Step 23: --ca-focus token alias

Root cause: `src/components/editor/rail/RuleRow.tsx:35` and `src/components/editor/canvas/CanvasViewport.tsx:101` reference `outline-ca-focus`, but `src/styles.css` only defined `--color-ca-focus-ring` / `--ca-focus-ring`, so Tailwind v4 could not resolve `outline-ca-focus` and the focus ring did not paint.

Files read: `src/styles.css:75-90,180-190,240-260`, `src/components/editor/rail/RuleRow.tsx`, `src/components/editor/canvas/CanvasViewport.tsx`.

Change: added `--color-ca-focus: var(--ca-focus-ring);` and `--ca-focus: var(--ca-focus-ring);` to the `@theme` block so `outline-ca-focus` / `border-ca-focus` / `text-ca-focus` all resolve. Kept existing `--ca-focus-ring` + `hmi-focus-ring` utility as the primary contract.

Next 1 Step: Step 24, sweep all interactive elements for a visible `:focus-visible` treatment and add `hmi-focus-ring` where missing.
