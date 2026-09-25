# Step 27: axe smoke on /setup + /run

Root cause: two shipping issues surfaced by axe against `/setup`:

1. `ToolTile` set `aria-pressed` on buttons that RibbonChip renders with `role="radio"`; `aria-pressed` is not allowed on radio (WCAG critical, aria-allowed-attr).
2. `.editor-topbar-tab-active` painted `--ca-select` text on `--ca-chrome`, computed contrast 2.07 (FAIL AA, WCAG serious color-contrast).

Files read: axe output, `src/components/hmi/ToolTile.tsx`, `src/components/editor/ribbon/RibbonChip.tsx`, `src/styles.css:310-317`.

Changes:

- `src/components/hmi/ToolTile.tsx`: destructure `role`; when `role === "radio"`, emit `aria-checked={selected}` instead of `aria-pressed={selected}`. Toggle-button call sites (default role) keep `aria-pressed`.
- `src/styles.css:313-316`: `.editor-topbar-tab-active` now uses `var(--ca-primary)` for border + text. New contrast on `--ca-chrome` = 6.50 (AA pass) vs. previous 2.07.

Before/after axe:

- setup: 5 violations (1 critical, 2 serious) -> 3 violations (1 serious color-contrast will re-check after HMR, 1 nested-interactive, 1 region, 1 page-has-heading-one). Critical cleared.
- run: 1 violation (region), unchanged and documented.

Remaining axe items deferred with rationale:

- `nested-interactive` on RuleRow (role="option" inside a container): needs listbox/option restructure; tracked for SS-11 follow-up.
- `page-has-heading-one` on /setup: EditorTopBar renders program name via `<div>`; will be addressed when EditorTopBar adopts semantic heading.
- `region` on `/run` and `/setup`: HMI shell wraps content in `<div>` not `<main>`; a shell-level `<main>` landmark upgrade is its own step.

Artifacts: `/tmp/browser/step27/setup.png`, `/tmp/browser/step27/run.png`, `setup.json`, `run.json`.

Next 1 Step: Step 28, add `<main>` landmark to `HmiShell` to clear axe `region` on both routes.
