---
Source: assets/tools-images/25-function-list-shapetrax2-description.jpg
Screen: Tool Catalog — Function List (ShapeTrax2 Detail)
Related-Spec: 21-app/40-tools.md
---

# 25 — Tool Catalog — Function List (ShapeTrax2 Detail)

## 1. One-line purpose

A state in the Function List where the legacy `ShapeTrax2` algorithm is selected, displaying its technical description.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A 3x3 grid of large category buttons.
- **Middle Right (Description):** A text pane describing the `ShapeTrax2` tool.
- **Bottom Half (Tool Selection):** The "Function List" grid. The scrollbar is at the absolute bottom.
- **Footer:** Tool ID display (`Tool ID T 106`) and enabled Add/Cancel buttons.

## 3. Color palette and role

- **Backgrounds:** Light gray (#EAEAEA) for the modal body, dark gray (#4D4D4D) for the right description panel.
- **Selection State:** "Function List" category and "ShapeTrax2" tool are highlighted (#FFB300).
- **Text:** White text in the description pane.

## 4. Text transcription (grouped by region)

**Modal Header**
`Tool Catalog`

**Description Panel (Middle Right)**
`ShapeTrax2`
`Detects the most similar portion to the profile information registered in advance and outputs the position, angle or correlation value of the detected object.`
`The object is chased even if a crack, overlapping or surface variation exists on it because the tool searches the pattern using the profile information.`

**Function List Grid (Bottom Half)**
`Function List`
`1D Code Reader`
`2D Code Reader`
`Auto-Teach Insp. (Pattern Search)`
`Auto-Teach Insp. (ShapeTrax2)`
`Auto-Teach Insp. (PatternTrax)`
`ShapeTrax2` (Selected)
`OCR`
`Image Region Generator`

**Footer**
`Tool ID T 106`
`Add`, `Cancel`

## 5. Interactive controls

- **Tool Buttons:** `ShapeTrax2` is selected.
- **Add Button:** Fully enabled.

## 6. User expectation and workflow context

The user scrolled to the absolute bottom of the catalog and selected the older/legacy contour matching tool.

## 7. Adjacent screens

- `24-function-list-ocr-shapetrax-tools.jpg`: The state when `OCR` was selected.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- None.

## 10. AI-consumption notes

- **Mapping to our app:** The description is identical to `ShapeTrax3`. KEYENCE keeps legacy algorithms (like `ShapeTrax2` and `OCR`) in the catalog so older programs ported to new controllers don't break, but they share the identical UX pattern.
