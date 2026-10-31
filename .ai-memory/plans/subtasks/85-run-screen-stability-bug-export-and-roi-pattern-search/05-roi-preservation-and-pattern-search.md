# Subtask 05: ROI Shape Immutability & In-ROI Pattern Search Integration

- **Task**: `run-screen-stability-bug-export-and-roi-pattern-search - Task 05`
- **Owner**: Worker 3 (`847bccfb-7edc-42f2-a713-d536c2a1fe14`)
- **Status**: COMPLETED
- **Target Files**: `StandardWorkbenchCanvas.tsx`, `usePatternMatchingRule.ts`, `PatternMatchCanvas.tsx`, `VisualToolWorkpieceCanvas.tsx`, `InspectionHierarchyTree.tsx`, `PhotoshopLayersPanel.tsx`

---

## 1. Accomplishments & Verification

1. **ROI Auto-Squaring Eradication**:
   - `StandardWorkbenchCanvas.tsx`: Removed hardcoded `isSquareROI: true`; dynamic evaluation `props.isSquareROI ?? (props.shape === "square")` enables arbitrary rectangular aspect ratios for Caliper and Edge Width tools.
   - `usePatternMatchingRule.ts`: Restricted `squareSearchRegion` strictly to `shapeType === "square"`. Default initialization, loading bitmaps, chip frames, and fallback creation all preserve arbitrary rectangular dimensions.
   - `PatternMatchCanvas.tsx`: Updated default `shape` state from `"square"` to `"rectangle"`.
   - `VisualToolWorkpieceCanvas.tsx`:
     - Removed `needsSquare` re-pinning effect loop for rectangular shapes (eliminating forced squaring on resize).
     - Passed full rectangular `roi.width` and `roi.height` into `getPatternBoxesForRegion`.
     - Locked 1:1 aspect ratio for Circle (`width === height === diameter`) and uniform radius for regular Polygon during resize.

2. **In-ROI Pattern Search Hierarchy (T102)**:
   - `src/components/vision/layers/types.ts`: Added `parentId?: string; depth?: number; isExpanded?: boolean;` to `VisionLayerItem`.
   - `InspectionHierarchyTree.tsx` & `PhotoshopLayersPanel.tsx`: Nested T102 Pattern Search template boxes under parent ROI / rule in the layer stack (with `depth: 2` and visual indentation) and under the optical subtree in tree view.

3. **Verification**:
   - TypeScript check clean (`pnpm exec tsc --noEmit`).
   - Unit tests in `pinned-pattern-geometry.test.ts` passed 100%.
