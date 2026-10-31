# Subtask 05: ROI Shape Immutability & In-ROI Pattern Search Integration

- **Slug**: `run-screen-stability-bug-export-and-roi-pattern-search - Task 05`
- **Owner**: Vision Rules & Canvas Engineer
- **Status**: PENDING

## Objectives
1. Lock Region of Interest (ROI) geometry against accidental or destructive shape mutations (prevent forcing Caliper regions into squares or arbitrary polygons).
2. Integrate a dedicated "Pattern Search" tool inside the ROI:
   - Allow adding pattern matching template boxes inside the parent ROI bounds.
   - Maintain ROI as the outer bounding search area while pattern templates reside as child layers within it.
3. Clean up the sidebar properties to separate Region Boundary configuration from In-ROI Tooling.
