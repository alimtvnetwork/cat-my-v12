# SS-06-integration-and-modern-ui-sync

## 1. Goal
Finalize integration, bidirectional syncing, and ensure the Modern UI consumes the shared domain layer without degradation as specified in Sections 10 and 11 of `.lovable/plans/pending/01-pattern-search-spec.md`.

## 2. Instructions
1. Review Sections 10 and 11.
2. Ensure bidirectional sync between canvas drags and tool panel numeric fields (e.g. dragging a region updates the Pos X/Y in the panel, editing the panel moves the region).
3. Refactor the Modern UI components (`src/components/vision/SegmentSelector.tsx` etc. if necessary) to consume the new `src/domain/vision` models instead of any duplicated models.
4. Verify that adding a new shape (e.g. `Ellipse`) to the shared catalogue populates all dropdowns in both the Modern UI and the 3 Standard UI dropdowns (Pattern Region, Search Region, Masks) automatically.
5. Verify that switching between Standard and Modern UI mid-edit preserves state in both directions perfectly.

## 3. Strict Rules
- NO option list, enum, or default value is duplicated between the two UIs.
- Modern UI MUST remain fully functional.
- Run tests and fix any compilation or unit test errors introduced by this integration.
