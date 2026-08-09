---
Source: assets/tools-images/41-error-list-output-settings-ethernet-ip.jpg
Screen: Error List (Modal)
Related-Spec: 21-app/40-tools.md
---

# 41 — Error List (Modal)

## 1. One-line purpose

A system-wide diagnostic modal that lists active configuration or runtime errors, allowing the user to quickly navigate to the source of the problem.

## 2. Full-frame layout

- **Background:** The main Run Mode dashboard is visible but dimmed behind the modal. The `Error List` button in the top ribbon is highlighted with a warning triangle.
- **Modal Header:** Title `Error List`.
- **Data Table:** A two-column list (`Source`, `Content`). The first row is selected/highlighted in orange.
- **Footer:** `Error Count: 4` label on the left. `Jump to Source` and `Close` buttons on the right.

## 3. Color palette and role

- **Modal Chrome:** Standard light gray (#EAEAEA) with a dark blue title bar.
- **Selection State:** Active/selected error row is highlighted in bright orange (#FFB300) with bold black text.
- **Warning Icon:** Standard red/orange warning triangle with an exclamation mark.

## 4. Text transcription (grouped by region)

**Top Ribbon (Background)**
`[!] Error List` (Highlighted)

**Modal Form**
`Error List`

_(Table Headers)_
`Source` | `Content`

_(Table Rows)_
`Output Settings:EtherNet/IP` | `The output data contains an error.` (Selected)
`Output Settings:EtherNet/IP` | `The output data contains an error.`
`Output Settings:EtherNet/IP` | `The output data contains an error.`
`Output Settings:EtherNet/IP` | `The output data contains an error.`

**Footer**
`Error Count: 4`
`[Jump to Source]`
`[Close]`

## 5. Interactive controls

- **Table Rows:** Clicking a row selects it.
- **Jump to Source Button:** Acts as a deep link, automatically closing the modal and opening the specific configuration screen (in this case, Output Settings > EtherNet/IP) where the error originates.

## 6. User expectation and workflow context

During setup, users often misconfigure network mappings or leave required fields blank. The system aggregates these validation errors into a central list. The user clicks the Error List ribbon button to figure out why the program won't run, and uses `Jump to Source` to fix each item sequentially.

## 7. Adjacent screens

- `34-shapetrax3-measurement-panel-t100-pin1.jpg`: The dashboard underlying this modal.

## 8. Data shown

- Configuration validation errors.

## 9. Failure and edge states hinted

- This entire screen is dedicated to handling failure states (invalid configurations).

## 10. AI-consumption notes

- **Mapping to our app:** This is the `Error Notification Center` or `Diagnostics Panel`. Implementing a "Jump to Source" deep-linking mechanism requires our application state to know exactly which UI node/panel corresponds to a given validation error in the data model.
