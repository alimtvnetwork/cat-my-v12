---
Source: assets/tools-images/30-trigger-settings-external-internal-signal.jpg
Screen: CAM 1 : Camera Settings (Trigger Tab)
Related-Spec: 21-app/40-tools.md
---

# 30 — CAM 1 : Camera Settings (Trigger Tab)

## 1. One-line purpose

A hardware configuration screen to define when and how the camera should snap a picture (e.g., via a hardware PLC signal or an internal software timer).

## 2. Full-frame layout

- **Header:** Title `Trigger Settings` and instructional text.
- **Tabs:** `Camera`, `Trigger` (Selected), `Lighting` horizontally above the settings pane.
- **Left Pane:** A large, live image feed (black frame).
- **Right Pane:** The form for trigger parameters.
  - Radio buttons for Trigger Mode (`External` vs `Internal`).
  - Dropdown for Trigger Signal source.
  - Disabled numeric input for internal timer interval (ms).
- **Footer:** `Set Advanced`, `OK`, `Cancel` buttons.

## 3. Color palette and role

- **Backgrounds:** Dark UI theme. Right pane is light gray (#EAEAEA).
- **Tabs:** The active tab (`Trigger`) is highlighted orange (#FFB300).

## 4. Text transcription (grouped by region)

**Header**
`Trigger Settings`
`Specifies the setting conditions on the trigger (capture timing).`

**Tabs**
`Camera`, `Trigger` (Selected), `Lighting`

**Settings Form**
`Trigger Settings`
`Trigger Mode`
`(*) External`
`( ) Internal` | `[ 001 ] ms` (Disabled)
`Trigger Signal` | `Trigger 1 [v]`

**Footer**
`Set Advanced` | `OK` `Cancel` | `Run` (Play Icon)

## 5. Interactive controls

- **Radio Buttons:** Toggling to `Internal` would likely enable the millisecond interval input box.
- **Dropdown:** Selects which physical wiring terminal (e.g., Trigger 1, Trigger 2) the controller should listen to for the external pulse.

## 6. User expectation and workflow context

After setting exposure (Image 29), the user tells the system _when_ to take the picture. On a factory line, a photo-eye detects a part and sends a 24V signal to "Trigger 1". This screen maps that physical hardware signal to this specific camera.

## 7. Adjacent screens

- `29-camera-settings-model-shutter-sensitivity.jpg`: The adjacent "Camera" tab.
- `31-lighting-configuration-flash-output.jpg`: Likely the next tab.

## 8. Data shown

- Trigger mappings.

## 9. Failure and edge states hinted

- Internal timer interval is logically disabled when External trigger is selected.

## 10. AI-consumption notes

- **Mapping to our app:** This defines the execution entry point. In our node/graph system, this represents the `ImageSource` or `CameraCapture` node's event listener. External trigger maps to a hardware interrupt, while Internal maps to an infinite loop with a `setTimeout/setInterval`.
