---
Source: assets/tools-images/42-reference-image-registration-cam1-crosshair.jpg
Screen: Reference Image Registration
Related-Spec: 21-app/40-tools.md
---

# 42 — Reference Image Registration

## 1. One-line purpose

A media management screen to capture, save, and manage the "Golden" reference images used by the vision tools for pattern matching and alignment.

## 2. Full-frame layout

- **Header:** Title `Reference Image Registration CAM1`.
- **Left Pane:** A large image viewer showing the live camera feed (currently black) with a prominent yellow crosshair in the center indicating the optical center of the sensor.
- **Right Pane:** The `Reference Image List`. A scrollable gallery of previously saved images, showing a thumbnail, ID number, resolution, and file size. A `Save >>` button sits to the left of the list to commit the current live feed to memory.
- **Bottom Pane:** Tooling to digitally adjust the position of the reference image (`X Direction`, `Y Direction`, `Theta Direction`) relative to the optical center.
- **Footer:** Global `Close` button.

## 3. Color palette and role

- **Backgrounds:** Light gray UI theme (#EAEAEA).
- **Image Overlays:** Bright yellow for the alignment crosshair.
- **Gallery:** Dark gray thumbnails for the saved reference images.

## 4. Text transcription (grouped by region)

**Header**
`Reference Image Registration CAM1`

**Left Pane (Image Viewer)**
`Current Image` | `Raw 2 [v]`
_(Yellow Crosshair in center)_

**Right Pane (Gallery)**
`Saved to`
`1 - [000]`
`[Save >>]`
`[ ] Compress`

`Reference Image List` `[Trash Icon]`
`[Thumbnail]` | `1 - 000` `1600 x 1200` `1876KB`
`[Thumbnail]` | `1 - 030` `1600 x 1200` `1876KB`
`[Thumbnail]` | `1 - 500` `1600 x 1200` `1876KB`
`[Thumbnail]` | `1 - 600` `1600 x 1200` `1876KB`
`[Thumbnail]` | `1 - 601` `1600 x 1200` `1876KB`
`[Thumbnail]` | `1 - 899` `1600 x 1200` `1876KB`

`[SD Card 1 Icon] Free Space` `109.21MB/470.62MB`
`[Run]` (Play Icon)

**Bottom Pane**
`Adjust Position` | `Custom [v]`
`X Direction` | `[0000.000]`
`Y Direction` | `[0000.000]`
`θ Direction` | `[000.000]`
`[x] Use Mouse` `[Clear]`

**Footer**
`Close`

## 5. Interactive controls

- **Save Button:** Captures the current frame buffer and adds it to the list.
- **Gallery List:** Clicking a thumbnail likely loads that image into the viewer as the active reference.
- **Adjust Position:** Allows sub-pixel mathematical shifts of the image center, useful for aligning the physical setup with software coordinate systems.

## 6. User expectation and workflow context

Before setting up any tools (like ShapeTrax), the user needs a pristine "Golden" image of a perfect part. They physically place a good part under the camera, use this screen to capture it, and save it to the system's memory. All subsequent tools will reference this specific image ID (e.g., Image 1-601).

## 7. Adjacent screens

- `35-shapetrax3-reference-image-detection-conditions.jpg`: Shows how a specific tool selects one of these saved images (`1 - 601`) as its baseline.

## 8. Data shown

- Available SD Card storage space.
- Image resolution and file size.

## 9. Failure and edge states hinted

- If the SD card fills up, the `Save >>` button might disable or warn the user. The `Compress` checkbox offers a way to save space at the cost of image quality.

## 10. AI-consumption notes

- **Mapping to our app:** This is the `Asset Library` or `Media Manager`. The concept of a "Reference Image" is fundamental. Tools don't just operate on a live stream; they are configured against a static, known-good reference image, which must be managed and stored in the project state.
