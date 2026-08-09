# Hit-test for pointer selection

Root cause: pointer input reached the canvas, but there was no `hitTest` boundary, so a pointerdown could not resolve a screen/image coordinate to a selectable rule.

## Locked implementation

- Added `src/lib/editor/hit-test.ts` with `hitTest(image, rules): string | null`.
- Hit order is topmost first by reverse rule array order.
- Hidden and locked rules are skipped.
- A 3 px image-space padding keeps thin outlines selectable without broadening selection too far.
- `CanvasViewport` selects existing rules on pointerdown before starting a create gesture.

## Observability

- Canvas selection emits `I_UI_SELECTION_CHANGED` with `source=canvas-hit`.
- Rule creation selection emits `I_UI_SELECTION_CHANGED` with `source=canvas-create`.
