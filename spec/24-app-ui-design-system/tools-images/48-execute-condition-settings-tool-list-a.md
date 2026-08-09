---
Source: assets/tools-images/48-execute-condition-settings-tool-list-a.jpg
Screen: Execute Condition Settings
Related-Spec: 21-app/40-tools.md
---

# 48 — Execute Condition Settings

## 1. One-line purpose

A modal screen allowing the user to conditionally enable or disable specific vision tools within the current program without deleting them.

## 2. Full-frame layout

- **Header:** `Execute Condition Settings`.
- **Main Body:** A scrolling list/table of all configured tools. Each row represents a tool.
- **Columns:**
  - Tool Icon & ID/Name (e.g., `T100: Pin 1`).
  - Tool Type (e.g., `ShapeTrax3`).
  - Execution Condition Dropdown.
- **Footer:** `OK` and `Cancel` buttons.

## 3. Color palette and role

- **Modal Chrome:** Light gray (#EAEAEA).
- **Selection:** The active dropdown is highlighted with an orange border.

## 4. Text transcription (grouped by region)

**Header**
`Execute Condition Settings`

**Table/List**
`[Camera 1 Icon]`
`[Icon] T100: Pin 1` | `ShapeTrax3` | `[Never Execute [v]]` (Highlighted in Orange)
`[Icon] T101: Marking A` | `ShapeTrax3` | `[Always Execute [v]]`
`[Icon] T102: Marking B` | `ShapeTrax3` | `[Never Execute [v]]`
`[Icon] T103: Marking C` | `ShapeTrax3` | `[Never Execute [v]]`
`[Icon] T104: OVERALL MARKING` | `Calculation` | `[Never Execute [v]]`
`[Icon] T105: Edge Width` | `Edge Width` | `[Always Execute [v]]`
`[Icon] T111: Empty Pocket` | `Judged with Pattern Match (Profile)` | `[Always Execute [v]]`

**Footer**
`OK` `Cancel`

## 5. Interactive controls

- **Execution Condition Dropdown:** The user clicks to toggle between `Always Execute`, `Never Execute`, and potentially other conditional triggers (e.g., execute only if a previous tool passed/failed).

## 6. User expectation and workflow context

During debugging or physical line changeovers, a user might want to temporarily skip an inspection step without losing the tool's configuration. Changing it to `Never Execute` acts like commenting out a line of code. It saves processing time.

## 7. Adjacent screens

- `49-execute-condition-settings-tool-list-b.jpg`: Alternate photo of the exact same screen.

## 8. Data shown

- A complete list of all tools in the `Set022 SUPERTHIN QFN 5X5_REV1` program, revealing the complexity of the inspection recipe.

## 9. Failure and edge states hinted

- Setting a tool to `Never Execute` will likely cause downstream tools that depend on its output to fail or be skipped as well.

## 10. AI-consumption notes

- **Mapping to our app:** This is the `Node Enable/Disable` state. In our node graph, we should have a quick toggle on each node to "bypass" or "disable" it. This screen acts as a bulk-editor for that specific boolean property across all nodes.
