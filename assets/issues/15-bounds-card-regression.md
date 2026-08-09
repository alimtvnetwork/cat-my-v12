## Context

Fix the Bounds card regression so the X/Y/W/H row always renders within the Properties panel grid and is visible without clipping.

## Evidence

- `src/components/editor/PropertiesPanel.tsx` - Bounds section currently renders through the shared collapsible rail primitive, so stored collapsed state can hide the X/Y/W/H controls.
- `src/styles.css` - Bounds grid uses the shared rail body wrapper and can inherit clipping behavior from `.rail-panel-body`.

## Expected

The Bounds card must always show the X, Y, W, and H numeric controls inside the Properties panel card, with the aspect lock button aligned on the same row and any validation message wrapping below without clipping.
