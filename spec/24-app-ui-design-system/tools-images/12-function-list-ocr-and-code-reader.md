---
Source: assets/tools-images/12-function-list-ocr-and-code-reader.jpg
Screen: Tool Catalog — Function List (Page 3)
Related-Spec: 21-app/40-tools.md
---

# 12 — Tool Catalog — Function List (Page 3)

## 1. One-line purpose

A continuation (scrolled further down) of the flat list of all available inspection algorithms, revealing code reading and auto-teach algorithms.

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
- **Tool Icons:** Icons illustrating barcodes, 2D matrices, and auto-teach patterns.

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
`Profile Defect`
`Intensity`
`Color Detection`
`Color Grouping`
`OCR2`
`1D Code Reader`
`2D Code Reader`
`Auto-Teach Insp. (Pattern Search)`
`Auto-Teach Insp. (ShapeTrax2)`
`Auto-Teach Insp. (PatternTrax)`

**Footer**
`Tool ID T 106`
`Add`, `Cancel`

## 5. Interactive controls

- **Category Buttons:** 9 toggle buttons.
- **Function List Buttons:** Selectable tiles representing raw algorithms.
- **Scrollbar:** A vertical scrollbar on the right side of the tool grid, currently near the bottom.
- **Footer Buttons:** "Add" (disabled) and "Cancel".

## 6. User expectation and workflow context

The user scrolled down in the Function List to find ID reading tools (barcodes, QR codes) or specialized auto-teaching variants of pattern search algorithms.

## 7. Adjacent screens

- `11-function-list-defect-intensity-color.jpg`: The previous scroll state.
- `13-function-list-ocr2-detail-panel.jpg`: The final scroll state at the bottom of the list.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- Color tools remain disabled.

## 10. AI-consumption notes

- **Mapping to our app:** This introduces `1D Code Reader` and `2D Code Reader` which should be added to our `EditorRuleKind` taxonomy as `BARCODE_1D` and `BARCODE_2D` respectively. The `Auto-Teach` variants indicate compound tools or wizards that internally configure a pattern match.
