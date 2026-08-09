---
Source: assets/tools-images/05-tool-catalog-alignment-preferred-tools.jpg
Screen: Tool Catalog — Alignment
Related-Spec: 21-app/40-tools.md
---

# 05 — Tool Catalog — Alignment

## 1. One-line purpose

A modal dialog presenting the catalog of inspection tools specifically categorized for geometric alignment, positioning, and measurement.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A 3x3 grid of large category buttons.
- **Middle Right (Description):** A text pane describing the "Alignment" category.
- **Bottom Half (Tool Selection):** The "Preferred Tool" area showing specific tools that fall under alignment.
- **Footer:** Tool ID display (`Tool ID T 106`) and Add/Cancel buttons.

## 3. Color palette and role

- **Backgrounds:** Light gray (#EAEAEA) for the modal body, dark gray (#4D4D4D) for the right description panel.
- **Selection State:** The "Alignment" category button is highlighted with an orange/amber background (#FFB300).
- **Text:** White text in the description pane, black text in the main modal body.
- **Tool Icons:** Icons prominently feature green crosses (targets/anchors) and geometric lines/circles on gray backgrounds.

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
`Alignment`
`This is the category of tools which output the position coordinates (X/Y) or the angle of the target object.`

**Preferred Tool Grid (Bottom Half)**
`What position or angle should be measured?`
`Pattern Match (Shading)`
`Pattern Match (Profile)`
`Edge Position`
`Line`
`Circle`
`Edge Slope`
`Edge to Circumference`
`Tip`
`Cluster`
`Dark or Bright Clusters`

**Footer**
`Tool ID T 106`
`Add`, `Cancel`

## 5. Interactive controls

- **Category Buttons:** 9 toggle buttons; clicking one switches the context of the modal.
- **Preferred Tool Buttons:** 10 selectable tiles for specific geometric and alignment algorithms.
- **Footer Buttons:** "Add" (disabled until a tool is selected) and "Cancel".

## 6. User expectation and workflow context

The user is browsing for a tool that returns coordinates (`X, Y`) or an angle (`Theta`) rather than a simple pass/fail judgment. These tools are often used as inputs to a "Position Adjustment" step (to anchor other tools) or to measure precise geometric dimensions.

## 7. Adjacent screens

- `04-tool-catalog-flaw-detection-preferred-tools.jpg`: Previous state of this modal.
- `06-tool-catalog-count-features.jpg`: Next state of this modal.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- "Add" button disabled because no specific preferred tool is clicked.

## 10. AI-consumption notes

- **Taxonomy:** Alignment tools in KEYENCE are geometric primitives (`Line`, `Circle`, `Edge`).
- Notice that `Pattern Match` appears in both "Presence/Absence" and "Alignment". This implies the underlying algorithm is the same, but the category determines the primary output expected by the user (a Pass/Fail score vs an X/Y coordinate). Our architecture should handle this either by having multiple modes per rule, or discrete rule kinds.
