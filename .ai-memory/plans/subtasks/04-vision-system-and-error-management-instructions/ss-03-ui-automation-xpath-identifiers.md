# Subtask 03: UI Automation Identity Triad & Headless CLI Actuator
# File: .ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/ss-03-ui-automation-xpath-identifiers.md
# Status: COMPLETED

## Objectives
1. Implement standard automation identity helper in `src/utils/automation-registry.ts`:
   - Emits `id`, `name`, `xpath`, `data-automation-id`, `data-automation-name`, `data-automation-xpath`.
2. Apply automation identity across interactive controls:
   - Window controls (`btn-window-minimize`, `btn-window-maximize`, `btn-window-close`).
   - Titlebar actions (`btn-save-recipe`, `btn-record-bug`, `btn-simulation-launch`).
   - Image and source selectors (`select-camera-source`, `btn-preset-pocket-1`, `btn-preset-pocket-2`, `btn-preset-pocket-5`).
   - Inspection rule buttons (`btn-test-rule`, `btn-tune-workbench`, `btn-add-ruleset`, `btn-add-rule`).
   - Shape selectors (`btn-shape-rect`, `btn-shape-square`, `btn-shape-circle`).
3. Implement headless CLI Actuator in `scripts/cli-ui-actuator.ts`:
   - Supports listing all active screen controls with their XPath and Automation IDs.
   - Supports clicking any element by `--id` or `--xpath`.
   - Supports typing into input fields by `--id` or `--xpath`.
   - Returns exit code 0 on success, exit code 1 with diagnostic JSON on target not found.

## Deliverables
- `src/utils/automation-registry.ts`
- `src/components/layout/WindowControlButtons.tsx`
- `src/components/layout/StandardAppShell.tsx`
- `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`
- `scripts/cli-ui-actuator.ts`
