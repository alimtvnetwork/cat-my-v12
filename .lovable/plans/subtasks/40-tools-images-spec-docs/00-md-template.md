# Per-image MD template

Slug: md-template
Status: reference
Created: 2026-07-16
Parent: 40-tools-images-spec-docs

Every `spec/24-app-ui-design-system/tools-images/NN-<slug>.md` file MUST follow this shape. The audience is an AI reading the MD without access to the image, so be exhaustive: transcribe visible text verbatim, name every color with role, describe every control and its expected behavior.

```
---
Source: assets/tools-images/NN-<slug>.jpg
Screen: <short screen name, e.g. "Run screen — measurement list">
Related-Spec: <link to nearest 24-app-ui-design-system file, e.g. 03-canvas.md>
---

# NN — <Screen title>

## 1. One-line purpose
What this screen exists to do, in a single sentence.

## 2. Full-frame layout
Describe the frame top→bottom, left→right. Name every region: titlebar, top ribbon, left rail, canvas/viewport, right rail/panel, bottom status bar, modal overlays. Give approximate proportions (e.g. "left rail ~18% width").

## 3. Color palette and role
List every distinct color with hex-if-known-else-name and its semantic role. Cover: background, panel surfaces, primary accent, judgment OK (green), judgment NG (red/orange), ROI outlines (yellow / green / red / blue), text, muted text, borders, selection highlight.

## 4. Text transcription (grouped by region)
Transcribe every visible text string verbatim. Group under: Titlebar, Ribbon, Left rail, Canvas overlays, Right rail, Status bar, Modals. Preserve casing, punctuation, and units.

## 5. Interactive controls
Enumerate every control. For each: element type (button / tab / list row / checkbox / dropdown / slider / icon-only button), label (or icon description), location, expected click behavior, keyboard shortcut if visible, disabled/enabled state.

## 6. User expectation and workflow context
Who is on this screen, what did they just do, what are they about to do next. What triggers arrival here, what actions lead away.

## 7. Adjacent screens
List the other screenshots in this set most closely related (by number and slug) and how they connect (opens from, drills into, alternate mode of).

## 8. Data shown
What live/measured/configured values are displayed (judgment values, counts, coordinates, tool names, program name, camera id).

## 9. Failure and edge states hinted
Any error strings, disabled controls, warning colors, or empty-state text visible.

## 10. AI-consumption notes
What a downstream AI/agent should infer or NOT infer from this screen: mappings to `spec/21-app` primitives (rule kinds, ROI shapes, tool families), to `EditorRuleKind` enum values, to menu-group ids. Call out any KEYENCE-specific terminology and its equivalent in this project.
```

Length target: ~120–200 lines per file. Under-detailed files must be rewritten before the step is considered done.
