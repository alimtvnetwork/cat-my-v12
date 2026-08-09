---
Source: assets/tools-images/19-function-list-defect-description.jpg
Screen: Tool Catalog — Function List (Defect Detail)
Related-Spec: 21-app/40-tools.md
---

# 19 — Tool Catalog — Function List (Defect Detail)

## 1. One-line purpose

A state in the Function List where the `Defect` algorithm is selected, displaying its detailed technical description.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A 3x3 grid of large category buttons.
- **Middle Right (Description):** A text pane describing the `Defect` tool.
- **Bottom Half (Tool Selection):** The "Function List" grid.
- **Footer:** Tool ID display (`Tool ID T 106`) and enabled Add/Cancel buttons.

## 3. Color palette and role

- **Backgrounds:** Light gray (#EAEAEA) for the modal body, dark gray (#4D4D4D) for the right description panel.
- **Selection State:** "Function List" category and "Defect" tool are highlighted (#FFB300).
- **Text:** White text in the description pane.

## 4. Text transcription (grouped by region)

**Modal Header**
`Tool Catalog`

**Description Panel (Middle Right)**
`Defect`
`Recognizes the segment with a intensity difference equal to or above a certain level in the inspection region as a defect or dirt and outputs the total amount (size) of the detected defect or dirt.`
`In addition, it is possible to group successive segments into groups and output the number of defects and their respective positions.`

**Function List Grid (Bottom Half)**
`Function List`
`Edge Position`
`Edge Angle`
`Edge Width`
`Edge Pitch`
`Edge Pairs`
`Defect` (Selected)
`Blob`
`Grayscale Blob`
`Profile Position`
`Profile Width`

**Footer**
`Tool ID T 106`
`Add`, `Cancel`

## 5. Interactive controls

- **Tool Buttons:** `Defect` is selected.
- **Add Button:** Fully enabled.

## 6. User expectation and workflow context

The user wants to find scratches, stains, or missing material on a surface. This description confirms the tool works via local intensity differences (not just an absolute threshold like Blob), making it robust to uneven lighting.

## 7. Adjacent screens

- `18-function-list-edge-width-description.jpg`: A previously selected tool in the same view.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- None.

## 10. AI-consumption notes

- **Mapping to our app:** `Defect` is a distinct primitive from `Blob`. While Blob uses absolute thresholding (binarization), Defect likely uses a high-pass filter, morphological operations, or a dynamic background subtraction to find _local_ variations (intensity differences). We should capture this distinction in our domain model.
