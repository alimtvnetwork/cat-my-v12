# Subtask 06: Canvas Move/Pan Tooling Fluidity & E2E Release

- **Slug**: `run-screen-stability-bug-export-and-roi-pattern-search - Task 06`
- **Owner**: QA & Release Orchestrator
- **Status**: PENDING

## Objectives
1. Resolve canvas drag, move, and pan event delegation issues:
   - Ensure the Move/Pan tool works across the entire canvas area without requiring clicks at the very top of the screen.
   - Separate canvas panning (dragging empty background) from item dragging (moving ROI or pattern templates).
2. Author automated test suites verifying:
   - Bug recorder dropdown and prompt generation.
   - Local disk save endpoint.
   - Run button relocation and bottom bar collapse.
   - ROI shape immutability and in-ROI pattern search.
3. Validate with TypeScript and Python tests, then commit and push via GitMap.
