---
Slug: editor-wireframe
Status: populated
Created: 2026-07-18
Updated: 2026-07-18
Parent: 79-ui-improvements-v4
---

# SS-02: Rule editor dock wireframe

Applies to: `src/routes/setup.rules.$ruleId.tsx` (new, split from list route in step 23), `src/components/rules/editor/**` (new tree in step 24).
References: `.lovable/memory/design/v4-photoshop-palettes.md`, `spec/21-app/53-ui-improvements-v4.md` section 3.

## Frame

```text
+----------------------------------------------------------------------+  <- 40px MetadataBar
| RuleMetadataBar: [Name*] [Category v] [Pocket v] [AppliesBefore v]   |
|                  [Save]  [Cancel]  [cycle badge, red, if any]        |
+------+--------------------------------------------------+-----+------+
|  T   |                                                  | Pr  |  H   |
|  L   |                                                  | op  |  A   |
| 48px |                Canvas (image + ROIs + badges)    | 240 | 24px |
| icon |                                                  | min |  I   |
| rail |                                                  |     |  R   |
|      +----------------------- divider -----------------+       |     |
|      |    Layers / Channels / Paths palette (tabs)      |     |     |
|      |    200px min height, resizable                   |     |     |
+------+--------------------------------------------------+-----+------+
```

## Fixed measurements (do not deviate without editing this file first)

| Region                     | Value                           | Notes                                     |
| -------------------------- | ------------------------------- | ----------------------------------------- |
| MetadataBar height         | 40px                            | 1 row, tabular-nums for cycle badge count |
| Tools rail width           | 48px                            | 32px icon target + 8px padding each side  |
| Properties body width      | 240px min, 480px max, resizable | Persist to `ca:ui:props-width` (idb key)  |
| Properties icon rail width | 24px                            | Fixed, right edge                         |
| Layers palette min height  | 200px                           | Divider at 4px hit target                 |
| Palette row height         | 22px (compact) / 24px (comfy)   | From `useUiPrefsStore.headerDensity`      |
| Grid unit                  | 4px                             | All paddings snap to 4                    |

## Component contracts (target files)

- `<RuleEditorFrame>` `src/components/rules/editor/RuleEditorFrame.tsx`
  Props: `{ ruleId: RuleId; onClose(): void }`. Owns the outer grid, renders the five slots. Handles ResizeObserver for props/palette resize.
- `<RuleMetadataBar>` `src/components/rules/editor/RuleMetadataBar.tsx` (step 25)
  Slots: name input, category select, pocket-size select, applies-before multi-select with reorder, save, cancel, cycle badge.
- `<ToolsRail>` `src/components/rules/editor/ToolsRail.tsx` (step 27)
  Renders 32x32 icon buttons with `Tooltip` (300ms open). Shape button uses `LongPressFlyout` (350ms).
- `<CanvasSurface>` `src/components/rules/editor/CanvasSurface.tsx` (existing surface, adjusted margins)
  Occupies center; must not overlap MetadataBar. Uses `SelectionOverlay` (SS-03).
- `<PropertiesPanel>` `src/components/rules/editor/PropertiesPanel.tsx` (step 30)
  Header 24px tab strip; body scrollable; rows 22-24px per density.
- `<PropertiesIconRail>` `src/components/rules/editor/PropertiesIconRail.tsx` (step 30)
  6 to 8 vertical toggles switching PropertiesPanel active section.
- `<LayersPalette>` `src/components/rules/editor/LayersPalette.tsx` (step 32)
  Tabs: Layers, Channels, Paths. Content-visibility below-fold.

## Z-order (top wins)

1. Toast + GlobalErrorModal (root portal, unaffected).
2. LongPressFlyout / dropdown menus.
3. Selection overlay badges.
4. Selection overlay handles.
5. Canvas image and ROIs.
6. Editor frame chrome.

## Divider behavior

- Horizontal (props width) and vertical (palette height) dividers render a 4px hit strip; cursor `col-resize` / `row-resize`.
- Min sizes enforced (240 / 200); max sizes cap at 50% of viewport.
- Widths persist per-viewport via facade-guarded keys `ca:ui:props-width`, `ca:ui:palette-height`. Direct localStorage/idb writes are forbidden (facade+seed contract).

## Keyboard

- `Ctrl/Cmd + S` = save (routes to `RuleMetadataBar` save handler).
- `Esc` = cancel unsaved edits after confirm prompt.
- `Alt + 1..4` = toggle Properties tab (Info / History / Swatches / Reference).
- `Ctrl/Cmd + Shift + L` = focus Layers palette.
- Full shortcut list updates in `ShortcutsDialog.tsx` at step 24.

## Accessibility

- MetadataBar name field is `aria-required`.
- Cycle badge is `role="status"` `aria-live="polite"`.
- Dividers are `role="separator"` with `aria-orientation` and are keyboard-focusable; ArrowLeft/Right (or Up/Down) nudge by 8px, Shift = 32px.
- Icon rails have `aria-label` per button; icons alone are not accessible names.

## Open questions (resolve before step 24)

- Should Properties tabs collapse into an overflow menu below 320px props width? (default: yes, expose as overflow trigger)
- Layers palette on very short viewports (< 700px): collapse to single-row summary? (default: yes, gate at 720px)
