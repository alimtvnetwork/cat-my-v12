---
Source: assets/tools-images/23-function-list-auto-teach-imp-patterntrax.jpg
Screen: Tool Catalog — Function List (Auto-Teach Insp. PatternTrax Detail)
Related-Spec: 21-app/40-tools.md
---

# 23 — Tool Catalog — Function List (Auto-Teach Insp. PatternTrax Detail)

## 1. One-line purpose

A state in the Function List where the `Auto-Teach Insp. (PatternTrax)` algorithm is selected, displaying its technical description.

## 2. Full-frame layout

- **Modal Header:** "Tool Catalog" title bar.
- **Top Half (Categories):** A 3x3 grid of large category buttons.
- **Middle Right (Description):** A text pane describing the `Auto-Teach Insp. (PatternTrax)` tool.
- **Bottom Half (Tool Selection):** The "Function List" grid.
- **Footer:** Tool ID display (`Tool ID T 106`) and enabled Add/Cancel buttons.

## 3. Color palette and role

- **Backgrounds:** Light gray (#EAEAEA) for the modal body, dark gray (#4D4D4D) for the right description panel.
- **Selection State:** "Function List" category and "Auto-Teach Insp. (PatternTrax)" tool are highlighted (#FFB300).
- **Text:** White text in the description pane.

## 4. Text transcription (grouped by region)

**Modal Header**
`Tool Catalog`

**Description Panel (Middle Right)**
`Auto- Teach Insp. (PatternTrax)`
`This is the tool that learns the quality images through the image sensor and recognizes an image different from the quality images as a defective one.`
`It is so useful in that the influence from variabilities or individual differences existing in quality images can be removed.`
`[Tip]`
`This tool includes the function of position adjustment (PatternTrax).`

**Function List Grid (Bottom Half)**
`Function List`
`Profile Defect`
`Intensity`
`Color Detection`
`Color Grouping`
`OCR2`
`1D Code Reader`
`2D Code Reader`
`Auto-Teach Insp. (Pattern Search)`
`Auto-Teach Insp. (ShapeTrax2)`
`Auto-Teach Insp. (PatternTrax)` (Selected)

**Footer**
`Tool ID T 106`
`Add`, `Cancel`

## 5. Interactive controls

- **Tool Buttons:** `Auto-Teach Insp. (PatternTrax)` is selected.
- **Add Button:** Fully enabled.

## 6. User expectation and workflow context

The user wants to use a "Golden Image" comparison tool (Auto-Teach) that automatically handles alignment using PatternTrax. Auto-Teach tools essentially train on several "good" images to establish a baseline of acceptable variation, and flag any differences as defects.

## 7. Adjacent screens

- `22-function-list-ocr2-auto-teach-preferred-b.jpg`: A previously selected tool in the same view.

## 8. Data shown

- Pre-allocated `Tool ID T 106`.

## 9. Failure and edge states hinted

- None.

## 10. AI-consumption notes

- **Mapping to our app:** "Auto-Teach" is KEYENCE's term for an anomaly detection or golden-template matching tool that builds a statistical model of variations. The `(PatternTrax)` suffix means it implicitly runs a `PatternTrax` alignment tool first before doing the image subtraction/comparison. We should consider offering composite tools like this to simplify user workflows.
