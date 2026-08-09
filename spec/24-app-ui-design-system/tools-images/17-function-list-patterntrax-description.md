---
Source: assets/tools-images/17-function-list-patterntrax-description.jpg
Screen: Tool Catalog — Function List (PatternTrax Detail)
Related-Spec: 21-app/40-tools.md
---

# 17 — Tool Catalog — Function List (PatternTrax Detail)

## 1. One-line purpose

A state in the Function List where the `PatternTrax` algorithm is selected, displaying its technical description.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A 3x3 grid of large category buttons.
- **Middle Right (Description):** A text pane describing the `PatternTrax` tool.
- **Bottom Half (Tool Selection):** The "Function List" grid. Note: The grid has been scrolled slightly so that `PatternTrax` itself is actually out of view (above the visible area), but its description remains active in the right pane.
- **Footer:** Tool ID display (`Tool ID T 106`) and enabled Add/Cancel buttons.

## 3. Color palette and role

- **Backgrounds:** Light gray (#EAEAEA) for the modal body, dark gray (#4D4D4D) for the right description panel.
- **Selection State:** The category "Function List" is highlighted (#FFB300). No tool is visibly highlighted in the grid because the selected tool is scrolled out of view.
- **Text:** White text in the description pane.

## 4. Text transcription (grouped by region)

**Modal Header**
`Tool Catalog`

**Description Panel (Middle Right)**
`PatternTrax`
`Detects similar portions using the tone change information around the profile of the image pattern registered in advance and outputs the position, angle or correlation value of the detected object.`
`The object is tracked even if the measurement targets have flaws or they overlap, or surface variation exists because the tool searches using the tone change information around the profile.`

**Function List Grid (Bottom Half)**
`Function List`
_(Visible tools: `Edge Position`, `Edge Angle`, `Edge Width`, `Edge Pitch`, `Edge Pairs`, `Defect`, `Blob`, `Grayscale Blob`, `Profile Position`, `Profile Width`)_

**Footer**
`Tool ID T 106`
`Add`, `Cancel`

## 5. Interactive controls

- **Scrollbar:** The scrollbar is moved down slightly.
- **Add Button:** Fully enabled, indicating a tool is still selected even if off-screen.

## 6. User expectation and workflow context

The user selected `PatternTrax`, read its description, and then scrolled down to see what other tools were available. The right pane retains the state of the selected tool rather than reverting to the category description.

## 7. Adjacent screens

- `16-function-list-shapetrax3-description.jpg`: Similar state, different tool.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- Selected state persists across scroll boundaries.

## 10. AI-consumption notes

- **Mapping to our app:** `PatternTrax` appears to be a variant of pattern matching that relies on "tone change information around the profile" (likely gradient-based matching). In our `EditorRuleKind` taxonomy, this is a distinct pattern match algorithm from the standard normalized cross-correlation (Shading).
