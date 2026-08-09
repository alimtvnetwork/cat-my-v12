---
Source: assets/tools-images/09-function-list-position-adjustment-edge-tools.jpg
Screen: Tool Catalog — Function List (Page 1)
Related-Spec: 21-app/40-tools.md
---

# 09 — Tool Catalog — Function List (Page 1)

## 1. One-line purpose

A modal dialog showing an unfiltered, flat list of all available inspection tools classified purely by their underlying detection algorithm rather than user intent.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A 3x3 grid of large category buttons.
- **Middle Right (Description):** A text pane describing the "Function List" category.
- **Bottom Half (Tool Selection):** A scrollable area titled "Function List" containing a grid of tools. A vertical scrollbar is visible on the right side.
- **Footer:** Tool ID display (`Tool ID T 106`) and Add/Cancel buttons.

## 3. Color palette and role

- **Backgrounds:** Light gray (#EAEAEA) for the modal body, dark gray (#4D4D4D) for the right description panel.
- **Selection State:** The "Function List" category button is highlighted with an orange/amber background (#FFB300).
- **Text:** White text in the description pane, black text in the main modal body.
- **Tool Icons:** A mix of icons showing patterns, edges, and areas with various green targets.

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

**Function List Grid (Bottom Half, Page 1)**
`Function List`
`Auto-Teach Inspection`
`Area`
`Pattern Search`
`ShapeTrax3`
`PatternTrax`
`Edge Position`
`Edge Angle`
`Edge Width`
`Edge Pitch`
`Edge Pairs`

**Footer**
`Tool ID T 106`
`Add`, `Cancel`

## 5. Interactive controls

- **Category Buttons:** 9 toggle buttons.
- **Function List Buttons:** A grid of selectable tiles representing raw algorithms.
- **Scrollbar:** A vertical scrollbar on the right side of the tool grid, currently at the top position.
- **Footer Buttons:** "Add" (disabled) and "Cancel".

## 6. User expectation and workflow context

Power users who already know exactly which algorithm they want (e.g., they know they want to use `ShapeTrax3`) will use this "Function List" view to skip the intent-based filtering (like "Presence/Absence") and select the algorithm directly.

## 7. Adjacent screens

- `08-tool-catalog-mathematical-operations.jpg`: Previous state.
- `10-function-list-defect-blob-graytype.jpg`: The next page of this exact same list, reached by scrolling down.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- None explicitly, other than the disabled Add button.

## 10. AI-consumption notes

- **Mapping to our app:** The "Function List" is essentially an "All Tools" or "Raw Algorithms" flat list view. This confirms that the KEYENCE taxonomy has a many-to-many relationship: a single algorithm (like `Pattern Search`) can appear under multiple intent categories, and the "Function List" is the raw list of algorithms.
