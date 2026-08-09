---
Source: assets/tools-images/26-output-settings-judgment-total-status.jpg
Screen: Output Settings — Judgment Settings (Total Status)
Related-Spec: 21-app/40-tools.md
---

# 26 — Output Settings — Judgment Settings (Total Status)

## 1. One-line purpose

A system configuration screen to define how the overall "Total Status" pass/fail judgment is calculated across multiple cameras and tools.

## 2. Full-frame layout

- **Header:** Title `Output Settings`.
- **Left Sidebar:** A vertical list of output configuration categories (Judgment Settings, terminals, protocols, physical media).
- **Main Content Area (Top):** Explanatory text about CAM Judgment and Partial Judgment.
- **Main Content Area (Middle):** A tabbed interface (`Total Status`, `CAM Judgment`, `Partial Judgment`).
- **Main Content Area (Bottom):** Configuration pane for the selected tab. Here, it simply displays a static explanation for Total Status.
- **Footer:** `OK` and `Cancel` buttons at the bottom right.

## 3. Color palette and role

- **Backgrounds:** Very dark gray for header, dark gray for sidebar, light gray for main content area.
- **Selection State:** The selected sidebar item (`Judgment Settings`) and the active tab (`Total Status`) are highlighted in orange (#FFB300).
- **Text:** White text in sidebar, black text in main content.

## 4. Text transcription (grouped by region)

**Header**
`Output Settings`
`Judgment Settings`

**Left Sidebar**
`Judgment Settings` (Selected)
`OR Terminal`
`OUT Terminal`
`RS-232C (Non-Procedural)`
`Ethernet (Non-Procedural)`
`SD Card 2`
`USB HDD`
`PC Program`
`PLC-Link`
`EtherNet/IP`
`PROFINET`
`FTP`
`Image Output`

**Top Explanation Text**
`Selects a tool as a target of CAM judgment and Partial Judgment.`
`CAM Judgment results in the value of the logical add (OR) of the judged value for the selected tool. (OK=0, NG=1)`
`The judgment of the unset CAM is OK(0).`
`Partial Judgment results in the value of the logical add (OR) or logical multiply (AND) derived from the judgments of the selected`

**Tabs**
`Total Status` (Selected)
`CAM Judgment`
`Partial Judgment`

**Tab Content**
`Total status is the OR (logical add) value of the CAM judgment.`

**Footer**
`OK`, `Cancel`

## 5. Interactive controls

- **Sidebar List:** Allows navigation between different output configurations.
- **Tabs:** Switches between judgment configuration scopes.
- **Buttons:** OK/Cancel to apply/discard changes globally for this modal.

## 6. User expectation and workflow context

The user has completed setting up their vision tools and is now configuring how the physical controller communicates the final Pass/Fail (OK/NG) signal to the factory PLC or reject mechanism.

## 7. Adjacent screens

- `27-output-settings-image-output-sd-card.jpg`: Another screen within the Output Settings modal.

## 8. Data shown

- Logical definitions for Judgment outputs.

## 9. Failure and edge states hinted

- None explicitly, but configuring this incorrectly means the machine might not reject bad parts.

## 10. AI-consumption notes

- **Mapping to our app:** This defines the global evaluation logic. A "Total Status" is almost universally an OR gate of all failure conditions (if any tool fails, the total status is fail). We should provide a global `Settings` > `Output Logic` view replicating this deterministic rollup.
