---
Source: assets/tools-images/31-lighting-configuration-flash-output.jpg
Screen: CAM 1 : Camera Settings (Lighting Tab)
Related-Spec: 21-app/40-tools.md
---

# 31 — CAM 1 : Camera Settings (Lighting Tab)

## 1. One-line purpose

A hardware configuration screen to control external lighting controllers and flash strobe outputs synchronized with the camera exposure.

## 2. Full-frame layout

- **Header:** Title `Lighting Configuration` and instructional text.
- **Tabs:** `Camera`, `Trigger`, `Lighting` (Selected) horizontally above the settings pane.
- **Left Pane:** A large, live image feed (black frame).
- **Right Pane:** The form for lighting parameters.
  - **Flash Output Settings:** A list of checkboxes mapped to physical flash terminals (1 through 4). Terminals 3 and 4 indicate "(Terminal not allocated)".
  - **Light Controller Settings (Unit 1):** Configures an integrated light controller (e.g., CA-DC60E). Includes dropdowns for Model, LIGHT 1 assignment (Flash 1), Lighting Color (R), and a slider for Volume/Intensity (0511). `LIGHT 2` is set to OFF.
- **Footer:** `Set Advanced`, `OK`, `Cancel` buttons.

## 3. Color palette and role

- **Backgrounds:** Dark UI theme. Right pane is light gray (#EAEAEA).
- **Tabs:** The active tab (`Lighting`) is highlighted orange (#FFB300).
- **Form Controls:** Checkboxes and standard dropdown styling.

## 4. Text transcription (grouped by region)

**Header**
`Lighting Configuration`
`Sets the lighting conditions such as the FLASH terminal and the light controller settings.`

**Tabs**
`Camera`, `Trigger`, `Lighting` (Selected)

**Settings Form**
`Flash Output Settings` `[>>]`
`[x] Flash 1`
`[ ] Flash 2`
`[ ] Flash 3(Terminal not allocated)`
`[ ] Flash 4(Terminal not allocated)`

`Light Controller Settings` `[>>]`
`Unit 1`
`Model` | `CA-DC60E [v]` `[Auto]`
`LIGHT 1` | `Flash 1 [v]`
`Lighting Color` | `R [v]`
`Volume` | `[Slider]` `0511`
`LIGHT 2` | `OFF [v]`

**Footer**
`Set Advanced` | `OK` `Cancel` | `Run` (Play Icon)

## 5. Interactive controls

- **Checkboxes:** Enable physical 24V outputs to trigger strobes.
- **Volume Slider:** Adjusts the PWM or voltage output of the proprietary light controller to dim/brighten the LED light. Ranges likely 0-1023 or similar (currently 511).

## 6. User expectation and workflow context

After configuring the camera exposure (Image 29) and trigger timing (Image 30), the user must ensure the physical lights turn on at the exact moment the camera exposes. Strobe lighting freezes motion on fast-moving conveyors and provides consistent illumination.

## 7. Adjacent screens

- `30-trigger-settings-external-internal-signal.jpg`: The adjacent "Trigger" tab.
- `33-lighting-configuration-camera-panel.jpg`: Duplicate capture of this screen.

## 8. Data shown

- Connected Light Controller hardware (`CA-DC60E`).
- Light intensity (`0511`).

## 9. Failure and edge states hinted

- Disabled terminals explicitly state `(Terminal not allocated)`, preventing user confusion about why checking the box does nothing.

## 10. AI-consumption notes

- **Mapping to our app:** In machine vision, hardware lighting integration is tightly coupled with camera exposure. Our `HardwareConfig` module must support a 1-to-many relationship between a Camera and Light Controllers, and provide UI sliders for Light Intensity.
