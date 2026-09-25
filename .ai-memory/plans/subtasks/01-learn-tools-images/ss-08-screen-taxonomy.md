# SS-08 — Screen-type / layout taxonomy

Source: 50 reference frames in `assets/tools-images/`, contact sheet `/tmp/img-analysis/contact-sheet-all.jpg`. Numbering below matches the contact-sheet tile numbers (01–50).

## Archetypes

### A. Tool Setting workspace (frames 02–25, 34)

The dominant screen. Grid:

```
┌─ chrome titlebar ────────────────────────────────────────┐
│─ action header (Test Setting / mode tabs) ──────────────│
├─ tool ribbon (Category tiles, orange = active) ─────────┤
├──────────────────────────┬──────────────────────────────┤
│  Function List           │  Right help / config panel    │
│  (icon grid of tools)    │  (title, description, mini    │
│                          │   illustration, form fields)  │
├──────────────────────────┴──────────────────────────────┤
│  bottom action bar (Test All, OK/Cancel, Run blue)      │
└──────────────────────────────────────────────────────────┘
```

Two sub-variants:

- **A1 — Category browse** (02–20): left = tool grid, right = descriptive help card.
- **A2 — Tool configured** (21–25, 34): right panel becomes a form (reference regions, thresholds), left grid dims.

### B. Settings dialogs (frames 26–33)

Full-height left nav (Judgment Settings / Output Settings / CAM Camera Settings / Trigger Settings / Lighting Configuration), right pane = form. Bottom-right = blue "Run" primary + "Cancel". Modal-feel but occupies the whole workspace.

- B1 Judgment/Output (26–28)
- B2 Camera Settings (29, 30, 33)
- B3 Trigger Settings (31, 32)

### C. ROI editor on camera canvas (frames 35–40, 46, 47, 50)

```
┌─ chrome ─────────────────────────────────────────────────┐
│  numeric readout strip (Judgment Label / Pos / Score)   │
├───────────────────┬──────────────────────────────────────┤
│  left form:       │                                      │
│  Search Region    │       BLACK CAMERA VIEWPORT           │
│  Mask Region 1..3 │       with dashed/solid/hatched ROI  │
│  Pattern Region   │       + yellow crosshair anchor      │
├───────────────────┴──────────────────────────────────────┤
│  Register Image / Run (blue)                            │
└──────────────────────────────────────────────────────────┘
```

### D. Reference-image registration (frame 42)

Centered light canvas with yellow "+" origin, right rail = image list + Register/Cancel. Simpler than C — no measurement overlays.

### E. Error List / status dialog (frame 41)

Two-column table (Error Item | Content), left rail = severity filter, bottom = "Jump to Source" / "Close". No camera.

### F. Run screen / measurement inspector (frames 43, 48, 49)

Live camera canvas on left, tabular measurement inspector on right (rows of Pin 1..N with Measured / Lower / Upper columns, red rows = fail). This is production/monitoring mode, not configuration.

### G. Chrome-only / boot (frame 01)

Titlebar + empty workspace with a startup checklist card. Effectively the "no project loaded" state of archetype A.

### H. Miscellaneous docs / labels (frames 44, 45)

Photos of printed labels on the controller — reference only, not a UI archetype. Exclude from build.

## Layout tokens implied

- **Chrome height**: ~28–32px titlebar + ~36–40px action header.
- **Tool ribbon**: ~72px row, 6–8 tiles visible.
- **Right panel**: fixed ~40–45% width in A1; grows to ~55% in A2/B when it becomes the form.
- **Bottom action bar**: ~44px, right-aligned primary (blue), left "Test All" utility, "OK/Cancel" pair.
- **Camera viewport (C/F)**: fills all remaining space; never padded.
- **Grid unit**: 4px base; 8px component gutter; 16px section gutter.

## Route map (proposed, for later steps)

```
/                       → G  (project chooser / boot)
/setup                  → A1 (tool category browse)
/setup/tool/:id         → A2 (tool config form)
/setup/tool/:id/region  → C  (ROI editor)
/settings/judgment      → B1
/settings/camera        → B2
/settings/trigger       → B3
/settings/reference     → D
/errors                 → E
/run                    → F
```

## Open items

- Whether B is truly modal (overlay) or a separate route — reference is ambiguous; treat as route for URL-ability.
- Whether A1 → A2 transitions in place or navigates — treat as same route with panel-mode state.
