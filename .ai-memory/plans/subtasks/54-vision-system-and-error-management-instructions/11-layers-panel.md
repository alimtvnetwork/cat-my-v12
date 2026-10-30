# Subtask: 11-layers-panel

See plan: .ai-memory/plans/pending/54-vision-system-and-error-management-instructions.md

## Status: COMPLETE (wave 2, 31-Oct-25)

- NEW `src/components/vision/white-box/LayersPanel.tsx` (Photoshop-style):
  layer stack displayed top-first with kind badge (ROI / Pattern /
  Mask / Box), label, rotation degrees, lock icon, visibility
  eye toggle, lock toggle (ROI only), and bring-forward / send-backward
  chevrons (disabled at the ends). Rows highlight the selected layer
  and stay in sync with canvas selection because both derive from the
  same tool model state (regionEditMode / selectedMaskIndex /
  primary hole). Buttons render only when their callback is provided.
- Wired into `WhiteBoxMarkingTool` (full: selection, visibility,
  lock, reorder, rotation; panelId `ui-whitebox-layers-panel`) and
  `Pin1MarkingTool` (selection + keep/exclude visibility only;
  panelId `ui-pin1-layers-panel`). Pin1 lock/reorder are deliberately
  NOT wired: Pin1Canvas does not enforce them yet, and showing dead
  buttons would be fake functionality — that enforcement belongs to a
  follow-up wave owning Pin1Canvas.tsx.
- `data-ui-id` attributes added for the CLI-UI registry: canvas
  (`ui-pattern-canvas`), WhiteBox canvas container
  (`ui-whitebox-canvas`), Pin1 canvas container
  (`ui-pin1-canvas-wrap`), both panel roots. Registry entries added
  to `BE/ui_remote/registry.py` and the TS mirror regenerated
  (`03-ai-scripts/generate-ui-remote-registry.py`, 27 elements).
- Layout: panel sits in a 240px strip under the review panel in both
  tools; the review panel scrolls in the remaining space.

## Commits: see subtask 10 (same batches).
