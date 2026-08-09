---
Source: assets/tools-images/11-function-list-defect-intensity-color.jpg
Screen: Tool Catalog — Function List (Intermediate Scroll)
Related-Spec: 21-app/40-tools.md
---

# 11 — Tool Catalog — Function List (Intermediate Scroll)

## 1. One-line purpose

An intermediate scroll state of the flat list of all available inspection algorithms.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A 3x3 grid of large category buttons.
- **Middle Right (Description):** A text pane describing the "Function List" category.
- **Bottom Half (Tool Selection):** A scrollable area titled "Function List" containing a grid of tools.
- **Footer:** Tool ID display (`Tool ID T 106`) and Add/Cancel buttons.

## 3. Color palette and role

- **Backgrounds:** Light gray (#EAEAEA) for the modal body, dark gray (#4D4D4D) for the right description panel.
- **Selection State:** The "Function List" category button is highlighted with an orange/amber background (#FFB300).
- **Text:** White text in the description pane, black text in the main modal body.
- **Tool Icons:** Icons illustrating defects, blobs, profiles, and color detection.

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
`Function List`
`This is the category of tools classified by detection algorithm.`

**Function List Grid (Bottom Half)**
`Function List`
`Defect`
`Blob`
`Grayscale Blob`
`Profile Position`
`Profile Width`
`Profile Defect`
`Intensity`
`Color Detection` (Dimmed out)
`Color Grouping` (Dimmed out)
`OCR2`

**Footer**
`Tool ID T 106`
`Add`, `Cancel`

## 5. Interactive controls

- **Category Buttons:** 9 toggle buttons.
- **Function List Buttons:** Selectable tiles representing raw algorithms. `Color Detection` and `Color Grouping` are disabled.
- **Scrollbar:** A vertical scrollbar on the right side of the tool grid, currently in the middle-bottom position.
- **Footer Buttons:** "Add" (disabled) and "Cancel".

## 6. User expectation and workflow context

The user is scrolling through the list of all available algorithms to locate a specific tool by its internal name, bypassing the intent-based categorization.

## 7. Adjacent screens

- `09-function-list-position-adjustment-edge-tools.jpg`: The top half of this scrolled list.
- `12-function-list-ocr-and-code-reader.jpg`: Scrolled further down.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- Color-based tools are disabled, implying a monochrome camera constraint.

## 10. AI-consumption notes

- **Mapping to our app:** Similar to Image 10, this documents the availability of blob analysis, defect detection, and OCR primitives. The redundancy across screenshots 10 and 11 indicates the user wanted to capture the exact UI scroll state transition, confirming the full breadth of the grid.
