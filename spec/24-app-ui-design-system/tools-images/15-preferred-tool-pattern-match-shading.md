---
Source: assets/tools-images/15-preferred-tool-pattern-match-shading.jpg
Screen: Tool Catalog — Tool Detail (Pattern Match Shading)
Related-Spec: 21-app/40-tools.md
---

# 15 — Tool Catalog — Tool Detail (Pattern Match Shading)

## 1. One-line purpose

A state in the Tool Catalog where a different specific algorithm ("Pattern Match (Shading)") has been selected, updating the description pane to explain its function.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A 3x3 grid of large category buttons.
- **Middle Right (Description):** A text pane describing the currently _selected tool_, including a textual explanation and a visual application diagram.
- **Bottom Half (Tool Selection):** The "Preferred Tool" grid under the "Presence/Absence" category.
- **Footer:** Tool ID display (`Tool ID T 106`) and enabled Add/Cancel buttons.

## 3. Color palette and role

- **Backgrounds:** Light gray (#EAEAEA) for the modal body, dark gray (#4D4D4D) for the right description panel.
- **Selection State:** Both the category ("Presence/Absence") and the specific tool ("Pattern Match (Shading)") are highlighted with an orange/amber background (#FFB300).
- **Text:** White text in the description pane, black text in the main modal body.
- **Diagram Colors:** Green for "OK" labels, Red for "NG" (No Good) labels in the application diagram.

## 4. Text transcription (grouped by region)

**Modal Header**
`Tool Catalog`

**Category Grid (Top Half)**
`Presence/ Absence`
... (standard 9 categories) ...

**Description Panel (Middle Right)**
`Pattern Match (Shading)`
`Detects the most similar portion to the image pattern registered in advance and outputs the correlation value indicating the resemblance.`
`It is used when detecting the presence/absence of parts or whether variant types are mixed in.`
`[Application]`
`Variety distinction of resin cap`
_(Diagram shows a camera inspecting parts on a conveyor. An OK image shows a correctly matched part. An NG image shows an incorrect part type)._

**Preferred Tool Grid (Bottom Half)**
`What feature is useful for presence/absence detection?`
`Auto-Teach`
`Black/White - Specific Area`
`Color-Specific Area`
`Pattern Match (Shading)` (Selected)
`Pattern Match (Profile)`
`Shading`
`Color Component`
`Color Sorting`
`Color Distribution`

**Footer**
`Tool ID T 106`
`Add`, `Cancel`

## 5. Interactive controls

- **Tool Buttons:** "Pattern Match (Shading)" is selected.
- **Add Button:** Fully enabled.
- **Cancel Button:** Closes the modal.

## 6. User expectation and workflow context

The user evaluated "Black/White" but decided "Pattern Match" is better suited for their task. The right panel confirms this is used for "Variety distinction" (distinguishing between similar but different parts). They will proceed by clicking "Add".

## 7. Adjacent screens

- `14-preferred-tool-presence-black-white-specific-area.jpg`: The previously selected tool.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- None.

## 10. AI-consumption notes

- **UX Insight:** The application examples (like "Variety distinction of resin cap") are crucial for lowering the barrier to entry for factory operators. Our design system should include a mechanism (like a static JSON registry mapping `EditorRuleKind` to localized descriptions and diagram SVGs/images) to render these dynamic help panes in the Add Tool modal.
