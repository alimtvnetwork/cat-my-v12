# Phase 6: Component Size Refactoring

This plan addresses the user's request to break down large React components (exceeding 150-200 lines) into smaller, more modular sub-components.

## Context
During the Code Quality Audit (Plan 05), we identified numerous components that exceed the recommended size limits. Due to the sheer volume and complexity of these components, the refactoring work has been split into this dedicated plan. 

Agents executing this plan should focus on architectural integrity, ensuring that prop drilling is minimized and state is managed appropriately when splitting components. Follow the `spec/02-coding-guidelines/` very strictly.

## Critical Guidelines
1. Components must be < 80 lines where possible. 150 lines is the absolute maximum.
2. Ensure explicit return types (`React.ReactNode` or `React.JSX.Element | null`) are added to any new sub-components.
3. Move inline props/types to `types.ts` in the same directory.
4. Keep Boolean props strictly boolean (no `boolean | null`), defaulting to `false`.

## Tasks

The following files were identified as exceeding 200 lines. Refactor them from largest to smallest:

### 1. Canvas Overlays & Viewports (Extreme Size)
- [x] `src/components/editor/canvas/SelectionOverlay.tsx` (2600+ lines)
- [x] `src/components/editor/canvas/CanvasViewport.tsx` (1700+ lines)

### 2. Navigations & Sidebars
- [x] `src/components/nav/TopMenuBar.tsx` (800+ lines)
- [x] `src/components/ui/sidebar.tsx` (700+ lines)
- [x] `src/components/nav/CommandPalette.tsx` (400+ lines)
- [x] `src/components/app-shell/panels/PanelHost.tsx` (570+ lines)

### 3. Editor Panels & Properties
- [x] `src/components/editor/PropertiesPanel.tsx` (700 lines)
- [x] `src/components/rules/PropertiesPalette.tsx` (690+ lines)
- [x] `src/components/editor/panels/MaskPanel.tsx` (540+ lines)
- [x] `src/components/editor/layers/LayersPanel.tsx` (540+ lines)
- [x] `src/components/editor/setup/EditorSetupExperience.tsx` (510 lines)
- [x] `src/components/editor/panels/AcceptancePanel.tsx` (400 lines)
- [x] `src/components/rules/LayersPalette.tsx` (390+ lines)
- [x] `src/components/editor/InspectorSurface.tsx` (330+ lines)

### 4. Dialogs & Modals
- [x] `src/components/editor/validation/ValidateAgainstImageDialog.tsx` (650+ lines)
- [x] `src/components/errors/GlobalErrorModal.tsx` (630+ lines)
- [x] `src/components/rules/RuleCreateDialog.tsx` (320+ lines)

### 5. Other Complex Components
- [x] `src/components/rules/tools/ToolsPalette.tsx` (590+ lines)
- [x] `src/components/settings/ReferenceImageCard.tsx` (580+ lines)
- [x] `src/components/projects/sections/ProjectImageSamplesSection.tsx` (510+ lines)
- [x] `src/components/editor/design-mode/DesignModeOverlay.tsx` (490+ lines)
- [x] `src/components/hmi/CameraPreview.tsx` (380+ lines)
- [x] `src/components/cli/envelope-viewer.tsx` (350+ lines)

### 6. Remaining Components (> 200 lines)
- [x] Refactor remaining files listed in the initial audit (lines 200 - 350).

> **Note to Agent**: Work incrementally and commit regularly. Ensure no functionality is broken after splitting. Use `ts-morph` or AST tools if necessary, but manual refactoring is usually required for logic splitting.











