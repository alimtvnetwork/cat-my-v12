Slug: dexter-menu
Parent: 37-home-dexter-ui-repair
Status: pending
Created: 2026-07-16

# Dexter-style HMI menu repair

## Scope

Improve the top menu into an app-like machine-vision command surface while keeping the home launcher intact.

## Required menu groups

- Home: always visible, routes to `/`.
- Project: New project, Open project, Project settings.
- Setup: Recipe setup, Camera, Lighting, ROI, Reference image.
- Rules: Rule setup, Layers, Import rules, Export rules.
- Test: Upload image, Trial run, Batch test, AI testing.
- Run: Start run, Results, Ops.

## Visual rules

- Dark Dexter/HMI look from the screenshots: compact chrome, cyan status accents, strong card borders, high-contrast text.
- Avoid generic website navigation.
- Avoid replacing the home grid with old v3 job/task UI.

## Verification

- Menu is usable from home and project routes.
- Home button is first-class and visible.
- Active route has visible state.
