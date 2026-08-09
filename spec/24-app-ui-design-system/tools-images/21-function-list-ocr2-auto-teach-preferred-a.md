---
Source: assets/tools-images/21-function-list-ocr2-auto-teach-preferred-a.jpg
Screen: Tool Catalog — Function List (OCR2 Detail)
Related-Spec: 21-app/40-tools.md
---

# 21 — Tool Catalog — Function List (OCR2 Detail)

## 1. One-line purpose

A state in the Function List where the `OCR2` algorithm is selected, displaying its technical description.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A 3x3 grid of large category buttons.
- **Middle Right (Description):** A text pane describing the `OCR2` tool.
- **Bottom Half (Tool Selection):** The "Function List" grid.
- **Footer:** Tool ID display (`Tool ID T 106`) and enabled Add/Cancel buttons.

## 3. Color palette and role

- **Backgrounds:** Light gray (#EAEAEA) for the modal body, dark gray (#4D4D4D) for the right description panel.
- **Selection State:** "Function List" category and "OCR2" tool are highlighted (#FFB300).
- **Text:** White text in the description pane.

## 4. Text transcription (grouped by region)

**Modal Header**
`Tool Catalog`

**Description Panel (Middle Right)**
`OCR2`
`Recognizes strings by extracting the string information within the inspection region and then matching it against the library data. The string that was recognized can be output externally and used for pass/fail judgment by comparing the string with the built-in calendar.`

**Function List Grid (Bottom Half)**
`Function List`
`Profile Defect`
`Intensity`
`Color Detection`
`Color Grouping`
`OCR2` (Selected)
`1D Code Reader`
`2D Code Reader`
`Auto-Teach Insp. (Pattern Search)`
`Auto-Teach Insp. (ShapeTrax2)`
`Auto-Teach Insp. (PatternTrax)`

**Footer**
`Tool ID T 106`
`Add`, `Cancel`

## 5. Interactive controls

- **Tool Buttons:** `OCR2` is selected.
- **Add Button:** Fully enabled.

## 6. User expectation and workflow context

The user wants to read text (dates, lot codes, serial numbers) and selects OCR2, which is the newer/advanced Optical Character Recognition tool in the KEYENCE catalog.

## 7. Adjacent screens

- `22-function-list-ocr2-auto-teach-preferred-b.jpg`: Duplicate/similar shot.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- None.

## 10. AI-consumption notes

- **Mapping to our app:** `OCR2` is the primary text reading tool. It includes built-in logic for calendar matching (e.g., verifying an expiration date format). We should model this as `EditorRuleKind.OCR` with properties for format validation strings and dictionary sets.
