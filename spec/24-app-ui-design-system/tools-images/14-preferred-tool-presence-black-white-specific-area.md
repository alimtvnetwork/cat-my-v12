---
Source: assets/tools-images/14-preferred-tool-presence-black-white-specific-area.jpg
Screen: Tool Catalog — Tool Detail (Black/White Area)
Related-Spec: 21-app/40-tools.md
---

# 14 — Tool Catalog — Tool Detail (Black/White Area)

## 1. One-line purpose

A state in the Tool Catalog where a specific algorithm ("Black/White - Specific Area") has been selected, updating the description pane to explain its exact function and applications.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A 3x3 grid of large category buttons.
- **Middle Right (Description):** A text pane describing the currently _selected tool_ (instead of the category). It includes a textual explanation and a visual application diagram.
- **Bottom Half (Tool Selection):** The "Preferred Tool" grid under the "Presence/Absence" category.
- **Footer:** Tool ID display (`Tool ID T 106`) and enabled Add/Cancel buttons.

## 3. Color palette and role

- **Backgrounds:** Light gray (#EAEAEA) for the modal body, dark gray (#4D4D4D) for the right description panel.
- **Selection State:** Both the category ("Presence/Absence") and the specific tool ("Black/White - Specific Area") are highlighted with an orange/amber background (#FFB300).
- **Text:** White text in the description pane, black text in the main modal body.
- **Diagram Colors:** Green for "OK" labels, Red for "NG" (No Good) labels in the application diagram.

## 4. Text transcription (grouped by region)

**Modal Header**
`Tool Catalog`

**Category Grid (Top Half)**
`Presence/ Absence`
... (standard 9 categories) ...

**Description Panel (Middle Right)**
`Black/White- Specific Area`
`Binarizes the image (black & white) to measure the area of "black" or "white".`
`The size judgment or presence inspection can be conducted for the measurement target.`
`[Application]`
`Presence inspection for the chip capacitor in the tape`
_(Diagram shows a camera inspecting a reel of tape. An OK image shows a white square on black. An NG image shows a missing square)._

**Preferred Tool Grid (Bottom Half)**
`What feature is useful for presence/absence detection?`
`Auto-Teach`
`Black/White - Specific Area` (Selected)
`Color-Specific Area`
`Pattern Match (Shading)`
`Pattern Match (Profile)`
`Shading`
`Color Component`
`Color Sorting`
`Color Distribution`

**Footer**
`Tool ID T 106`
`Add`, `Cancel`

## 5. Interactive controls

- **Tool Buttons:** "Black/White - Specific Area" is selected.
- **Add Button:** This button is now fully enabled (with a yellow outline or active styling) because a specific tool has been chosen. Clicking it will close the modal and add the tool to the program.
- **Cancel Button:** Closes the modal.

## 6. User expectation and workflow context

The user is evaluating which tool to use. By clicking "Black/White - Specific Area", the right panel provides them with an explanation and an illustrated example to help them decide if this is the correct algorithm for their problem. Since it looks correct, their next action is to click "Add".

## 7. Adjacent screens

- `03-tool-catalog-presence-absence-preferred-tools.jpg`: The state before the user clicked a specific tool.
- `15-preferred-tool-pattern-match-shading.jpg`: The state when a different tool is selected.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- None. This is a happy path.

## 10. AI-consumption notes

- **UX Insight:** The right panel serves a dual purpose: when no tool is selected, it describes the category. When a tool is selected, it describes the tool. Our UI should replicate this progressive disclosure of detail to guide operators who may not be machine vision experts.
