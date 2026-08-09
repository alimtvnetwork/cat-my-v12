---
Source: assets/tools-images/47-edit-tools-copy-paste-add-cam-menu.jpg
Screen: Edit Operations Menu
Related-Spec: 21-app/40-tools.md
---

# 47 — Edit Operations Menu

## 1. One-line purpose

A dropdown menu providing standard clipboard and modification actions for the vision tools within the current program.

## 2. Full-frame layout

- **Background:** Main Run Mode dashboard.
- **Top Ribbon:** The `Edit` button has been clicked.
- **Dropdown Menu:** Overlays the left side of the screen.

## 3. Color palette and role

- **Menu Chrome:** Light gray/beige (#F5F5DC or similar).
- **Text:** Black for active items, light gray for disabled items.

## 4. Text transcription (grouped by region)

**Top Ribbon (Context)**
`Save` `Edit [v]` (Selected) `Global [v]`

**Edit Menu**
`[Undo Icon] Undo editing of the region` (Disabled)
`[Pencil Icon] Edit Tools`
`[Trash Icon] Delete Tools`
`[Copy Icon] Copy Tools`
`[Paste Icon] Paste Tools` (Disabled)
`Paste with Tool ID` (Disabled)
`Add CAM >`
`Delete CAM` (Disabled)
`Update Reference Value`

## 5. Interactive controls

- **Clipboard Actions:** Standard Copy/Paste for duplicating tools.
- **Add CAM:** Likely allows assigning a new physical camera input to the current program (if the hardware supports multiple cameras).

## 6. User expectation and workflow context

When building complex inspection routines with dozens of similar features (e.g., measuring 50 identical pins on a chip), the user relies heavily on `Copy Tools` and `Paste Tools` to speed up programming.

## 7. Adjacent screens

- `43-program-menu-change-save-delete.jpg`: Program-level actions.
- `46-communications-io-system-settings-menu.jpg`: Global-level actions.

## 8. Data shown

- Available editing actions based on current selection state.

## 9. Failure and edge states hinted

- `Undo editing...`, `Paste...`, and `Delete CAM` are disabled, meaning there is no active tool selected that can be pasted, no recent edit to undo, and perhaps only one camera is currently configured.

## 10. AI-consumption notes

- **Mapping to our app:** Standard Node Graph editing features. In a modern UI, these actions are typically exposed via right-click context menus on the nodes themselves, or standard keyboard shortcuts (Ctrl+C/Ctrl+V), rather than a global top ribbon dropdown.
