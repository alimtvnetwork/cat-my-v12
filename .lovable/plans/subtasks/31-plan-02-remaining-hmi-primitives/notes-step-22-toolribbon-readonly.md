# Step 22: ToolRibbon isReadOnly + aria-disabled

Root cause: `src/components/hmi/ToolRibbon.tsx` had no nav-lock affordance, so during a run (SS-05 lock) the ribbon still accepted clicks and did not announce disabled state.

Files read: `src/components/hmi/ToolRibbon.tsx`, `notes-step-09-ss05-nav-lock-verify.md`.

Change: added `isReadOnly?: boolean` and `label?: string` to `ToolRibbonProps`. When `isReadOnly`, ribbon gets `pointer-events-none opacity-60`, `aria-disabled="true"`, and `data-readonly` for test hooks. Default `isReadOnly=false` preserves existing call sites.

Next 1 Step: Step 23, add `--ca-focus` design token and `hmi-focus-ring` utility to `src/styles.css`.
