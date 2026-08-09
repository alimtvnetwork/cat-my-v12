---
Source: assets/tools-images/24-function-list-ocr-shapetrax-tools.jpg
Screen: Tool Catalog — Function List (OCR Detail)
Related-Spec: 21-app/40-tools.md
---

# 24 — Tool Catalog — Function List (OCR Detail)

## 1. One-line purpose

A state in the Function List where the legacy `OCR` algorithm is selected, displaying its technical description.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A 3x3 grid of large category buttons.
- **Middle Right (Description):** A text pane describing the `OCR` tool.
- **Bottom Half (Tool Selection):** The "Function List" grid. The scrollbar is at the absolute bottom.
- **Footer:** Tool ID display (`Tool ID T 106`) and enabled Add/Cancel buttons.

## 3. Color palette and role

- **Backgrounds:** Light gray (#EAEAEA) for the modal body, dark gray (#4D4D4D) for the right description panel.
- **Selection State:** "Function List" category and "OCR" tool are highlighted (#FFB300).
- **Text:** White text in the description pane.

## 4. Text transcription (grouped by region)

**Modal Header**
`Tool Catalog`

**Description Panel (Middle Right)**
`OCR`
`Extracts character information from the inspection region and matches it to the library data to recognize the characters string present.`
`The string can be output externally and used for judgment of acceptance by matching to set characters or referencing the built-in calendar.`

**Function List Grid (Bottom Half)**
`Function List`
`1D Code Reader`
`2D Code Reader`
`Auto-Teach Insp. (Pattern Search)`
`Auto-Teach Insp. (ShapeTrax2)`
`Auto-Teach Insp. (PatternTrax)`
`ShapeTrax2`
`OCR` (Selected)
`Image Region Generator`

**Footer**
`Tool ID T 106`
`Add`, `Cancel`

## 5. Interactive controls

- **Tool Buttons:** `OCR` is selected. Note the full name of the last tool is revealed as `Image Region Generator`.
- **Add Button:** Fully enabled.

## 6. User expectation and workflow context

The user scrolled to the absolute bottom of the catalog and selected the older/legacy OCR tool.

## 7. Adjacent screens

- `25-function-list-shapetrax2-description.jpg`: The state when `ShapeTrax2` is selected.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- None.

## 10. AI-consumption notes

- **Mapping to our app:** This confirms `OCR` and `OCR2` are separate tools in the catalog. The description for `OCR` is very similar to `OCR2`, suggesting `OCR2` is likely just a more robust algorithmic update but shares the same UI properties.
