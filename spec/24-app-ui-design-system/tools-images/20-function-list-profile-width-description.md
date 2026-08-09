---
Source: assets/tools-images/20-function-list-profile-width-description.jpg
Screen: Tool Catalog — Function List (Profile Width Detail)
Related-Spec: 21-app/40-tools.md
---

# 20 — Tool Catalog — Function List (Profile Width Detail)

## 1. One-line purpose

A state in the Function List where the `Profile Width` algorithm is selected, displaying its technical description.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A 3x3 grid of large category buttons.
- **Middle Right (Description):** A text pane describing the `Profile Width` tool.
- **Bottom Half (Tool Selection):** The "Function List" grid. A third row of tools is partially visible below the second row.
- **Footer:** Tool ID display (`Tool ID T 106`) and enabled Add/Cancel buttons.

## 3. Color palette and role

- **Backgrounds:** Light gray (#EAEAEA) for the modal body, dark gray (#4D4D4D) for the right description panel.
- **Selection State:** "Function List" category and "Profile Width" tool are highlighted (#FFB300).
- **Text:** White text in the description pane.

## 4. Text transcription (grouped by region)

**Modal Header**
`Tool Catalog`

**Description Panel (Middle Right)**
`Profile Width`
`Outputs the width between multiple edges measured in the inspection region.`
`This tool is useful because the maximum and minimum width in a certain range can be measured at one time.`

**Function List Grid (Bottom Half)**
`Function List`
`Edge Position`
`Edge Angle`
`Edge Width`
`Edge Pitch`
`Edge Pairs`
`Defect`
`Blob`
`Grayscale Blob`
`Profile Position`
`Profile Width` (Selected)
_(Partially visible third row showing icons for Profile Defect, Intensity, Color Detection, etc.)_

**Footer**
`Tool ID T 106`
`Add`, `Cancel`

## 5. Interactive controls

- **Tool Buttons:** `Profile Width` is selected.
- **Scrollbar:** Scrolled slightly lower than in previous screenshots to reveal the third row.
- **Add Button:** Fully enabled.

## 6. User expectation and workflow context

The user wants to measure the thickness of a part along a wide edge (e.g., checking for taper or unevenness). This tool differs from `Edge Width` by casting _multiple_ parallel edge lines across a region to find min/max/average widths.

## 7. Adjacent screens

- `19-function-list-defect-description.jpg`: A previously selected tool in the same view.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- None.

## 10. AI-consumption notes

- **Mapping to our app:** `Profile Width` (often called a "multi-caliper" or "multi-edge" tool) is a critical quality inspection primitive. It returns an array of measurements rather than a single scalar. Our rule output system should support arrays of geometric results.
