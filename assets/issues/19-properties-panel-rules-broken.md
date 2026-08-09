## Context

What is broken here in the properties section of the rules? Explain me what is broken. List out the broken issues, okay? And then you start fixing. It's been several times. It's, it looks very frustrating. Why don't you make things better?

## Evidence

- `assets/ui/67-properties-panel-sections-clipped.png` - Properties panel sections are horizontally clipped and content disappears off the right edge.
- `assets/ui/68-properties-panel-editor-overlap.png` - Rule editor content opens over existing panel content instead of staying in a contained panel flow.
- `assets/ui/69-properties-panel-mask-overlap.png` - Shape mask card text, legend, and controls overlap, with content clipped by the bottom status area.

## Broken issues

1. Horizontal overflow is not contained inside the Properties panel, so controls and labels get cut off on the right.
2. The detector editor surface is too wide for the right rail and overlays the existing panel content instead of replacing or stacking cleanly.
3. The Mask section has collapsed or conflicting heights, causing the legend, title, upload button, helper copy, and state badge to draw on top of each other.
4. The bottom status footer is taking visual space without the scroll body accounting for it, so lower controls are hidden behind the footer.
5. Section chrome is inconsistent: expanded cards, nested cards, and headers are fighting each other, which makes the hierarchy hard to scan.
6. Text wrapping is not constrained, so long helper text and labels collide with adjacent controls.
