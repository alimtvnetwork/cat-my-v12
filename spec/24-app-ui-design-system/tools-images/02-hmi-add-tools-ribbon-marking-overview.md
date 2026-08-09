---
Source: assets/tools-images/02-hmi-add-tools-ribbon-marking-overview.jpg
Screen: Edit mode — add tools ribbon overview
Related-Spec: 21-app/60-editor-shell.md
---

# 02 — Edit mode — add tools ribbon overview

## 1. One-line purpose

The main configuration environment ("Edit Mode") where engineers construct inspections by adding tools and setting up rules.

## 2. Full-frame layout

- **Titlebar (top):** Program selector, save/edit dropdowns, and global stats.
- **Top ribbon (~15% height):** A horizontal tool palette containing "Add Tools", "Position Adj.", and a scrollable carousel of configured tool thumbnails (Pin 1, Marking A, etc.).
- **Left canvas (~55% width):** The active image viewport with ROI overlays, zoom controls, and a display-mode dropdown ("Raw 2").
- **Right rail (~45% width):** The properties inspector for the currently selected tool (in this case, "T100 Pin 1 ShapeTrax3").
- **Status bar (bottom):** System status and mode transition buttons ("Register Image", "Run").

## 3. Color palette and role

- **Backgrounds:** Light gray (#E0E0E0) for the top ribbon and panel headers, dark gray (#2C2C2C) for property panels, black (#000000) for the canvas.
- **Selection/Active State:** Golden yellow/orange (#FFB300) indicates the active tool thumbnail in the ribbon and the active canvas border. Deep blue (#1C3F60) is used as the header background for the active tool property panel.
- **Borders/Lines:** Cyan (#00BFFF) for canvas ROI rectangles. Gray for panel dividers.
- **Text:** White on dark backgrounds, black on light backgrounds.

## 4. Text transcription (grouped by region)

**Titlebar**
`1 Set022 SUPERTHIN QFN 5X5_REV1`
`Save`, `Edit ▼`, `Global ▼`
`Error List` (with warning triangle)
`Prog. Time ms`, `Interval ms`
`Execute`, `Output`, `Utility`
`Go to Run Mode`
`Total Status --`

**Ribbon**
`Set Camera`
`Add Tools`
`Position Adj.`
`Pin 1`
`Marking A`
`Marking B`
`Marking C`
`OVERALL MARKING`
`Edge Width`
`Custom Menu`

**Left rail (Canvas)**
`Current Image ▼`, `Raw 2 ▼`
Zoom icons (fit, in, out), `40%`, arrow icons.

**Right rail (Properties)**
`T100 Pin 1`
`ShapeTrax3`
`--------. - ms`
`Measured`, `Lower`, `Upper`
`Count`, `----`, `----`
`Judged Label`, `Measured`, `Lower`, `Upper`
`Pos. X`, `--------`, `--------`
`Pos. Y`, `--------`, `--------`
`Angle`, `---.---`, `---.---`
`Match %`, `30.000`, `---.---`
`Scale`, `--.---`, `--.---`
`1/2 ◀ ▶`
`Edit`

**Status bar**
`Register Image`, `▶ Run`

## 5. Interactive controls

- **Mode switcher:** "Go to Run Mode" (button) transitions back to the main operator screen.
- **Ribbon Thumbnails:** Selectable tiles representing instances of tools. "Pin 1" is currently selected (highlighted orange).
- **Canvas Toolbar:** Dropdowns for image source ("Current Image"), filter mode ("Raw 2"), and zoom/pan controls.
- **Properties Panel:** Contains data rows with dashed lines indicating unmeasured or null states. The "Edit" button at the bottom opens the detailed settings for this specific tool.
- **Add Tools:** Button to open the tool catalog modal.

## 6. User expectation and workflow context

An engineer or technician is here to author or modify a vision program. They select a tool from the ribbon to view its summary in the right rail. To change parameters, they click "Edit" on the right rail. To add new inspections, they click "Add Tools".

## 7. Adjacent screens

- `01-hmi-main-run-screen-measurement-list.jpg`: The run mode counterpart of this screen.
- `03-tool-catalog-presence-absence-preferred-tools.jpg`: The modal that appears when "Add Tools" is clicked.

## 8. Data shown

- The configured program name ("Set022 SUPERTHIN QFN 5X5_REV1").
- A list of all tools in the program, represented as visual thumbnails.
- The current evaluation metrics for the selected "ShapeTrax3" tool (Match %, Pos X, Pos Y, Angle).

## 9. Failure and edge states hinted

- An "Error List" button with an orange warning icon is visible in the titlebar, indicating an active configuration issue or system error.
- Dashed lines (`----`) in the properties panel indicate that the tool has not been executed yet or lacks a valid measurement.

## 10. AI-consumption notes

- **KEYENCE equivalents:** "Add Tools" triggers the `Tool Catalog`. The ribbon of thumbnails maps to our "Layers Panel" or "Rule List". The right rail maps to our "Properties Panel" / "Inspector".
- Notice the clear separation between the "Overview" properties (shown here) and the deep "Edit" properties (which requires another click). We follow a similar split in our editor layout.
- `ShapeTrax3` is a specific KEYENCE proprietary pattern matching algorithm. In our system, this maps to `PatternMatchRule` or `EditorRuleKind.PATTERN`.
