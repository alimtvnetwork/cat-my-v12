---
title: Step 07 - SS-03 primitive inventory
parent: 31-plan-02-remaining-hmi-primitives
status: complete
date: 2026-07-15
---

# SS-03 primitive inventory (src/components/hmi/)

Source of truth: `.lovable/plans/subtasks/02-control-automation-redesign/ss-03-component-inventory.md`.

## Present (13)

Titlebar, ModeHeader, ToolRibbon, Viewport, RoiOverlay, ConfigPanel,
ActionBar, StatusLog, Counter, plus non-spec helpers (CameraPreview,
DeviceDiscoveryPanel, FeatureGate, GlobalNav, HmiShell, MachineFrame,
StepsWindow, index.ts).

## Missing (3, blocking SS-03 acceptance)

1. `ToolTile.tsx` - selected background state, 48-64px tile.
2. `SettingsDialog.tsx` - shared modal shell for Camera/Trigger/Lighting.
3. `RunButton.tsx` - enforced blue primary, disabled while running.

## Token namespace drift

SS-03 references `bg-hmi-select`, `bg-hmi-primary`, `text-hmi-ng`, `text-hmi-ok`.
Live palette in `src/styles.css:170-185` uses `--ca-*` and semantic
`--color-success|danger|warning|info` mappings. Migration steps 10-13
must translate the spec vocabulary to the shipped `ca-*` / semantic
tokens (no re-introduction of `hmi-*` classnames).

## Follow-up

Proceed to Step 08: SS-04 route diff.
