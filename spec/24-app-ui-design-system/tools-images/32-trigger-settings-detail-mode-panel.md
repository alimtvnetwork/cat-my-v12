---
Source: assets/tools-images/32-trigger-settings-detail-mode-panel.jpg
Screen: Details of Trigger Settings (Modal)
Related-Spec: 21-app/40-tools.md
---

# 32 — Details of Trigger Settings (Modal)

## 1. One-line purpose

A detailed modal dialog expanding on the Trigger Settings, allowing the user to select multiple concurrent sources for an external trigger and configure trigger delay.

## 2. Full-frame layout

- **Header:** Title `CAM 1 : ... > Trigger Settings`. Left side says `Details of Trigger Settings`.
- **Left Pane:** Live image feed.
- **Right Pane (Modal overlay):**
  - **Trigger Mode:** Radio buttons (`External`, `Internal`). Under `External`, an array of 8 checkboxes for different trigger protocols.
  - **Trigger Settings:** Dropdown for `Trigger Signal` and a slider for `Trigger Delay (ms)`.
  - **Run Screen Update Mode:** Checkbox for `Live Image in Run Mode`.
- **Footer (of Modal):** `OK`, `Cancel`.

## 3. Color palette and role

- **Backgrounds:** Modal background is light gray (#EAEAEA).
- **Form Controls:** Checkboxes, radios, sliders, and dropdowns.

## 4. Text transcription (grouped by region)

**Header**
`Details of Trigger Settings`
`Specifies the detailed conditions on the trigger.`
`CAM 1 : ... > Trigger Settings`

**Modal Form**
`Trigger Mode`
`(*) External` `( ) Internal`
`[x] External Terminal` `[x] Mouse`
`[x] RS-232C` `[x] Ethernet(TCP/IP)`
`[x] PLC-Link` `[x] PC Program`
`[x] EtherNet/IP` `[x] PROFINET`

`Trigger Settings`
`Trigger Signal` | `Trigger 1 [v]`
`Trigger Delay (ms)` | `[Slider]` `000`

`Run Screen Update Mode (Global Settings)`
`[ ] Live Image in Run Mode`

**Footer**
`OK` `Cancel`

## 5. Interactive controls

- **Checkboxes (Protocols):** All are checked by default, meaning the camera will snap a photo if _any_ of these sources sends a trigger command (OR logic).
- **Trigger Delay Slider:** Allows adding a precise hardware delay between receiving the signal and exposing the sensor (useful if the photo-eye is physically upstream of the camera field of view).

## 6. User expectation and workflow context

The user clicked "Set Advanced" on the main Trigger tab (Image 30) because they need to fine-tune exactly _which_ network protocols are allowed to trigger the camera, or they need to dial in a millisecond delay to perfectly center a moving part in the frame.

## 7. Adjacent screens

- `30-trigger-settings-external-internal-signal.jpg`: The parent screen that spawned this modal.

## 8. Data shown

- Available industrial protocols (`PROFINET`, `EtherNet/IP`, `PLC-Link`).

## 9. Failure and edge states hinted

- Unchecking all boxes while in External mode would mean the camera never triggers.

## 10. AI-consumption notes

- **Mapping to our app:** "Trigger Delay" is a critical feature in high-speed manufacturing. Our `CameraCapture` node config must include an optional `delay_ms` property. Supporting multiple OR-gated trigger sources is also standard practice.
