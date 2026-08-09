---
Source: assets/tools-images/40-shapetrax3-reference-image-marking-list.jpg
Screen: Custom Menu (Quick Pattern Teach)
Related-Spec: 21-app/40-tools.md
---

# 40 — Custom Menu (Quick Pattern Teach)

## 1. One-line purpose

An operator-facing quick-access menu used during production to rapidly re-teach the reference pattern for specific tools without entering full Edit mode.

## 2. Full-frame layout

- **Top Ribbon:** Main program navigation (`Save`, `Edit`, `Global`, `Execute`, `Output`, `Utility`, `Go to Run Mode`, `Total Status`).
- **Left Pane:** Image Viewer. Currently showing a black frame with a red pattern box in the center. The header says `Current Image` `Raw 2`.
- **Right Pane:** The `Custom Menu` modal/panel overlaying the standard dashboard.
  - A scrollable vertical list of specific tools that have been pinned to this menu by the programmer.
  - Each list item shows the Tool ID (`T101`, `T102`, `T103`), a custom name (`Marking A`, `Marking B`, `Marking C`), a visual thumbnail of the currently taught pattern, and a `Pattern Region` button.
  - **Footer of Menu:** Checkboxes for `Edit Custom Menu` and `Permit to Change Judgment Conditions in Run Mode`, and a `Close` button.

## 3. Color palette and role

- **Backgrounds:** Right pane is light gray (#EAEAEA). Top ribbon uses dark gradients.
- **Buttons:** Large, pill-shaped Windows-style buttons for easy touch-screen access.

## 4. Text transcription (grouped by region)

**Top Ribbon**
`1 Set022 SUPERTHIN QFN 5X5_REV1` | `[v]`
`Save` `Edit [v]` `Global`
`Prog. Time 0.0 ms` `Interval 0.0 ms`
`Execute` `Output` `Utility` `Go to Run Mode` `Total Status --`

**Left Pane (Overlay Data)**
`Unit Time 2.1ms`
`Count 0`
_(Measurement Table similar to Image 34, showing 0.000 for Match %, highlighted in Red)_

**Right Pane (Custom Menu)**
`Custom Menu`
`T101: Marking A`
`[Thumbnail Image]` | `[Pattern Region]`
`T102: Marking B`
`[Thumbnail Image]` | `[Pattern Region]`
`T103: Marking C`
`[Thumbnail Image]` | `[Pattern Region]`

_(Footer Checkboxes)_
`[ ] Edit Custom Menu`
`[x] Permit to Change Judgment Conditions in Run Mode`
`[Close]`

## 5. Interactive controls

- **Pattern Region Buttons:** Immediately opens the interactive canvas (like Image 38) to drag a new red box over a new reference mark, bypassing the deep edit menus.
- **Close Button:** Dismisses the Custom Menu overlay, returning to the standard dashboard.

## 6. User expectation and workflow context

During mass production, variations in part batches might cause false failures. The line operator (who shouldn't have full admin rights) opens the Custom Menu to quickly re-teach the vision system what the _current_ good part looks like, minimizing machine downtime.

## 7. Adjacent screens

- `34-shapetrax3-measurement-panel-t100-pin1.jpg`: The standard dashboard this menu overlays.

## 8. Data shown

- Thumbnails of the actual pixel data learned by tools T101, T102, and T103.

## 9. Failure and edge states hinted

- The `Edit Custom Menu` checkbox implies that a programmer must first unlock the menu to add/remove tools from this quick-access list.

## 10. AI-consumption notes

- **Mapping to our app:** This is the `Operator Dashboard` or `HMI View`. It represents a curated, restricted view of the graph's nodes. Allowing users to pin specific node actions (like "Re-teach Pattern" or "Adjust Threshold") to a quick-access menu is critical for the runtime/production experience.
