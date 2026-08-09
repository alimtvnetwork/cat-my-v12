---
Source: assets/tools-images/50-utility-menu-batch-test-monitor-settings.jpg
Screen: Select Utility (Grid Menu)
Related-Spec: 21-app/40-tools.md
---

# 50 — Select Utility (Grid Menu)

## 1. One-line purpose

A full-screen launchpad for advanced diagnostic, testing, and maintenance applications within the vision controller.

## 2. Full-frame layout

- **Left Pane:** A 4x5 grid layout of large, distinct application icons representing different utility functions.
- **Right Pane:** An info panel titled `Select Utility` that provides dynamic help text explaining the purpose of the currently selected or hovered icon.
- **Footer:** `Close` button.

## 3. Color palette and role

- **Background:** Light gray (#EAEAEA) for the grid area.
- **Right Pane:** Dark charcoal gray with white text for the help description.
- **Icons:** Highly skeuomorphic, colorful 3D icons typical of legacy industrial OS design (folders, locks, ethernet ports, bar charts).

## 4. Text transcription (grouped by region)

**Header**
`Utility`

**Left Pane (Icon Grid)**
_(Row 1)_
`[Target Icon] Tool Adjustment Navigation`
`[Folder/Camera Icon] Auto-Teach Inspection Adjustment Navigation`
`[Two Cameras Icon] Camera Installation Replication`
_(Row 2)_
`[Bar Chart Icon] Statistics`
`[Play over Folder Icon] Batch Test`
`(Blank)`
`[Linked NG/OK Icon] Share Judgment Condition`
_(Row 3)_
`[PLC/Arrows Icon] I/O Monitor`
`[PLC/Arrows Icon] RS-232C Monitor`
`[PLC/Arrows Icon] Ethernet Monitor`
`[PLC/Arrows Icon] EtherNet/IP Memory Monitor`
_(Row 4)_
`[Image Size Icon] Scaling`
`[Wireframe Screens Icon] Operation Screens`
`[Folder with Images Icon] Archived Image Settings`
`[Film Strip Icon] Image Strip Settings`
_(Row 5)_
`[Padlock Icon] Security Settings`
`[Two Users Icon] Change Account`
`[Folder Icon] Manage Files`
`[Drive Icon] Remove External Media`

**Right Pane (Info Box)**
`Select Utility`
`Lists the various utility functions which this unit provides.`
`Clicking each icon activates the selected utility function.`
`In addition, clicking the title of each icon displays the outline of the selected utility function on the guide.`

**Footer**
`Close`

## 5. Interactive controls

- **Grid Icons:** Clicking an icon launches that specific modal/application (e.g., opening the I/O monitor to watch digital signals flip in real-time).
- **Hover/Select:** Selecting an item updates the text in the right pane with a description of that tool.

## 6. User expectation and workflow context

This is the "Control Panel" of the vision system. Users come here for tasks outside the normal bounds of configuring a vision tool—tasks like reviewing statistical yield over a shift, testing a batch of saved images offline, checking network communications to a PLC, or safely ejecting a USB drive.

## 7. Adjacent screens

- This screen is accessed from the top ribbon `Utility` button.

## 8. Data shown

- The full suite of available maintenance and diagnostic apps.

## 9. Failure and edge states hinted

- `Remove External Media` suggests the system is sensitive to abrupt USB/SD card removal (data corruption risk).

## 10. AI-consumption notes

- **Mapping to our app:** This defines the scope of peripheral features our application needs to support eventually (Settings, Account Management, I/O monitoring, Batch Testing). We don't need to build all these immediately, but the architecture must allow for these separate "apps" or "views" to exist alongside the main node graph editor.
