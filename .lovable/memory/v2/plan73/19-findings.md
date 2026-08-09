# Issue 19 findings + fix (Plan 73 steps 9-10)

## Step 9 findings (Playwright + code audit)

- Screenshot `/tmp/browser/plan73/19/rules_full.png` at 1280x1800 of `/setup/rules`: no "Program" panel visible; the only "Program" wording is the footer status "Program 01" at y=1774 owned by `ModeHeader`.
- Grep across `src/routes/`, `src/components/editor/`, `src/components/hmi/` for `Program` as a panel title returns zero matches. The `program-store.ts` and `TaskPane.tsx` uses are unrelated column labels.
- Conclusion: the "legacy Program panel" complaint is obsolete; that panel was removed by a prior refactor. Retained as a regression note only.

## Root cause (one sentence, remaining valid half of issue 19)

`GroupHeader` in `src/components/editor/layers/LayersPanel.tsx:281-299` rendered its disclosure `<Chevron>` as the first child of the row, putting the arrow on the LEFT of every group instead of the right (Photoshop convention), which is what makes Rule Layers rows feel dated.

## Step 10 fix (minimum correct change)

Moved the chevron `<button>` after the count `<span>` inside the same `<div>` in `LayersPanel.tsx`. Nothing else changed: dividers, padding, row width, aria-expanded semantics, and keyboard bindings remain identical. `LayerRow` already renders lock/hide/delete controls on the right, so this aligns the group header with the row visual grammar.

## Verification

- `bunx vitest run src/components/editor/layers/__tests__/LayersPanel.test.tsx`: 3/3 tests pass (`renders grouped rules first and collapses group contents`, `handles panel shortcuts without hijacking rename input typing`, plus root render).
- aria-expanded / aria-label unchanged; screen readers still announce the toggle correctly.

## Deferred (out of scope for this slice)

- "Layers rows are narrow" and "too many dividers": both are cosmetic and would touch `LayerRow` (`h-*` / border widths); not fixed here to keep the change minimum. Tracked as follow-up under Plan 73 step 11 if the user wants it before broader closeout.
