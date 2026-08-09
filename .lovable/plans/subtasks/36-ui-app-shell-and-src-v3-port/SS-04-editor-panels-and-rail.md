# SS-04 - Editor panels + rail port (Steps 23-24)

Parent: `.lovable/plans/pending/36-ui-app-shell-and-src-v3-port.md`

## Files to port

From `src_v3/src/components/editor/`:

- `panels/BarPanel.tsx`
- `panels/EdgePanel.tsx`
- `panels/ReferenceCapturePanel.tsx`
- `panels/resolver.tsx` (diff merge, keep `src/` panels that v3 lacks)
- `panels/index.ts`
- `rail/RuleList.tsx`
- `rail/RuleRow.tsx`
- `rail/GeometryInputs.tsx`
- `rail/index.ts`
- `rail/RightRail.tsx` (diff merge; delete inline rule row markup)

## Merge rules

- `panels/resolver.tsx`: union of both sides, PascalCase enum `PanelKind` in `src/lib/enums/panel-kind.ts` (rule 12).
- `panels/index.ts`: re-export every panel; keep alphabetical.
- `rail/RightRail.tsx`: replace inline `<article>` rule rows with `<RuleRow>`; keep the outer keyboard-focus ring behaviour from `src/`.

## Do not overwrite

- `src/components/editor/InspectorSurface.tsx` and `PropertiesPanel.tsx` (newer than v3 counterparts).
- `src/components/editor/__tests__/` (extend, do not delete).

## Verify

- `bunx vitest run src/components/editor/__tests__` green with two new tests: BarPanel mount + EdgePanel keyboard nav.
- Playwright: rule editor opens, each panel mounts via `data-panel-controller`.
- Axe on the editor page: zero serious violations.
