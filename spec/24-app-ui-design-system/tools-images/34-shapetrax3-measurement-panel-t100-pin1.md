---
Source: assets/tools-images/34-shapetrax3-measurement-panel-t100-pin1.jpg
Screen: Tool Dashboard — T100 Pin 1 (ShapeTrax3)
Related-Spec: 21-app/40-tools.md
---

# 34 — Tool Dashboard — T100 Pin 1 (ShapeTrax3)

## 1. One-line purpose

The main overview dashboard for a specific configured tool (ShapeTrax3), showing its bounding boxes on the image and a table of current measurement results vs. pass/fail limits.

## 2. Full-frame layout

- **Top Ribbon:** Global navigation (Save, Edit, Global, Prog. Time), and tool workflow ribbon (`Add Tools`, tools like `Pin 1`, `Marking A`, etc.).
- **Left Pane:** Image Viewer showing a dark, blank field with nested blue rectangular bounding boxes (representing search regions and pattern regions).
- **Right Pane:** The Tool Dashboard for `T100 Pin 1`.
  - Header with icon and tool name `ShapeTrax3`.
  - A data table showing output variables (`Count`, `Judged Label`, `Pos. X`, `Pos. Y`, `Angle`, `Match %`, `Scale`) mapped against `Measured` values, `Lower` limits, and `Upper` limits.
  - Pagination controls `1/2` indicating more variables exist.
  - An `Edit` button at the bottom right.

## 3. Color palette and role

- **Backgrounds:** Dark gray UI theme. Right pane is light gray (#EAEAEA).
- **Ribbon:** Tool tabs in the ribbon have different colors. `Pin 1` is selected and colored orange.
- **Image Overlays:** Cyan/Blue lines denote Regions of Interest (ROI).

## 4. Text transcription (grouped by region)

**Top Ribbon**
`[+] Add Tools`
`[Pin 1]` (Orange) `[Marking A]` `[Marking B]` `[Marking C]` `[OVERALL MARKING]` `[Edge Width]`
`[Custom Menu]`

**Right Pane (Tool Dashboard)**
`T100  Pin 1`
`[Icon] ShapeTrax3`
`--------. - ms` (Execution Time, currently blank)

_(Data Table)_
| | `Measured` | `Lower` | `Upper` |
|---|---|---|---|
| `Count` | `---` | `---` | `---` |
| `Judged Label` | | | |
| `Pos. X` | `---` | `---` | `---` |
| `Pos. Y` | `---` | `---` | `---` |
| `Angle` | `---` | `---` | `---` |
| `Match %` | `---` | `30.000` | `---` |
| `Scale` | `---` | `---` | `---` |

`1/2 [ < ] [ > ]`
`[Edit]`

## 5. Interactive controls

- **Ribbon Tabs:** Switch between different tools in the program sequence.
- **Edit Button:** Enters the deep configuration mode for the current tool (which is seen in subsequent screenshots).
- **Pagination:** Flips the data table to see more output variables.

## 6. User expectation and workflow context

The user has added several tools to their program (Pin 1, Marking A, etc.). They select "Pin 1" to check if it's currently passing or failing on the live image. Finding it blank/unconfigured, they will click `Edit` to set it up.

## 7. Adjacent screens

- `35-shapetrax3-reference-image-detection-conditions.jpg`: The screen that appears after clicking `Edit`.

## 8. Data shown

- Default limits (Match % lower limit is `30.000`).

## 9. Failure and edge states hinted

- When a tool hasn't run or has no valid image, measurements display as `---`.

## 10. AI-consumption notes

- **Mapping to our app:** This is the equivalent of our `PropertyPanel` when a Node is selected in the graph but NOT in full edit mode. It provides a read-only summary of the node's outputs, current values, and tolerance limits (Upper/Lower bounds for NG judgment).
