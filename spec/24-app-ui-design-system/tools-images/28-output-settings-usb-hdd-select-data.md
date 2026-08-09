---
Source: assets/tools-images/28-output-settings-usb-hdd-select-data.jpg
Screen: Output Settings — USB HDD (Select Data)
Related-Spec: 21-app/40-tools.md
---

# 28 — Output Settings — USB HDD (Select Data)

## 1. One-line purpose

A configuration screen specifying which discrete data points (results, counts, times) should be exported to a CSV file on a connected USB HDD.

## 2. Full-frame layout

- **Header:** Title `Output Settings` > `USB HDD Output Settings`.
- **Left Sidebar:** `USB HDD` is selected.
- **Main Content Area:**
  - **Top Button:** `Select Data` (presumably opens a tool picker to add rows to the table).
  - **Data Table:** A multi-column list of data fields to be output. Columns include a checkbox, Output No., Output Data (variable name), Preview (current value), and a ">>" reorder/edit button.
  - **Skipped Tool Logic:** Radio buttons to handle missing data (`Output "0"` or `None`).
  - **File Settings:** Read-only display of Saving Folder and Result File Name.
- **Footer:** `OK`, `Cancel`.

## 3. Color palette and role

- **Table:** Alternating very light gray/white rows. Scrollbar on the right.
- **Selection State:** `USB HDD` is highlighted orange in the sidebar.

## 4. Text transcription (grouped by region)

**Header**
`USB HDD Output Settings`
`Specifies the items to output when outputting results to the USB HDD connected to this controller.`

**Main Form**
`[Select Data]`
_(Table Headers)_
`[x] Output` | `No.` | `Output Data` | `Preview`

_(Table Rows)_
`[x]` | `0` | `T100: Pin 1. Processing Count` | `0000000000` | `>>`
`[x]` | `1` | `T100: Pin 1. OK Count` | `0000000000` | `>>`
`[x]` | `2` | `T100: Pin 1. Fail (NG) Count` | `0000000000` | `>>`
`[x]` | `3` | `T100: Pin 1. Execution Time` | `0000000.000` | `>>`
`[x]` | `4` | `T100: Pin 1. Execute Error` | `0` | `>>`
`[x]` | `5` | `T100: Pin 1. Execute Error ID` | `0000000` | `>>`
`[x]` | `6` | `T100: Pin 1. Number of Detected Patter...` | `0000` | `>>`
`[x]` | `7` | `T100: Pin 1. Number of Unselected` | `0000` | `>>`

`Select:` (Likely relates to a multi-select action for the checkboxes).
`Result Output at Skipped Tool` `(*) Output "0"` `( ) None`
`Saving Folder` | `USB:/cv-x/result/SD1_022/`
`Result File Name` | `[yymmdd]_[hhmmss].csv`

## 5. Interactive controls

- **Table Checkboxes:** Allow enabling/disabling specific data columns for the CSV output.
- **Select Data Button:** Adds new variables to the list.
- **`>>` Button:** Likely opens a context menu to change the variable mapped to that column index.

## 6. User expectation and workflow context

The user is defining the schema of the CSV file that will record inspection statistics. They are mapping specific properties of Tool `T100` (e.g., execution time, fail count) to columns in the output file.

## 7. Adjacent screens

- `27-output-settings-image-output-sd-card.jpg`: Outputting images rather than CSV data.

## 8. Data shown

- Tool properties and current dummy/preview values (all zeros).

## 9. Failure and edge states hinted

- Handling "Skipped Tools" is explicitly addressed (outputting "0" vs. leaving the CSV cell blank/null).

## 10. AI-consumption notes

- **Mapping to our app:** This is a crucial concept—Data Export Mapping. Users must be able to select properties from the runtime context (e.g., `tool[100].execution_time`, `tool[100].ng_count`) and map them to an export schema (like an array index for a CSV row or a PLC register).
