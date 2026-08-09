---
Source: assets/tools-images/46-communications-io-system-settings-menu.jpg
Screen: Global Settings Menu
Related-Spec: 21-app/40-tools.md
---

# 46 — Global Settings Menu

## 1. One-line purpose

A dropdown menu providing access to device-level configurations that apply across all programs, such as network setup, time, and system info.

## 2. Full-frame layout

- **Background:** Main Run Mode dashboard.
- **Top Ribbon:** The `Global` button has been clicked.
- **Dropdown Menu:** Overlays the left-center of the screen. A list of global administrative categories.

## 3. Color palette and role

- **Menu Chrome:** Light gray/beige (#F5F5DC or similar) with dark text.

## 4. Text transcription (grouped by region)

**Top Ribbon (Context)**
`Save` `Edit [v]` `Global [v]` (Selected)

**Global Menu**
`Communications & I/O >`
`Camera Common >`
`System >`
`Startup Mode Setting`
`Set Account`
`Date & Time`
`Language`
`Reboot`
`System Information`

## 5. Interactive controls

- **Cascading Menus:** Items with `>` arrows indicate sub-menus that will expand on hover or click.
- **Action Items:** `Reboot` or `System Information` will trigger immediate system actions or modals.

## 6. User expectation and workflow context

While the "Program" menu (Image 43) manages recipe-specific settings, the "Global" menu manages the physical controller itself. Changes here (like setting an IP address or changing the system time) affect the device permanently, regardless of which inspection recipe is loaded.

## 7. Adjacent screens

- `43-program-menu-change-save-delete.jpg`: The counterpart menu for program-specific settings.
- `44-system-information-controller-serial-details.jpg`: The modal that appears when `System Information` is clicked.

## 8. Data shown

- List of global configuration categories.

## 9. Failure and edge states hinted

- None specific to this menu.

## 10. AI-consumption notes

- **Mapping to our app:** This translates directly to an application-level "Settings" page (gear icon) in a modern web app, containing tabs for Network, Account, System, etc.
