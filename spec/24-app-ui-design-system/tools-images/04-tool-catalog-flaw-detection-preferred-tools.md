---
Source: assets/tools-images/04-tool-catalog-flaw-detection-preferred-tools.jpg
Screen: Tool Catalog — Flaw Detection
Related-Spec: 21-app/40-tools.md
---

# 04 — Tool Catalog — Flaw Detection

## 1. One-line purpose

A modal dialog presenting the catalog of inspection tools specifically categorized for surface flaw and defect detection.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A 3x3 grid of large category buttons.
- **Middle Right (Description):** A text pane describing the "Flaw Detection" category.
- **Bottom Half (Tool Selection):** The "Preferred Tool" area showing specific tools that fall under flaw detection.
- **Footer:** Tool ID display (`Tool ID T 106`) and Add/Cancel buttons.

## 3. Color palette and role

- **Backgrounds:** Light gray (#EAEAEA) for the modal body, dark gray (#4D4D4D) for the right description panel.
- **Selection State:** The "Flaw Detection" category button is highlighted with an orange/amber background (#FFB300).
- **Text:** White text in the description pane, black text in the main modal body.
- **Tool Icons:** Colorful abstract representations of defects (red spots on dark backgrounds, green shapes with red defects).

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
`Flaw Detection`
`This is the category of tools which inspect the appearance for such things as defect, dirt, burr or crack on the target object.`

**Preferred Tool Grid (Bottom Half)**
`What feature is useful for detecting the flaw?`
`Preferred Tool`
`Auto-Teach`
`Total Defect Area`
`Each Defect`
`Black & White Area`
`Contrast with Background`
`Flaw on a Line`
`Flaw on a Ring`
`Flaw on a Curve`

**Footer**
`Tool ID T 106`
`Add`, `Cancel`

## 5. Interactive controls

- **Category Buttons:** 9 toggle buttons; clicking one switches the context of the modal.
- **Preferred Tool Buttons:** Selectable tiles for specific defect algorithms. None are currently selected, so the "Add" button remains disabled.
- **Footer Buttons:** "Add" and "Cancel".
- **Auto-Teach Button:** A distinct left-aligned button that likely invokes a wizard to automatically determine the best tool based on a good/bad image sample.

## 6. User expectation and workflow context

The user arrived here from the "Add Tools" ribbon button and clicked the "Flaw Detection" category. They intend to add a rule to find scratches, burrs, or dirt on the manufactured part.

## 7. Adjacent screens

- `03-tool-catalog-presence-absence-preferred-tools.jpg`: The same modal with a different category selected.
- `05-tool-catalog-alignment-preferred-tools.jpg`: Another state of this modal.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- "Add" button disabled because no specific preferred tool is clicked.

## 10. AI-consumption notes

- **Taxonomy:** KEYENCE separates out flaw detection from standard presence/absence. The tools here (`Flaw on a Line`, `Flaw on a Ring`) are very specialized geometrical searches.
- In our system, these likely map to specialized rule variants under `EditorRuleKind.DEFECT` or `EditorRuleKind.EDGE`.
