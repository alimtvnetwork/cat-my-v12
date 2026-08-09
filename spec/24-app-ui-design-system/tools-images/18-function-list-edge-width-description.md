---
Source: assets/tools-images/18-function-list-edge-width-description.jpg
Screen: Tool Catalog — Function List (Edge Width Detail)
Related-Spec: 21-app/40-tools.md
---

# 18 — Tool Catalog — Function List (Edge Width Detail)

## 1. One-line purpose

A state in the Function List where the `Edge Width` algorithm is selected, displaying its brief technical description.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A 3x3 grid of large category buttons.
- **Middle Right (Description):** A text pane describing the `Edge Width` tool.
- **Bottom Half (Tool Selection):** The "Function List" grid.
- **Footer:** Tool ID display (`Tool ID T 106`) and enabled Add/Cancel buttons.

## 3. Color palette and role

- **Backgrounds:** Light gray (#EAEAEA) for the modal body, dark gray (#4D4D4D) for the right description panel.
- **Selection State:** "Function List" category and "Edge Width" tool are highlighted (#FFB300).
- **Text:** White text in the description pane.

## 4. Text transcription (grouped by region)

**Modal Header**
`Tool Catalog`

**Description Panel (Middle Right)**
`Edge Width`
`Detects two edges in the inspection region and measures the width between them.`

**Function List Grid (Bottom Half)**
`Function List`
`Edge Position`
`Edge Angle`
`Edge Width` (Selected)
`Edge Pitch`
`Edge Pairs`
`Defect`
`Blob`
`Grayscale Blob`
`Profile Position`
`Profile Width`

**Footer**
`Tool ID T 106`
`Add`, `Cancel`

## 5. Interactive controls

- **Tool Buttons:** `Edge Width` is selected.
- **Add Button:** Fully enabled.

## 6. User expectation and workflow context

The user wants to measure the dimension (width/thickness) of a part and selects the core algorithm designed to find two opposing edges and compute the distance.

## 7. Adjacent screens

- `19-function-list-defect-description.jpg`: Selecting a different tool in the same view.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- None.

## 10. AI-consumption notes

- **Mapping to our app:** `Edge Width` maps directly to a 1D caliper tool in typical machine vision libraries. It operates by casting a line (or set of lines) across a region and finding two gradient peaks.
