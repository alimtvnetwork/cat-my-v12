---
Source: assets/tools-images/13-function-list-ocr2-detail-panel.jpg
Screen: Tool Catalog — Function List (Absolute Bottom)
Related-Spec: 21-app/40-tools.md
---

# 13 — Tool Catalog — Function List (Absolute Bottom)

## 1. One-line purpose

The absolute bottom of the flat list of all available inspection algorithms.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A 3x3 grid of large category buttons.
- **Middle Right (Description):** A text pane describing the "Function List" category.
- **Bottom Half (Tool Selection):** A scrollable area titled "Function List" containing a grid of tools. The scrollbar is at the absolute bottom.
- **Footer:** Tool ID display (`Tool ID T 106`) and Add/Cancel buttons.

## 3. Color palette and role

- **Backgrounds:** Light gray (#EAEAEA) for the modal body, dark gray (#4D4D4D) for the right description panel.
- **Selection State:** The "Function List" category button is highlighted with an orange/amber background (#FFB300).
- **Text:** White text in the description pane, black text in the main modal body.
- **Tool Icons:** Icons illustrating text reading (OCR) and region extraction.

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
`ShapeTrax2`
`OCR`
`Image Region`

**Footer**
`Tool ID T 106`
`Add`, `Cancel`

## 5. Interactive controls

- **Category Buttons:** 9 toggle buttons.
- **Function List Buttons:** Selectable tiles representing raw algorithms.
- **Scrollbar:** A vertical scrollbar on the right side of the tool grid, positioned at the bottom.
- **Footer Buttons:** "Add" (disabled) and "Cancel".

## 6. User expectation and workflow context

The user has scrolled to the very bottom of the Function List. This is the end of the catalog.

## 7. Adjacent screens

- `12-function-list-ocr-and-code-reader.jpg`: The previous scroll state.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- None explicitly.

## 10. AI-consumption notes

- **Mapping to our app:** This reveals `OCR` (the legacy version of `OCR2`), `ShapeTrax2` (the legacy version of `ShapeTrax3`), and `Image Region` (a utility tool). This completes the exhaustive list of algorithms available in the KEYENCE catalog.
