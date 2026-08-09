---
Source: assets/tools-images/06-tool-catalog-count-features.jpg
Screen: Tool Catalog — Count
Related-Spec: 21-app/40-tools.md
---

# 06 — Tool Catalog — Count

## 1. One-line purpose

A modal dialog presenting the catalog of inspection tools specifically categorized for counting discrete objects, features, or edges.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A 3x3 grid of large category buttons.
- **Middle Right (Description):** A text pane describing the "Count" category with bulleted tips.
- **Bottom Half (Tool Selection):** The "Preferred Tool" area showing specific counting tools.
- **Footer:** Tool ID display (`Tool ID T 106`) and Add/Cancel buttons.

## 3. Color palette and role

- **Backgrounds:** Light gray (#EAEAEA) for the modal body, dark gray (#4D4D4D) for the right description panel.
- **Selection State:** The "Count" category button is highlighted with an orange/amber background (#FFB300).
- **Text:** White text in the description pane, black text in the main modal body.
- **Tool Icons:** Icons feature multiple green '+' symbols on top of geometric objects to indicate counting.

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
`Count`
`This is the category of the tools counting the quantity of a target object.`
`[Tip]`
`Use the tools in this category when counting:`
`- the number of multiple objects within the view range`
`- the number of components, characters and marks in an object`
`- the number of targets detected by edges.`

**Preferred Tool Grid (Bottom Half)**
`What feature is useful to count the target?`
`Cluster`
`Edge`
`Pattern Match (Shading)`
`Pattern Match (Profile)`
`Dark or Bright Clusters`

**Footer**
`Tool ID T 106`
`Add`, `Cancel`

## 5. Interactive controls

- **Category Buttons:** 9 toggle buttons; clicking one switches the context of the modal.
- **Preferred Tool Buttons:** 5 selectable tiles for specific counting algorithms.
- **Footer Buttons:** "Add" (disabled until a tool is selected) and "Cancel".

## 6. User expectation and workflow context

The user arrived here from the "Add Tools" ribbon and clicked "Count". They want to set up an inspection that returns an integer (N > 0) rather than a simple pass/fail or single X/Y coordinate. For instance, counting the number of pins on an IC or the number of drilled holes.

## 7. Adjacent screens

- `05-tool-catalog-alignment-preferred-tools.jpg`: Previous state.
- `07-tool-catalog-graphic-display-line-circle-point.jpg`: Next state.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- "Add" button disabled because no specific preferred tool is clicked.

## 10. AI-consumption notes

- **Taxonomy:** Counting is a specialized output format of standard tools (e.g. `Pattern Match` appears here again, but in a mode that returns multiple matches instead of just the best one).
- In our system, this mapping suggests that rules like `PatternMatchRule` need a property `maxMatches` or `countMode` to support this use case, rather than creating a completely separate `CountPatternMatchRule`.
