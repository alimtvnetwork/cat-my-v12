---
Source: assets/tools-images/08-tool-catalog-mathematical-operations.jpg
Screen: Tool Catalog — Mathematical Operations
Related-Spec: 21-app/40-tools.md
---

# 08 — Tool Catalog — Mathematical Operations

## 1. One-line purpose

A modal dialog presenting a single "Calculation" tool used to combine or compute mathematical expressions from the outputs of other inspection tools.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A 3x3 grid of large category buttons.
- **Middle Right (Description):** A text pane describing the "Mathematical Operations" category.
- **Bottom Half (Tool Selection):** The "Preferred Tool" area (relabeled to "Mathematical Operations") showing a single available tool.
- **Footer:** Tool ID display (`Tool ID T 106`) and Add/Cancel buttons.

## 3. Color palette and role

- **Backgrounds:** Light gray (#EAEAEA) for the modal body, dark gray (#4D4D4D) for the right description panel.
- **Selection State:** The "Mathematical Operations" category button is highlighted with an orange/amber background (#FFB300).
- **Text:** White text in the description pane, black text in the main modal body.
- **Tool Icons:** A gray tile with a mathematical symbols (+, -, x, ÷) icon.

## 4. Text transcription (grouped by region)

**Modal Header**
`Tool Catalog`

**Category Grid (Top Half)**
`Presence/ Absence`
`Flaw Detection`
`Alignment`
`Count`
`ID & OCR/OCV`
`Graphic Display`
`Mathematical Operations`
`Function List`
`Position Adjustment`

**Description Panel (Middle Right)**
`Mathematical Operations`
`Mathematical expressions can be performed using selected measurement or judgment result values from any of the inspection tools within the program.`
`Arithmetic, logical, comparison, trigonometric and geometric functions are available.`

**Preferred Tool Grid (Bottom Half)**
`Mathematical Operations`
`Calculation` (Icon button)

**Footer**
`Tool ID T 106`
`Add`, `Cancel`

## 5. Interactive controls

- **Category Buttons:** 9 toggle buttons.
- **Preferred Tool Buttons:** Only 1 selectable tile (`Calculation`).
- **Footer Buttons:** "Add" (disabled until the Calculation tool is clicked) and "Cancel".

## 6. User expectation and workflow context

The user arrived here from the "Add Tools" ribbon and clicked "Mathematical Operations". They intend to add a logical or mathematical step that doesn't inspect the image, but instead computes a result based on prior tools. For example, calculating the distance between the X/Y coordinates output by two different Alignment tools.

## 7. Adjacent screens

- `07-tool-catalog-graphic-display-line-circle-point.jpg`: Previous state.
- `09-function-list-position-adjustment-edge-tools.jpg`: Next state.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- Even though there is only one tool in this category, it is not auto-selected, requiring an explicit click to enable the "Add" button.

## 10. AI-consumption notes

- **Mapping to our app:** This acts as a logical gate or derived variable. In our architecture, this would be a `MathRule` or `LogicRule` that has references to the IDs of other rules instead of bounding box geometries.
