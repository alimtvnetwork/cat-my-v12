# Issue 19 repro memo (Plan 73 step 8)

## Symptom recap

Rule editor shows a legacy "Program" panel; Rule Layers rows are narrow with left-side disclosure arrow; too many dividers.

## Files inspected

- `src/routes/setup.rules.tsx` (1105 lines): no literal "Program" panel; only imports `Layers` icon at :8 and uses it as a header glyph at :433 and :762.
- `src/routes/projects.$projectId.rulesets*.tsx`: no "Program" panel.
- `src/components/editor/panels/`: only `LightingDrawer.tsx:111` has a "Program preset" select (not the editor's rule-layers side panel).
- `src/components/editor/LayersPanel.tsx` (if present) not yet located; will grep next.

## Root-cause hypothesis (not yet confirmed)

The "Program" wording the user sees is likely the `program="Program 01"` prop rendered by `Titlebar` on every settings route (settings.\*, ops, run, results, errors), showing "Program 01" as a program-context label. This is NOT a panel inside the rule editor; it is the shared header slot. If confirmed, the fix belongs in the Titlebar / route metadata (hide when the route is `/setup/rules`), not in the editor.

## Ambiguity flag

"Legacy Program panel" could also mean an older Layers-panel section literally titled Program that no longer exists in the code we searched. Cannot confirm without a screenshot from the user or Playwright of `/setup/rules`. Step 9 will run Playwright against `/setup/rules` and screenshot the region to disambiguate before writing the fix.

## Next

Step 9: Playwright capture `/setup/rules` at 1280x1800; identify the "Program" surface visible on screen and its owning file/line. Only then propose the minimum fix.
