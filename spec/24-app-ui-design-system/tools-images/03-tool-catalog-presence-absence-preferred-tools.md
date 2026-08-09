---
Source: assets/tools-images/03-tool-catalog-presence-absence-preferred-tools.jpg
Screen: Tool Catalog — Presence/Absence
Related-Spec: 21-app/40-tools.md
---

# 03 — Tool Catalog — Presence/Absence

## 1. One-line purpose

A modal dialog that allows the user to browse and select a new inspection tool to add to their program, categorized by high-level purpose.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A grid of 9 large square buttons representing high-level tool families (e.g., Presence/Absence, Flaw Detection).
- **Middle Right (Description):** A text pane describing the currently selected category.
- **Bottom Half (Tool Selection):** The "Preferred Tool" area showing specific tools that fall under the selected category.
- **Footer:** Tool ID display and Add/Cancel buttons.

## 3. Color palette and role

- **Backgrounds:** The modal sits on top of the darkened main UI. The modal itself is light gray (#EAEAEA).
- **Selection State:** The selected category ("Presence/Absence") is highlighted with a solid orange/amber background (#FFB300).
- **Description Panel:** Dark gray (#4D4D4D) background with white text.
- **Tool Icons:** Tools feature color-coded geometric shapes (green OK badges, colored blobs, black/white indicators) to visually convey their function.

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
`Presence/Absence`
`This is the category of tools which perform checking for the presence/absence of a target object, missing parts inspection, or distinction inspections such as whether variant types are mixed in or not.`

**Preferred Tool Grid (Bottom Half)**
`What feature is useful for presence/absence detection?`
`Preferred Tool`
`Auto-Teach`
`Black/White - Specific Area` (with OK badge)
`Color-Specific Area` (dimmed)
`Pattern Match (Shading)` (with OK badge)
`Pattern Match (Profile)` (with OK badge)
`Shading` (with OK badge)
`Color Component` (dimmed)
`Color Sorting` (dimmed)
`Color Distribution` (dimmed)

**Footer**
`Tool ID T 106`
`Add`, `Cancel`

## 5. Interactive controls

- **Category Buttons:** 9 toggle buttons. Clicking one updates the bottom half and the right description panel.
- **Preferred Tool Buttons:** Selectable tiles for specific tools. Several (like Color-Specific Area) are disabled/dimmed, likely because the connected camera is monochrome, making color tools unavailable.
- **Footer Buttons:** "Add" (disabled until a tool is selected) and "Cancel" (closes the modal without changes).

## 6. User expectation and workflow context

The user clicked "Add Tools" from the main edit ribbon. They are looking to add a new inspection logic block. They first select _what_ they want to do (e.g., check for presence), then select the _how_ (the specific algorithm).

## 7. Adjacent screens

- `02-hmi-add-tools-ribbon-marking-overview.jpg`: The screen that launched this modal.
- `04-tool-catalog-flaw-detection-preferred-tools.jpg` through `12-function-list-...`: Other states of this exact same modal when different categories are selected.

## 8. Data shown

- The next available Tool ID (`T 106`) is pre-allocated and shown in the bottom right.

## 9. Failure and edge states hinted

- Color-based tools are visibly dimmed (disabled), implying the system detects a monochrome camera and dynamically restricts incompatible algorithms.
- The "Add" button is disabled because a specific tool in the bottom grid has not been clicked yet.

## 10. AI-consumption notes

- **Mapping to our app:** This entire modal maps to our "Add Rule" flow or "Tool Palette".
- **Taxonomy:** KEYENCE separates intent ("Presence/Absence") from algorithm ("Pattern Match"). Our design system should consider whether to group rules by intent or just list them flat.
- `Pattern Match (Shading)` and `Pattern Match (Profile)` correspond to normalized cross-correlation and shape-based matching (ShapeTrax) algorithms respectively.
