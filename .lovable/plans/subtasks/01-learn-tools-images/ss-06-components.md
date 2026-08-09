# SS-06 — Component inventory

**Parent plan:** `.lovable/plans/pending/01-learn-tools-images.md` (step 6/15)  
**Status:** done — 2026-07-09

## Root cause / workflow note

The pasted "error" is a workflow prompt, not a runtime failure; the next unfinished source-of-truth item in the plan is step 6, component inventory.

## Read + verification signal

- Read project memory context: no project memories exist yet (`mem://index.md` absent in injected context).
- Checked optional guidelines before execution: `.lovable/coding-guidelines.md`, `spec/coding-guidelines/`, and `.lovable/seo-guidelines.md` were absent, so none applied.
- Read source files:
  - `.lovable/plans/pending/01-learn-tools-images.md` lines 16–30 — step order and remaining scope.
  - `.lovable/plans/subtasks/01-learn-tools-images/ss-03-cluster.md` lines 11–29 — cluster naming and file ranges.
  - `.lovable/plans/subtasks/01-learn-tools-images/ss-04-palette.md` lines 19–45 — component color vocabulary.
  - `.lovable/plans/subtasks/01-learn-tools-images/ss-05-typography.md` lines 14–29 — type roles to attach to components.
  - `readme.md` lines 1–7, `changelog.md` lines 1–11, `release_notes.md` lines 1–12 — current version/docs state.
- Read actual runtime logs first: latest Vite/dev-server signal showed no application error, only the existing tsconfig-paths warning and normal reload lines.
- Visual evidence reviewed: all-image contact sheet plus cluster sheets A/B/C and representative originals `20260629_172530.jpg`, `20260629_172538.jpg`, `20260629_172817.jpg`, `20260629_172903.jpg`, `20260629_172945.jpg`, `20260629_173139.jpg`, `20260629_173226.jpg`.

## Method

Component inventory was extracted by reading the contact sheets chronologically, then checking representative originals at full size for each repeated UI pattern. Items below are visual/interaction primitives for the CAT MY rebuild, not exact Keyence feature names unless visible in the screenshots.

## Reusable component catalog

