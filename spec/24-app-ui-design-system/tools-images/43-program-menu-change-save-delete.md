---
Source: assets/tools-images/43-program-menu-change-save-delete.jpg
Screen: Program Operation Menu
Related-Spec: 21-app/40-tools.md
---

# 43 — Program Operation Menu

## 1. One-line purpose

A global context menu allowing the user to switch, save, clone, and manage the overarching inspection program (recipe) files.

## 2. Full-frame layout

- **Background:** The main Run Mode dashboard for `T100 Pin 1`.
- **Top Ribbon:** The user has clicked on the active Program Name dropdown on the far left.
- **Dropdown Menu (`Program Operation`):** A vertical list of file management actions (Change, Add, Save, Copy, Delete, etc.). It overlays the left side of the screen.

## 3. Color palette and role

- **Menu Chrome:** Light gray/beige (#F5F5DC or similar) with an orange header.
- **Text:** Dark gray for active options, light gray for disabled options.

## 4. Text transcription (grouped by region)

**Top Ribbon (Context)**
`1 Set022 SUPERTHIN QFN 5X5_REV1 [v]` (This dropdown triggered the menu)

**Program Operation Menu**
`Program Operation` (Orange Header)
`[Icon] Change Programs`
`[Icon] Add New`
`[Icon] Save`
`[Icon] Copy`
`[Icon] Delete`
`Export`
`Import`
`Edit Name`
`Update Version of Program Setting` (Disabled/Grayed out)
`Convert All Programs to Latest Version` (Disabled/Grayed out)

**Background Dashboard**
`T100 Pin 1`
`ShapeTrax3`
_(Standard measurement table)_

## 5. Interactive controls

- **Menu Items:** Standard click-to-execute actions. `Change Programs` likely opens a list of available files.

## 6. User expectation and workflow context

A "Program" (often called a Recipe or Job in industrial automation) contains all the tools, settings, and reference images for inspecting a specific physical part (e.g., "SUPERTHIN QFN"). When the manufacturing line changes over to produce a different part, the operator uses this menu to load the corresponding program.

## 7. Adjacent screens

- `34-shapetrax3-measurement-panel-t100-pin1.jpg`: The background dashboard.

## 8. Data shown

- The current program name (`Set022 SUPERTHIN QFN 5X5_REV1`).

## 9. Failure and edge states hinted

- Version update tools are disabled, implying the current program is already up-to-date with the controller's firmware version.

## 10. AI-consumption notes

- **Mapping to our app:** This represents `Workspace` or `Project` management. Our UI needs a global header dropdown to switch between different inspection recipes, allowing users to save, duplicate, and export their configurations as distinct files.
