---
name: Plan 73 - Issue 20 repro
description: Tools dock chevron looks unprofessional (tiny, low contrast)
type: feature
---

## Root cause (one sentence)

`src/styles.css:565-595` (`.panel-dock-slot[data-dock-slot="left"]`) overrides `--panel-control-size` from the 32px default down to 22px and `--panel-icon-size` from 18px down to ~13px specifically for the Tools panel, so its chevron/close controls render at ~66% of every other dockable panel and fall below the 32px hit target the issue requires.

## Evidence

- Defaults (styles.css:134-135): `--panel-control-size: 2rem` (32px), `--panel-icon-size: 1.125rem` (18px).
- Left slot override (styles.css:565-568): shrinks to 22px control / 13px icon.
- Further shrink (styles.css:592-594): `.panel-chrome-control svg` forced to 0.8rem = 12.8px.
- Same `PanelChrome` component drives every panel; Rules dock uses defaults, Tools dock uses the shrunken override, hence the "inconsistent between Tools and Rule Layers" symptom.

## Fix plan (step 15)

Keep Tools dock compact for the title/label but restore control size to 28px minimum and icon to 16px so the chevron/close reads as a real product control. Adjust the `.panel-dock-slot[data-dock-slot="left"]` block only; do not touch the default tokens or other dock slots.