| Component                               | Visual treatment                                                                                                 | Function / behavior                                                                                                             | Evidence                                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Application title bar / project strip   | Dark grey chrome, small sans text, project dropdown                                                              | Shows active setup/program (`Set022 SUPERTHIN QFN 5X5_REV1`) and exposes Save/Edit/Global controls                              | `20260629_172530.jpg`, `20260629_173139.jpg`                                               |
| Mode/action header buttons              | Square bevel icon buttons with label, beige/grey surface; selected state dark                                    | High-level actions: Execute, Output, Utility, Go to Run Mode, Total Status                                                      | `20260629_172530.jpg`, `20260629_173226.jpg`                                               |
| Error list launcher                     | Compact button with orange warning triangle                                                                      | Opens modal table of current system/tool errors                                                                                 | `20260629_172530.jpg`, `20260629_172945.jpg`                                               |
| Tool ribbon / inspection pipeline cards | Horizontal card strip, each tile has preview thumbnail + label; selected tile uses orange fill/border            | Represents ordered inspection tools (`Pin 1`, `Marking A/B/C`, `OVERALL MARKING`, `Edge Width`) and navigates between them      | `20260629_172530.jpg`, `20260629_172538.jpg`                                               |
| Add Tools / Tool Catalog dialog         | Large light panel over workspace; category tiles top, feature tiles lower, grey help panel right, footer actions | Choose and add a new inspection/detection tool from categories like Presence/Absence, Flaw Detection, Alignment, Count, OCR/OCV | `20260629_172538.jpg` and cluster A frames 03–25                                           |
| Category tile                           | Square icon+label card; active category orange, disabled feature tiles washed out                                | Selects a class of tools; communicates enabled/disabled choices                                                                 | `20260629_172538.jpg`                                                                      |
| Right help/description panel            | Tall dark grey panel with white text and dotted separator lines                                                  | Contextual explanation for the currently selected tool/category/utility                                                         | `20260629_172538.jpg`, `20260629_173226.jpg`                                               |
| Image viewport / camera canvas          | Black or grayscale inspection canvas with bright yellow active outline                                           | Primary machine-vision image area; shows live/reference images and ROI overlays                                                 | `20260629_172530.jpg`, `20260629_172903.jpg`, `20260629_172958.jpg`                        |
| Viewport source selectors               | Small dark dropdowns (`Current Image`, `Raw 2`, `Reference Image`, `Filtered`) above canvas                      | Switch image source / processing stage                                                                                          | `20260629_172530.jpg`, `20260629_172903.jpg`                                               |
| Viewport tool toolbar                   | Dense row of small icon buttons: refresh, zoom, fit, cursor/region tools                                         | Manipulates canvas view and region editing                                                                                      | `20260629_172817.jpg`, `20260629_172903.jpg`                                               |
| ROI / overlay rectangles                | Thin blue/yellow/red/green outlines on image; current/edit target often red or yellow                            | Defines inspection/search/pattern regions and pass/fail markers                                                                 | `20260629_172530.jpg`, `20260629_172903.jpg`, `20260629_173139.jpg`                        |
| Measurement/status inspector            | Right-side light panel with blue section header, tool icon, measured/lower/upper table, paging control           | Shows result values for selected inspection tool (`Count`, `Pos. X/Y`, `Angle`, `Match %`, `Scale`)                             | `20260629_172530.jpg`, `20260629_173139.jpg`                                               |
| Tool configuration panel                | Right-side form with icon-mode tabs, grouped sections, numeric inputs, dropdowns, radio buttons, OK/Cancel       | Edits detection conditions, feature extraction, search/pattern regions, lighting, camera settings                               | `20260629_172817.jpg`, `20260629_172903.jpg`, `20260629_172910.jpg`, `20260629_172917.jpg` |
| Section expander rows                   | Grey section headers with chevron/double-arrow affordance                                                        | Collapses/opens parameter groups inside tool settings                                                                           | `20260629_172903.jpg`                                                                      |
| Numeric stepper / text input            | White field with thin border, often right-aligned zero-padded values                                             | Machine parameters such as angle range, detection count, volume                                                                 | `20260629_172817.jpg`, `20260629_172903.jpg`                                               |
| Dropdown/select field                   | White/grey field with black triangle arrow                                                                       | Model, light channel, extraction setting, menu selection                                                                        | `20260629_172817.jpg`, `20260629_173139.jpg`                                               |
| Checkbox and radio controls             | Native Windows-style square/circle controls                                                                      | Flash enablement, display feature coarse/fine, option toggles                                                                   | `20260629_172817.jpg`, `20260629_172903.jpg`                                               |
| Tab strip                               | Rectangular tabs with active orange fill/underline and icon                                                      | Switches sub-areas such as Camera / Trigger / Lighting or tool setup modes                                                      | `20260629_172817.jpg`, cluster C frames 48–49                                              |
| Modal table dialog                      | Floating rectangular window with dark title bar, light table, selected row orange, footer buttons                | Error list / settings list; supports scrolling, selection, Jump to Source, Close                                                | `20260629_172945.jpg`                                                                      |
| Left-side settings navigation           | Vertical category list; selected row orange                                                                      | Navigates system/configuration pages                                                                                            | cluster A frames 26–28                                                                     |
| Menu dropdown                           | Native vertical dropdown menu over canvas, light surface, dark text, hover/selected row                          | Accesses Global/System/Utility actions like Communication & I/O, Camera Common, Reboot, System Information                      | `20260629_173139.jpg`, `20260629_173148.jpg`                                               |
| Utility icon grid                       | Large tiled launcher grid with icon + multiline label and category separators                                    | Entry point for utilities: tool adjustment, statistics, batch test, monitor, image settings, files, account/security            | `20260629_173226.jpg`                                                                      |
| Bottom action bar                       | Persistent bottom-right controls; blue primary Run, grey secondary Register Image/Edit/OK/Cancel                 | Commits settings, registers reference image, starts run mode                                                                    | `20260629_172530.jpg`, `20260629_172817.jpg`, `20260629_172903.jpg`                        |
| Pagination micro-control                | Small `1/2`, `1/3` indicator with left/right arrow buttons                                                       | Navigates multi-page measurement/config panels                                                                                  | `20260629_172530.jpg`, `20260629_172903.jpg`                                               |
| Status/result summary strip             | Dark top-left overlay with white/red numeric status values                                                       | Shows live counts, judged label, measured values, thresholds, failures                                                          | `20260629_172903.jpg`, `20260629_172910.jpg`                                               |

## Component hierarchy for rebuild

1. **Shell:** title/project strip → mode/action header → tool ribbon.
2. **Workspace:** inspection canvas + source/zoom toolbar.
3. **Inspector:** selected tool header → result table or editable configuration form.
4. **Overlays:** modal dialogs, dropdown menus, help panels, ROI rectangles.
5. **Commit controls:** bottom action bar with primary Run and secondary OK/Cancel/Register/Edit actions.

## State vocabulary

- **Selected:** orange fill/border on tool/category/tabs/table rows.
- **Primary action:** blue button, reserved for Run and other execution actions.
- **Danger/error:** orange warning launcher for error list; red numeric/result text and red ROI boxes for failed/target states.
- **Pass/OK:** green iconography/overlays for successful detection states.
- **Disabled:** pale/low-contrast icon tiles and greyed labels.
- **Editable canvas active:** yellow canvas outline plus colored ROI handles/rectangles.

## Rebuild implications

- The UI should be dense and workstation-like, not spacious or marketing-style.
- Most surfaces are flat/light-grey panels with thin borders; bevels are subtle and functional.
- Cards are small operational tiles, not decorative content cards.
- Actions should prioritize icon+label buttons, compact tables, dropdowns, tabs, and persistent bottom actions.
- The image canvas is the visual anchor; it should dominate the first viewport with live overlay geometry.

## Confidence

High for repeated shell/workspace/inspector/dialog patterns. Medium for exact naming of specific Keyence tool categories where text is partially blurred by photo angle.
