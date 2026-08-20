# SS-05-search-region-tab

## 1. Goal

Implement the Search Region Tab containing the Search Region, Mask Region layers, and Image Region blocks as specified in Section 8 of `.lovable/plans/pending/01-pattern-search-spec.md`.

## 2. Instructions

1. Review Section 8.
2. Implement the `Search Region` block in the panel body (dropdown + `>>` button).
3. Implement the `Mask Region` block.
   - It MUST contain EXACTLY four rows (Mask Region 0, 1, 2, 3).
   - Each row has a dropdown defaulting to `None`, populated with `None` + the shared shape catalogue.
   - Selecting a shape creates that mask on the canvas.
4. Implement the `Image Region` block (Use Image Region checkbox, Reference Tool dropdown, Detection Color radio, Preview button).
5. Ensure empty mask slots still render showing `None` and there are no add/remove buttons for the slots (the count is fixed).

## 3. Strict Rules

- The Standard UI Mask Region layer stack is limited to 4 fixed slots.
- Modern UI has unlimited layers. If a Modern UI case with >4 layers is opened in Standard UI, show the first 4 and display a non-destructive notice. Do NEVER silently drop them.
- All masks on canvas must be selectable, draggable, and resizable.
