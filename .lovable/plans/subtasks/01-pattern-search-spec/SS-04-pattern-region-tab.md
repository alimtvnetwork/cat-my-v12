# SS-04-pattern-region-tab

## 1. Goal
Implement the Tool Panel structure, the Pattern Region Tab, and Detection Conditions as specified in Sections 6 and 7 of `.lovable/plans/pending/01-pattern-search-spec.md`.

## 2. Instructions
1. Review Sections 6 and 7.
2. Implement the `ToolTitleBar` with the tool slot/ID, tool name field, breadcrumb row, and Reference Image selector (`1 - 000`).
3. Implement the `ToolTabs` component (4 large icon tiles).
4. Implement the `Pattern Region` tab body:
   - "Edit Pattern Region" block: Pattern Region shape dropdown (populated from shared catalogue), Reference Image boxed value, OK/Cancel.
5. Implement the "Detection Conditions" block (which shows after pattern region is confirmed):
   - Angle Range `+/-` numeric field
   - Detection Count numeric field
   - Search Sensitivity and Accuracy sliders (with `Normal` midpoint and tick marks)
   - Min. Match% numeric field and slider bound together.

## 3. Strict Rules
- The dropdowns must be populated dynamically from the shared shape catalogue.
- Sliders must follow the styling rules: thin light track, diamond/round handle, 9 tick marks.
- The `40%` zoom and `Min. Match% 40` must NOT be bound to the same state.
