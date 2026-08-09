# SS-05 — Typography sampling

## Method

OCR (tesseract) run over top-left menu-bar crops and center dialog crops of 4 representative frames (indexes 0/15/30/45 of the 50-image set). Glyph shapes were then verified by eye on the original 4000×3000 JPGs.

## Sources sampled

- `20260629_172521.jpg` — overview, top banner + counters
- `20260629_172643.jpg` — sub-window header ("Display")
- `20260629_172817.jpg` — modal dialog ("Lighting Configuration")
- `20260629_173148.jpg` — second-subject overview

## Findings

| Role                                                 | Family (visual match)                  | Weight                   | Approx px @1280w | Case     | Notes                                        |
| ---------------------------------------------------- | -------------------------------------- | ------------------------ | ---------------- | -------- | -------------------------------------------- |
| App title bar ("CONTROL AUTOMATION TECH…")           | Sans, humanist (Arial/Helvetica-class) | Bold                     | ~14              | UPPER    | White on dark chrome                         |
| Menu bar (File/Edit/View…)                           | Sans (MS Shell Dlg 2 / Segoe UI-class) | Regular                  | ~12              | Title    | Windows-native                               |
| Panel headers ("Display", "Total Count", "NG Count") | Sans                                   | Bold                     | ~13              | Title    | Black on light-grey panel                    |
| Big numeric counters (Total/OK/NG)                   | Sans, tabular                          | Bold                     | ~40–56           | —        | Right-aligned, monospaced digits             |
| Dialog titles ("Lighting Configuration")             | Sans                                   | Bold                     | ~14              | Title    | Same family as panel headers                 |
| Dialog body / help text                              | Sans                                   | Regular                  | ~11              | Sentence | Grey #4a4a4a on #d4d4d4                      |
| Tab labels                                           | Sans                                   | Regular / Bold-on-active | ~12              | Title    | Active tab uses orange underline (see SS-04) |
| Status/log lines                                     | Sans, tabular                          | Regular                  | ~11              | Sentence | Fixed line-height, monotone                  |

## Type stack (for CAT MY UI rebuild)

- **Primary UI:** `"Inter", "Segoe UI", system-ui, sans-serif` — matches the humanist sans used across chrome, panels, dialogs.
- **Tabular numerics (counters, log timestamps):** same family with `font-variant-numeric: tabular-nums` and `font-feature-settings: "tnum"`. No separate mono family needed — the reference HMI uses tabular sans, not a true mono.
- **Weights in use:** 400 (body/menu), 600–700 (headers, dialog titles, counters). No light/thin weights observed.
- **Casing:** UPPER reserved for the top app-title banner only; everything else is Title or Sentence case.

## Confidence

Medium-high on roles and weights; low on exact px sizes (screen is 4000px wide raw, so the pixel numbers above are normalized to a 1280-px viewport reconstruction, not measured against a known DPI). Treat the size column as ratios, not absolutes.

## Deliverables

- This file.
- Feeds SS-06 (component inventory) and the eventual `@theme` tokens.
