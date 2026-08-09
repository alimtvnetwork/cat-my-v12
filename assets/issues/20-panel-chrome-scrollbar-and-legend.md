# Issue 20: Panel chrome shows giant purple scrollbar; Properties legend is redundant

## Context

> What do you think what is wrong in these two UI and what can you improve, you stupid fucker? It's, it's actually going over the head every time you break something and you do not update your memory, you stupid fucker

## Evidence

- assets/ui/70-properties-panel-redundant-legend.png: Properties panel shows a "LEGEND OK Warn Error Idle" strip below every rule, duplicating the tone already carried by each card's left stripe and the Verdict pill.
- assets/ui/71-layers-panel-giant-purple-scrollbar.png: Layers panel body renders a chunky OS-native purple horizontal scrollbar at the bottom because `panel-chrome-body` used `overflow-auto` with unstyled bars.
- assets/ui/72-preview-panel-bleed-through.png: Preview panel body shows the same unstyled scrollbar behavior; behind-panel content visible on the left edge of the floating panel.

## Root cause

1. `src/components/app-shell/panels/PanelChrome.tsx` body used `overflow-auto` (both axes) without the `editor-scroll-fancy` class.
2. `src/components/editor/PropertiesPanel.tsx` mounted a redundant `StatusLegend` after every rule.

## Fix (v3.982.0)

- PanelChrome body: `overflow-y-auto overflow-x-hidden editor-scroll-fancy` so no dockable panel can ever surface a chunky horizontal bar.
- Removed `StatusLegend` from PropertiesPanel; tone is already conveyed by card stripes and the Verdict pill.
