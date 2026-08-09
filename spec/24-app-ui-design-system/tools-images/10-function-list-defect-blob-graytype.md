---
Source: assets/tools-images/10-function-list-defect-blob-graytype.jpg
Screen: Tool Catalog — Function List (Page 2)
Related-Spec: 21-app/40-tools.md
---

# 10 — Tool Catalog — Function List (Page 2)

## 1. One-line purpose

A continuation (scrolled down) of the flat list of all available inspection algorithms.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A 3x3 grid of large category buttons.
- **Middle Right (Description):** A text pane describing the "Function List" category.
- **Bottom Half (Tool Selection):** A scrollable area titled "Function List" containing a grid of tools. The vertical scrollbar handle is at the bottom, indicating this is the end of the list.
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

**Function List Grid (Bottom Half, Page 2)**
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
- **Function List Buttons:** Selectable tiles representing raw algorithms. Noticeably, `Color Detection` and `Color Grouping` are disabled (grayed out), likely because the camera in use is monochrome.
- **Scrollbar:** A vertical scrollbar on the right side of the tool grid, currently at the bottom position.
- **Footer Buttons:** "Add" (disabled) and "Cancel".

## 6. User expectation and workflow context

The user scrolled down in the Function List to find an algorithm like OCR or Blob analysis directly, skipping the intent-based categorization.

## 7. Adjacent screens

- `09-function-list-position-adjustment-edge-tools.jpg`: The top half (Page 1) of this scrolled list.
- `11-function-list-defect-intensity-color.jpg`: Likely an expansion or details panel related to these tools.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- Color-based tools (`Color Detection`, `Color Grouping`) are disabled, implying the system restricts algorithms based on hardware capability (monochrome vs color camera).

## 10. AI-consumption notes

- **Mapping to our app:** This completes the catalog of raw algorithms available in the KEYENCE system. When building our `EditorRuleKind` enum, we should account for primitives like `Blob`, `OCR2`, `Profile`, and `Intensity`.
