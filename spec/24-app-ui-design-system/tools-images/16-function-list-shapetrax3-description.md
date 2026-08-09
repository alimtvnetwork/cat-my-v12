---
Source: assets/tools-images/16-function-list-shapetrax3-description.jpg
Screen: Tool Catalog — Function List (ShapeTrax3 Detail)
Related-Spec: 21-app/40-tools.md
---

# 16 — Tool Catalog — Function List (ShapeTrax3 Detail)

## 1. One-line purpose

A state in the Function List where the `ShapeTrax3` algorithm is selected, displaying its technical description.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A 3x3 grid of large category buttons.
- **Middle Right (Description):** A text pane describing the `ShapeTrax3` tool. There is no application image, only technical text.
- **Bottom Half (Tool Selection):** The "Function List" grid (Page 1).
- **Footer:** Tool ID display (`Tool ID T 106`) and enabled Add/Cancel buttons.

## 3. Color palette and role

- **Backgrounds:** Light gray (#EAEAEA) for the modal body, dark gray (#4D4D4D) for the right description panel.
- **Selection State:** The category "Function List" and the specific tool "ShapeTrax3" are highlighted with an orange/amber background (#FFB300).
- **Text:** White text in the description pane, black text in the main modal body.

## 4. Text transcription (grouped by region)

**Modal Header**
`Tool Catalog`

**Category Grid (Top Half)**
`Presence/ Absence`
... (standard 9 categories) ...
`Function List` (Selected)

**Description Panel (Middle Right)**
`ShapeTrax3`
`Detects the most similar portion to the profile information registered in advance and outputs the position, angle or correlation value of the detected object.`
`The object is chased even if a crack, overlapping or surface variation exists on it because the tool searches the pattern using the profile information.`

**Function List Grid (Bottom Half)**
`Function List`
`Auto-Teach Inspection`
`Area`
`Pattern Search`
`ShapeTrax3` (Selected)
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

- **Tool Buttons:** `ShapeTrax3` is selected.
- **Add Button:** Fully enabled.
- **Cancel Button:** Closes the modal.

## 6. User expectation and workflow context

The user is browsing the raw algorithms list and wants to understand what `ShapeTrax3` does before adding it. The explanation indicates it's a profile-based (contour) pattern matching tool robust to overlapping or surface variations.

## 7. Adjacent screens

- `09-function-list-position-adjustment-edge-tools.jpg`: The state before `ShapeTrax3` was selected.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- None.

## 10. AI-consumption notes

- **Mapping to our app:** `ShapeTrax3` is KEYENCE's proprietary name for Geometric/Contour Pattern Matching. When we build our tool library, this aligns with an `EditorRuleKind.PATTERN_GEOMETRIC` or similar, emphasizing edge/profile matching rather than pixel intensity (shading) matching.
