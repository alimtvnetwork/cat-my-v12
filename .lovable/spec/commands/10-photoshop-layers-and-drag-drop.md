# Command 10: Photoshop-style Layers panel + drag/drop rule composition

Verbatim (paraphrased from voice input, Plan 30 turn):

> "Layer should be a different control panel, just like Photoshop. If I need
> the layer, then I click on the layer. So there should be other parts of
> the things that I could actually drag drop as a single item and also join
> them together how Photoshop can do that."

## Scope

Rule editor (`src/components/editor/**`) and any surface that lists
inspection rules ("layers").

## When it applies

Every future change to the rule editor MUST honour these invariants:

1. Layers panel and Properties/Inspector panel are TWO separate panels.
   Never inline detector controls inside the layers list row.
2. Layers panel supports: reorder via drag, visibility toggle, lock,
   multi-select, group/ungroup, merge/join into compound rule.
3. Individual rules are draggable as single items. Dropping a rule on
   another rule (with a group modifier) joins them.
4. Properties panel renders the detector form for the currently selected
   layer(s) and updates on selection change.
5. No new detector control ships inside the layers list. Add to the
   Properties panel instead.

## Non-goals

- Not a full Photoshop clone. No pixel-blending modes, no masks in v1.
- No canvas re-architecture in the same plan; keep CanvasViewport intact.
