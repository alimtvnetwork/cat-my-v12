# Pattern Search (Standard UI) - Implementation Plan

This plan outlines the architecture and step-by-step execution for implementing the Pattern Search Standard UI as defined in `01-pattern-search-spec.md`.

## User Review Required

> [!IMPORTANT]
> **Subtask Generation:** The spec is very large and touches on multiple complex systems (drag/drop canvas, shared domain layer, standard UI vs modern UI). I propose breaking this down into **6 distinct subtasks** to be executed by sub-agents sequentially. Please review the subtasks below.

## Open Questions

> [!WARNING]
> **Unknown Fields:** Section 12 of the spec lists several fields (e.g. `Unit Time`, `Reference Image 1 - 000`, `Image Region` purpose, `Counts`). As per the instructions, I will render them exactly as specified and wire them to state, but leave their actual formulas/behavior as TODOs rather than guessing. 
> 
> **Are there any clarifications for Section 12 that I should include now, or should I proceed with the UI as-is?**

## Proposed Architecture

1. **Shared Domain Layer (`src/domain/vision/`)**
   - We will extract shared models (`PatternShape`, `MaskShape`, `PatternSearchSettings`) to a new `src/domain/vision` directory to serve as the single source of truth for both Modern and Standard UIs.
   - We will implement validation, defaults, and the persistence adapter here.
   
2. **UI Mode Switch (`src/contexts/UiModeContext.tsx`)**
   - Introduce a `UiMode` ("modern" | "standard") context to toggle between the two views.
   - We will wrap the rule editor route with a presentation branch (`<ModernPatternSearch />` vs `<StandardPatternSearch />`).
   
3. **Standard UI Components (`src/components/vision/standard/`)**
   - **`StandardHeaderReadouts`**: The top-left black chrome numeric displays.
   - **`StandardImageToolbar`**: The image controls, view modes, and zoom.
   - **`StandardCanvas`**: A custom draggable/resizable canvas engine that converts pixel coordinates and manages layers (image region, search region, pattern region, 4 mask layers).
   - **`StandardToolPanel`**: The right-column tool panel containing the title bar, the 4 tabs, and the body views (Edit Pattern Region, Detection Conditions, Search Region).
   - **`StandardActionBar`**: The bottom strip for Run, Register Image, OK, Cancel, and Settings.

## Subtask Breakdown

I will create the following subtasks in `.lovable/plans/subtasks/01-pattern-search-spec/` once approved:

1. **`SS-01-domain-and-mode-switch.md`**
   - Create `src/domain/vision/pattern-search.ts` with shape catalogues and the full `PatternSearchSettings` interface.
   - Create `UiModeContext` and the basic `<UiModeSwitch />` component.
   - Wire the top-level branch at `/setup/rules/:id`.

2. **`SS-02-layout-and-styling.md`**
   - Set up the semantic CSS variables (`--std-chrome`, `--std-panel`, etc.) in `src/styles.css`.
   - Build the 2-column fixed-aspect shell layout.
   - Implement the `StandardHeaderReadouts` (mock data) and `StandardActionBar` components.

3. **`SS-03-image-toolbar-and-canvas.md`**
   - Build `StandardImageToolbar` (dropdowns, zoom presets, view mode toggles).
   - Implement `StandardCanvas` with wheel-zoom/pan logic and region overlay rendering (yellow, blue, green, magenta handles).
   - Wire up the shared drag/resize engine for regions (clamped to image bounds).

4. **`SS-04-pattern-region-tab.md`**
   - Build `StandardToolPanel` structure and `ToolTitleBar`.
   - Implement the `Pattern Region` tab: Edit Pattern Region sub-panel (dropdowns, OK/Cancel).
   - Implement the `Detection Conditions` block (sliders, text inputs).

5. **`SS-05-search-region-tab.md`**
   - Implement the `Search Region` tab (dropdown + detailed view expander).
   - Implement the 4 fixed `Mask Region` slots using the shared shape catalogue.
   - Implement the `Image Region` block (Use Image Region checkbox, Reference Tool dropdown, Detection Color radio).

6. **`SS-06-integration-and-modern-ui-sync.md`**
   - Ensure bidirectional sync between canvas drags and tool panel numeric fields.
   - Refactor the Modern UI components to consume the new `src/domain/vision` models without degrading their existing functionality.
   - Verify that adding a new shape to the shared catalogue populates all dropdowns in both UIs.

## Verification Plan

### Automated Tests
- Run `tsc --noEmit` and the frontend linter to ensure strict typing of the new domain models and component props.

### Manual Verification
- Render the Standard UI in the browser and verify it matches the provided screenshots perfectly.
- Test switching between Modern and Standard UI mid-edit to confirm state survives the transition.
- Test the 4-layer mask limit in Standard vs unlimited in Modern.
- Drag and resize canvas regions to confirm the numeric readouts update seamlessly.
