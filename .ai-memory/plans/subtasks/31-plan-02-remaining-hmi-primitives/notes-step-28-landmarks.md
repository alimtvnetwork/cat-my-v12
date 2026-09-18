# Step 28: HmiShell/EditorShell landmarks

Root cause: axe `region` findings on /run + /setup came from ModeHeader, ActionBar (HmiShell), and EditorShell slot wrappers being plain `<div>`s outside any landmark, plus /setup had no `<h1>` inside a landmark.

Files read: `src/components/hmi/HmiShell.tsx`, `src/components/hmi/Titlebar.tsx`, `src/components/hmi/ModeHeader.tsx`, `src/components/hmi/ActionBar.tsx`, `src/components/editor/shell/EditorShell.tsx`, axe target dump `/tmp/browser/step27/`.

Changes:

- `ActionBar.tsx`: `<div>` -> `<footer aria-label="Action bar">` (landmark for HmiShell action bar).
- `ModeHeader.tsx`: `<div>` -> `<section role="region" aria-label={title}>` (kept as region, not `<header>`, so Titlebar remains the single `banner`).
- `EditorShell.tsx`: wrapped ribbon slot in `<nav aria-label="Tool ribbon">`; moved sr-only `<h1>Setup editor</h1>` inside `<main>` so it is contained by a landmark; kept topbar/rail/status as `<div>` because their children already emit `header[role=banner]`, `aside[role=complementary]`, and status region (double-wrapping caused duplicate-banner + duplicate-complementary violations).

Before/after axe:

- setup: 5 -> 1 violation (only `nested-interactive` on `#rule-row-*`, deferred; RuleRow uses `role="option"` with interactive children and needs a listbox restructure).
- run: 1 -> **0** violations.

Artifacts: `/tmp/browser/step27/setup.png`, `/run.png`, updated `setup.json` (`nested-interactive` x3 only), `run.json` (empty).

Next 1 Step: Step 29, restructure RuleRow so interactive children are not nested inside the `role="option"` container (fix last `nested-interactive` finding).
