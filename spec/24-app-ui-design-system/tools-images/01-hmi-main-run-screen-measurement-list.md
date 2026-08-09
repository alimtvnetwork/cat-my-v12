---
Source: assets/tools-images/01-hmi-main-run-screen-measurement-list.jpg
Screen: Run screen — measurement list
Related-Spec: 03-canvas.md
---

# 01 — Run screen — measurement list

## 1. One-line purpose

The main operator run screen showing a live feed of inspections, measured values, and overall pass/fail status in real time.

## 2. Full-frame layout

- **Titlebar (top):** A thin horizontal strip showing the active program name.
- **Top ribbon:** A dark gray horizontal bar containing global counters (Total Count, NG Count), timing (Program Time, Interval), and a "Total Status" indicator on the right.
- **Left canvas (~60% width):** The main viewport displaying the live camera image with overlaid geometric tool shapes (blue rectangles).
- **Right rail (~40% width):** A two-part vertical panel. The top half is "Measured List CAM 1" showing tool processing metrics. The bottom half is "Judged List CAM 1" showing qualitative tool judgments.
- **Status bar (bottom):** Minimalist footer with some system icons on the right.

## 3. Color palette and role

- **Backgrounds:** Dark gray/charcoal (#2C2C2C) for panels, solid black (#000000) for the camera viewport.
- **Primary accent:** Orange/amber (#FFB300) used for the titlebar text, active canvas borders, and highlighting the active camera tab.
- **Text:** White (#FFFFFF) for primary text, light gray (#CCCCCC) for labels.
- **Tool Outlines (ROI):** Cyan/light blue (#00BFFF) for the overlapping rectangular regions of interest in the canvas.
- **Borders:** Thin white or gray borders separating panes.

## 4. Text transcription (grouped by region)

**Titlebar**
`1-022 SUPERTHIN QFN CONTROL AUTOMATION TECHNOLOGY SDN BHD`

**Ribbon**
`Total Count --`
`NG Count --`
`Program Time 0.0 ms`
`Interval 0.0 ms`
`Total Status --`

**Left rail (Canvas)**
`CAM 1 Current Image`

**Right rail (Measured List)**
`Measured List CAM 1`
`T100 Processing Count`
`T100 OK Count`
`T100 Fail (NG) Count`
`T101 Pattern % Match Result`
`T104 Processing Count`
`T104 OK Count`
`T104 Fail (NG) Count`
`T111 Number of Detected ...`
`T117 Area Result`
`T118 Area Result`

**Right rail (Judged List)**
`Judged List CAM 1`
`T101: Marking A`
`T102: Marking B`
`T103: Marking C`
`T104: OVERALL MARKING`
`T105: Edge Width`
`T111: Empty Pocket`
`T100: Pin 1`
`T117: Top Seal`
`T118: Bottom Seal`

## 5. Interactive controls

- **Camera Tab:** "CAM 1 Current Image" (tab), top-left of canvas. Likely click to switch cameras if multiple exist.
- **Bottom right system buttons:** Three icon buttons in the bottom right corner (a chart icon, a grid icon, and a play/arrow icon). Clicking these likely toggles views, opens system settings, or starts/stops the run.

## 6. User expectation and workflow context

This is the primary monitoring screen for line operators. They arrive here after setup is complete and the machine is running production. They expect to see real-time updates of images and pass/fail counts. If a part fails, they would look at the Judged List to see which specific tool caused the NG (No Good) status.

## 7. Adjacent screens

- `02-hmi-add-tools-ribbon-marking-overview.jpg`: The "Edit" mode version of this screen, reached by stopping the run and entering setup.

## 8. Data shown

- Live counts (`Total Count`, `NG Count`).
- Cycle times (`Program Time`, `Interval`).
- Configured tool lists (`Measured List` showing what is being quantified, `Judged List` showing what is being evaluated for pass/fail).

## 9. Failure and edge states hinted

Currently, the system appears to be in an idle or reset state because all counts are `--` and times are `0.0 ms`. The Total Status is `--` instead of OK (green) or NG (red).

## 10. AI-consumption notes

- **KEYENCE equivalents:** "Measured List" maps to our variables/outputs panel, and "Judged List" maps to our rule list / layer panel.
- The UI is extremely dense and uses a dark theme suitable for factory floors.
- The tools use a `TXXX` naming convention (e.g. `T100`). Our app should map this to `Rule ID` or `Tool ID`.
