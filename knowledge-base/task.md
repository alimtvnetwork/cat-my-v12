# Current Loop Batch

Tracking Plan 41 (Keyboard DnD & Code Quality) steps 23 to 30.

- `[x]` 23. Sweep `src/components/editor/**` for `"C"|"R"|"K"|"S"|"E"` string checks and replace with `RuleKind` enum imports.
- `[x]` 24. Sweep `src/routes/run.tsx` and the run store for `"running"` / `"idle"` string checks and replace with `RunStatus` enum.
- `[x]` 25. Sweep `src/components/editor/panels/BlobPanel.tsx` and any related modules for `0.02` / `0.05` literals; import `BLOB_GROWTH_TOLERANCES` from the schema module in every site.
- `[x]` 26. Extract any single-line if/else or nested ternaries collapsing UI logic in `src/components/editor/**` into named helper components or functions in the same folder. No logic changes.
- `[x]` 27. Add Vitest suite for the keyboard controller. See `./subtasks/41-keyboard-dnd-and-code-quality-pass/SS-02-tests.md`.
- `[x]` 28. Add a Playwright case to `tests/e2e/` that focuses the rule list, presses Space, arrows, then Enter, and asserts the canvas HUD shows the updated `(x,y)`.
- `[x]` 29. Update guideline docs to codify the new rules. See `./subtasks/41-keyboard-dnd-and-code-quality-pass/SS-03-guideline-update.md`.
- `[x]` 30. Once steps 1-29 pass tsgo + vitest + the new e2e, flip Status to `completed` and `mv` this file to `.lovable/plans/done/41-keyboard-dnd-and-code-quality-pass.md`.
