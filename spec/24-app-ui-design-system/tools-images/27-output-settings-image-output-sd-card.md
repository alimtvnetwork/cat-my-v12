---
Source: assets/tools-images/27-output-settings-image-output-sd-card.jpg
Screen: Output Settings — Image Output
Related-Spec: 21-app/40-tools.md
---

# 27 — Output Settings — Image Output

## 1. One-line purpose

A system configuration screen to define the conditions, destination, and naming rules for saving inspection images to external storage.

## 2. Full-frame layout

- **Header:** Title `Output Settings` > `Image Output Settings`.
- **Left Sidebar:** Vertical list of output configurations. `Image Output` is selected at the bottom.
- **Main Content Area:**
  - **Enable Checkbox:** A master toggle to enable image output.
  - **Destination Block:** Dropdowns and text fields for location and specific folder path.
  - **Condition Block:** Radio buttons defining _when_ to save an image (e.g., only on failures).
  - **Priority Block:** Radio buttons to prioritize image saving vs. outputting the result signal first.
  - **Naming Rule Block:** Read-only (or dynamically constructed) strings showing folder and file naming conventions based on timestamp and status.
- **Footer:** `OK` and `Cancel` buttons.

## 3. Color palette and role

- **Selection State:** `Image Output` in the sidebar is highlighted orange.
- **Form Elements:** Standard Windows-style gray dropdowns, white text inputs, and gray disabled/read-only text panels.

## 4. Text transcription (grouped by region)

**Header & Top Text**
`Image Output Settings`
`Changes various settings for operations such as outputting images used for measurements with this controller to an external device or saving them to SD Card 2.`

**Left Sidebar**
_(Same as Image 26, but `Image Output` is selected)_

**Main Form**
`[x] Enable Image Output`
`Image Output Location` | `SD Card [v]`
`Destination` | `SD2:/cv-x/image/SD1_022/` `[Edit]`
`Image Output Condition` | `( ) Output Relevant CAM Image Every CAM Judgment NG`
`(*) Output Every Total Status NG`
`( ) Always Output`
`Process Priority` `(*) Image First` `( ) Output First`
`Output Target` `[Set]`

**Naming Rule Block**
`Saving Folder` | `[Destination]/[yymmdd]_[hhmmss]/[CAMn]/`
`Image File Name` | `[yymmdd]_[hhmmss]_[Total Count]_[CAM No]_[CAM Judgment].bmp`
`[Details]`

**Footer**
`OK`, `Cancel`

## 5. Interactive controls

- **Checkboxes & Radios:** Standard binary/exclusive toggles.
- **Edit/Set/Details Buttons:** Launch sub-modals for granular string editing or target selection.

## 6. User expectation and workflow context

The user wants to collect data from the production line, specifically capturing images of defective parts for later offline analysis or quality assurance records. Saving _every_ image might overflow storage or slow down cycle time, hence the conditional options.

## 7. Adjacent screens

- `26-output-settings-judgment-total-status.jpg`: Previous tab.
- `28-output-settings-usb-hdd-select-data.jpg`: Data output configuration.

## 8. Data shown

- Current directory path (`SD2:/cv-x/image/SD1_022/`).
- Filename templates using bracketed variables (e.g., `[yymmdd]`).

## 9. Failure and edge states hinted

- Storage full (implicitly handled by the system).

## 10. AI-consumption notes

- **Mapping to our app:** When we implement a "Data Logging" or "Archiving" module, we must support templated file naming rules based on tool evaluation results (e.g., appending `_NG` or `_OK` to the filename) and conditional saving logic.
