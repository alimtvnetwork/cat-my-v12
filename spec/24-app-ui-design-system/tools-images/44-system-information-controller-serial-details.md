---
Source: assets/tools-images/44-system-information-controller-serial-details.jpg
Screen: System Information (Modal)
Related-Spec: 21-app/40-tools.md
---

# 44 — System Information (Modal)

## 1. One-line purpose

A read-only modal displaying hardware specifications, firmware versions, MAC addresses, and resource utilization for the vision controller.

## 2. Full-frame layout

- **Background:** The main Run Mode dashboard.
- **Modal:** Centered `System Information` dialogue box.
- **Content Layout:** A vertical list of key-value pairs grouped logically (Hardware IDs, Camera Inputs, Firmware Versions, System Resources).
- **Footer:** A button linking to Open Source `Libraries...`, and a `Close` button.

## 3. Color palette and role

- **Modal Chrome:** Light gray (#EAEAEA) with a dark blue title bar.
- **Text:** Black standard font.

## 4. Text transcription (grouped by region)

**Modal Header**
`System Information`

**Modal Body**
`CV-X420A (4.2.0000)`
`Copyright (c) 2016 KEYENCE CORPORATION.`
`All rights reserved.`

`Serial No.` | `A7711081`
`Controller ID` | `057243147`
`MAC Address` | `00:01:FC:39:F3:93`
`Hardware Version` | `0000.3030`

`Camera Input Unit`
`Camera1/2` | `CA-E100` | `--------`
`Camera3/4` | `--------` |

`Current Version`
`Program Settings` | `4.2`
`Global Settings` | `4.2`

`Resource Memory Usage` | `3.5 %`
`Processing Capacity` | `3.5 %`

`Free Space`
`SD 1` `[1 Icon]` | `109.21 MB /470.62 MB`
`SD 2` `[2 Icon]` | `0 KB / 0 KB`

**Footer Buttons**
`Libraries...`
`Close`

## 5. Interactive controls

- **Libraries Button:** Opens a secondary modal with OSS license text.
- **Close Button:** Dismisses the modal.

## 6. User expectation and workflow context

Used primarily for tech support or auditing. A maintenance engineer might open this to check the firmware version before attempting an update, or to read the MAC address for network provisioning.

## 7. Adjacent screens

- `45-system-license-general-public-license.jpg`: The screen that appears when clicking `Libraries...`.

## 8. Data shown

- Controller Model (`CV-X420A`), OS version, Serial Number, MAC Address.
- Memory and CPU (`Processing Capacity`) utilization (very low at 3.5%).
- SD Card capacities.

## 9. Failure and edge states hinted

- `Camera3/4` is populated with dashes, indicating no expansion card is installed in that hardware slot.

## 10. AI-consumption notes

- **Mapping to our app:** Standard "About" page. The inclusion of `Resource Memory Usage` and `Processing Capacity` is a good touch for edge AI devices, as vision algorithms can easily max out CPU/RAM. We should consider a global status indicator for system load.
