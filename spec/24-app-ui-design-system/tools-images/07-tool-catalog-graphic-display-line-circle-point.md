---
Source: assets/tools-images/07-tool-catalog-graphic-display-line-circle-point.jpg
Screen: Tool Catalog — Graphic Display
Related-Spec: 21-app/40-tools.md
---

# 07 — Tool Catalog — Graphic Display

## 1. One-line purpose

A modal dialog presenting a catalog of tools that solely render static reference graphics (lines, circles, points, scales) on the operator screen, without performing inspection logic.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A 3x3 grid of large category buttons.
- **Middle Right (Description):** A text pane describing the "Graphic Display" category.
- **Bottom Half (Tool Selection):** The "Preferred Tool" area showing specific graphical primitives.
- **Footer:** Tool ID display (`Tool ID T 106`) and Add/Cancel buttons.

## 3. Color palette and role

- **Backgrounds:** Light gray (#EAEAEA) for the modal body, dark gray (#4D4D4D) for the right description panel.
- **Selection State:** The "Graphic Display" category button is highlighted with an orange/amber background (#FFB300).
- **Text:** White text in the description pane, black text in the main modal body.
- **Tool Icons:** Icons are minimalist white lines and shapes on dark square backgrounds.

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
`Graphic Display`
`This is the category of tools that can be used to graphically display items such as lines, circles, points and scales on the inspection screen.`

**Preferred Tool Grid (Bottom Half)**
`What type of graphic should be displayed?`
`Line Display`
`Circle Display`
`Point Display`
`Scale Display`

**Footer**
`Tool ID T 106`
`Add`, `Cancel`

## 5. Interactive controls

- **Category Buttons:** 9 toggle buttons.
- **Preferred Tool Buttons:** 4 selectable tiles representing static drawing tools.
- **Footer Buttons:** "Add" (disabled until a tool is selected) and "Cancel".

## 6. User expectation and workflow context

The user arrived here from the "Add Tools" ribbon and clicked "Graphic Display". They want to overlay a persistent visual aid for the operator—for example, a crosshair in the center of the screen, or a circle indicating the expected position of a part—to help operators manually align parts.

## 7. Adjacent screens

- `06-tool-catalog-count-features.jpg`: Previous state.
- `08-tool-catalog-mathematical-operations.jpg`: Next state.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- "Add" button disabled because no specific preferred tool is clicked.

## 10. AI-consumption notes

- **Mapping to our app:** Graphic Display tools are essentially "UI Overlays". They don't have inputs from the image and don't output pass/fail judgments. They simply serialize drawing commands.
- If we implement this, they would map to a `EditorRuleKind.GRAPHIC` where the properties are purely geometric coordinates and stroke styles.
