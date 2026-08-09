# Issue 20: Tools panel collapse control looks unprofessional

Status: closed
Closed: 2026-07-18
Resolution: v3.491.0. `src/styles.css` left-dock override raised `--panel-control-size` 22px→28px and `--panel-icon-size` 13px→16px (plus svg override at :595-598). Playwright measured Tools chevron/close as 28x28 with 16x16 glyph while the dock stays 116px wide, matching Rules panel weight. Memo: `.lovable/memory/v2/plan73/20-repro.md`.
Created: 2026-07-17
Reported: user (voice, Plan 30 turn)

Symptom: The little collapse/hide chevron at the top-right of the Tools panel (see upload user-uploads://file-22 and user-uploads://file-23) is tiny (~12px), ghosted, and inconsistent between the Tools panel and the Rule Layers panel. It reads as amateur / debug UI, not a real product.

Expected: A prominent (>= 32x32 hit target) chevron button with clear hover/focus states, tooltip, and matching visual weight to Save/Publish. Consistent across every dockable panel.

Actual: Small, low-contrast, easy to miss, no tooltip, sizing/position drift between panels.

Related files:

- src/components/editor/rail/RightRail.tsx (Rule Layers collapse)
- src/components/editor/toolbox/\* (Tools collapse)
- src/components/app-shell/panels/\* (to be created per Plan 65)
