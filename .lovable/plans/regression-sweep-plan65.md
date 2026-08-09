# Plan 65 regression sweep

Plan 65 step 29. Snapshot of what still needs to be manually verified before the plan's final bump, and the state of automated coverage that already asserts each piece.

## Automated coverage in place

- Home CTAs + tool palette: `tests/e2e/home_ctas_and_tool_palette.py` (step 26). Asserts `home-primary-cta` href, conditional `home-create-project`, and the tool palette "More" popover.
- On-canvas quick actions: `tests/e2e/editor_quick_actions.py` (step 28). Asserts duplicate copies kind + geometry, lock disables delete, unlocked delete removes exactly one rule.
- Layout persistence contract: `src/lib/workspace/__tests__/layout-slice.test.ts` + `makeObservableStorage` covers `E_LAYOUT_PERSIST_FAILED` for `workspace-layout:v1`. Step 24 extended the same emission to `palette.layout.v1`; no unit test yet (follow-up).

## Manual regression checklist

Run through this list on the preview before the final bump:

1. Home
   - Primary CTA renders. Empty state routes to `/projects?new=1`; with a recent project it routes to `/projects/<id>` and the "Create project" button renders next to it.
   - Getting Started shows one "Next up" pill and the remaining not-done items as "Todo".
2. Reset Layout
   - Reset Layout in the editor top bar opens the AlertDialog (not immediate wipe).
   - Confirming restores both palette floats and dock slots / dock sizes.
   - Console emits `[reset-layout] palette + workspace layout reset`.
3. Canvas quick actions
   - Selecting one rule shows the floating toolbar above the top-right corner.
   - Duplicate produces a new rule with the same kind, size, params, and color.
   - Delete is greyed out with an "Unlock first" tooltip when the rule is locked; enabled when unlocked.
4. Layers row
   - Delete icon sits flush right on rows with short and long names.
   - Hovering the row name shows the full name in a tooltip when truncated.
5. Tool palette
   - Primary grid shows five active kinds only.
   - "More" trigger opens a popover with five disabled "soon" entries.

## Open follow-ups (not blocking plan 65)

- Add a unit test asserting `reportError` fires with `code: "E_LAYOUT_PERSIST_FAILED"` and `storageKey: "palette.layout.v1"` when `saveJson` throws inside `palette-store` (mock `localStorage.setItem`).
- Consolidate drift keys (`workspace-layout:v1`, `palette.layout.v1`, `ca.recent-projects.v1`, `ca:projects:v1`, `ca.favorites`) into `StorageKey` per `.lovable/plans/layout-persistence-audit.md`.
- Add a `resetAll()` helper that iterates the full key set.

No known runtime errors on record (`code--read_runtime_errors` returned empty).
