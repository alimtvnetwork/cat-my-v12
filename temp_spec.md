# 01 — Pattern Search (Standard UI) — Full Implementation Spec

Status: authoritative build spec. Hand this single file to an AI agent; it is
self-contained (all reference screenshots are embedded as base64 data URIs at the
bottom, plus zoomed crops inline next to the section that describes them).

Source screenshots: photographs of a real machine-vision controller running a
"Pattern Search" inspection tool. The Standard UI must replicate this screen's
structure, controls and behaviour inside the existing web app.

Reference screen in the current app: `/setup/rules/14` (rule editor). The Standard
UI renders in that same place when Standard mode is active.

---

## 0. Read this first — non-negotiable rules

1. **Do not modify or degrade the Modern UI.** The existing Modern UI stays exactly
   as it is today: same routes, same components, same behaviour. The Standard UI is
   an _additional_ presentation of the same data and the same domain logic.
2. **DRY is the highest priority in this task.** Every option list, enum, default
   value, validation rule and persistence path is defined **once** in shared domain
   code and consumed by both UIs. If someone adds a new pattern shape (say
   "Ellipse") to the shared definition, it must appear automatically in the Modern
   UI dropdown **and** in the Standard UI dropdown with zero extra edits.
   Duplicating an option array into a "standard" copy is a failed implementation.
3. **A UI-mode switch is used in every case.** Wherever a rule/tool editor is
   rendered, the code branches on the active UI mode and renders either the Modern
   component or the Standard component. Only _presentation_ branches; state,
   validation, persistence and computation do not.
4. **Do not invent semantics for the unknowns.** Section 12 lists fields whose exact
   meaning is not yet known. Render them exactly as shown, wire them to state, and
   raise the open question — never guess a formula or a unit.
5. **Everything on screen must exist.** Every readout, icon, tab, dropdown, slider,
   numeric box and button described below is present in the Standard UI, in the same
   relative position, even when its handler is a documented TODO.

---

## 1. Architecture: the two-UI switch

### 1.1 Shared domain layer (single source of truth)

Create/extend a shared, UI-agnostic module (suggested `src/domain/vision/`) that owns:

- `PatternShape` — the pattern/region shape catalogue: `Rectangle`, `Circle`,
  (extensible: `Ellipse`, `Polygon`, `Rotated Rectangle`, `Arc`, ...). Each entry:
  `id`, `label`, `icon`, `defaultGeometry`, `handles` (which resize handles it
  exposes), `serialize/deserialize`.
- `MaskShape` — the mask/region-of-exclusion shape catalogue. Includes a `None`
  entry used by the Standard UI's empty mask slots. Derived from the same shape
  catalogue as `PatternShape` wherever the shapes coincide — do not maintain two
  lists of "Rectangle".
- `PatternSearchSettings` — the tool's full state:
  ```ts
  {
    id: string;                    // e.g. "T106"
    name: string;                  // "Pattern Search"
    referenceImage: { set: number; index: number };  // shown as "1 - 000"
    searchRegion:  { shape: ShapeId; geometry: Geometry };
    patternRegion: { shape: ShapeId; geometry: Geometry };
    masks: MaskLayer[];            // Standard UI: exactly 4 slots; Modern UI: unbounded
    detection: {
      angleRangeDeg: number;       // "+/- 030"
      detectionCount: number;      // "01"
      searchSensitivity: number;   // slider, labelled Normal at midpoint
      accuracy: number;            // slider, labelled Normal at midpoint
      minMatchPercent: number;     // "40"
    };
    imageRegion: {                 // purpose TBD — see §12
      enabled: boolean;
      referenceTool: string | null;
      detectionColor: "white" | "black";
    };
    view: { source: ImageSource; rendering: RenderMode; zoom: number };
  }
  ```
- Validation, clamping, defaults, and the persistence adapter.

Both UIs import from here. Neither UI defines its own copy of any of the above.

### 1.2 UI mode switch

```ts
type UiMode = "modern" | "standard";
```

- Persist the choice (per user, and overridable per case/rule).
- Expose it through one hook, e.g. `useUiMode()`, and one switch component, e.g.
  `<UiModeSwitch />`, placed consistently in the app chrome.
- Every editor surface follows this exact pattern:

```tsx
const mode = useUiMode();
return mode === "standard" ? (
  <StandardPatternSearch settings={settings} onChange={onChange} />
) : (
  <ModernPatternSearch settings={settings} onChange={onChange} />
);
```

- Both components receive the **same props** and emit the **same change events**.
  Switching mode mid-edit must preserve all in-progress state with no data loss and
  no re-mount side effects that reset geometry.

### 1.3 Standard UI component tree (suggested)

```text
StandardPatternSearch
├── StandardHeaderReadouts        (Unit Time, Counts, Judged Label block, ?, 1/2)
├── StandardImageToolbar          (source, rendering, refresh, zoom, view modes)
├── StandardCanvas                (image + draggable/resizable region overlays)
├── StandardToolPanel
│   ├── ToolTitleBar              ("T106 Pattern Search" + tree row)
│   ├── ReferenceImageSelector    ("1 - 000")
│   ├── ToolTabs                  (Search Region | Pattern Region | Extract Colors | Image Enhance)
│   └── ToolTabBody               (Edit Pattern Region | Detection Conditions | Search Region + Masks)
└── StandardActionBar             (Origin/Point, Display, OK, Cancel, ..., Register Image, Run, settings)
```

---

## 2. Overall layout and visual system

Full reference (Screen 1):

The screen is a fixed-aspect controller panel with two columns:

- **Left column (~62% width):** black chrome. Top = numeric readout header. Below
  it = image toolbar strip. Below that = the image canvas with coloured region
  overlays, filling the remaining height.
- **Right column (~38% width):** the tool panel. Dark navy title bar at the top,
  then a light warm-grey (bone / off-white `#e8e5df`-ish) panel body with a thin
  1px mid-grey border and a scrollbar on its right edge.
- **Bottom strip (full width, black):** the action bar with Register Image, Run and
  the settings icon; the panel's own OK / Cancel sit just above it inside the panel.

Visual rules:

- Implement all colours as **semantic design tokens** in the theme (e.g.
  `--std-chrome`, `--std-panel`, `--std-panel-header`, `--std-accent-active`,
  `--std-primary-action`, `--std-region-search`, `--std-region-pattern`,
  `--std-region-image`). No hardcoded hex/`text-white`/`bg-black` in components.
- Typography: small, wide-tracked, sans; numeric values right-aligned inside boxed
  fields with a 1px border and near-white fill. Labels are sentence case with a
  small round bullet marker to their left inside the panel.
- Active tab accent: green (top edge / border of the panel and the selected tab's
  amber-orange highlighted tile).
- Primary action (Run) is blue-filled; secondary buttons are grey bevelled tiles.
- Density is high: ~28px control height, 8px gutters. This should read as an
  industrial HMI, not a consumer web app. Keep it crisp and flat-with-a-hint-of-bevel.

Responsiveness: the Standard UI targets a landscape panel. Below ~1024px, keep the
same layout and allow horizontal scroll rather than reflowing into a mobile stack —
operators expect fixed positions.

---

## 3. Header readouts (top-left, black area)

Left-hand label/value pairs:

| Element        | Shown as | Meaning                                                                                                                 | Behaviour                                                     |
| -------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `Unit Time`    | `8.8ms`  | Execution time of this tool. **Exact definition unknown — see §12.**                                                    | Read-only, monospaced, updates after each Run.                |
| `Counts`       | `1`      | Number of detected instances (how many pockets/features were found in this run). Bounded by `detection.detectionCount`. | Read-only, updates after each Run.                            |
| `Judged Label` | `1`      | Index/label of the result currently being displayed in the readouts below.                                              | Read-only; paired with the `1/2` pager.                       |
| `Pos. X`       | `10.074` | X position of the matched pattern's origin point, 3 decimals.                                                           | Read-only.                                                    |
| `Pos. Y`       | `7.554`  | Y position of the matched pattern's origin point, 3 decimals.                                                           | Read-only.                                                    |
| `Angle`        | `0.000`  | Rotation of the match relative to the registered reference, 3 decimals, degrees.                                        | Read-only.                                                    |
| `Match %`      | `99.999` | Correlation score of the match, 3 decimals. Compared against `Min. Match%`.                                             | Read-only; render below `minMatchPercent` in a warning token. |

Right-hand cluster of the header, in order left→right:

1. **`123.4` icon** — numeric display-format toggle. Opens the numeric formatting
   options (decimal places / units) for the readouts. Small bevelled tile.
2. **`?` help button** — contextual help for the active tool. Opens a help panel or
   modal describing Pattern Search.
3. **`1/2` page indicator with `◀` `▶` arrows** — pages through the detected results
   (result 1 of 2). `◀` = previous result, `▶` = next result. Both disable at the
   ends. Changing the page updates `Judged Label`, `Pos. X/Y`, `Angle`, `Match %`
   and highlights the corresponding match on the canvas.

All readouts derive from the shared result model so the Modern UI shows the same
numbers from the same source.

---

## 4. Image toolbar (strip above the canvas)

Left→right:

1. **Image source dropdown** — currently `Reference Image`. Selects which image feed
   the canvas displays (Reference Image, Live/Camera Image, Last Captured, ...). The
   option list comes from the shared `ImageSource` catalogue.
2. **Rendering dropdown** — `Raw 2` in Screen 1, `Filtered` in Screens 2 and 3.
   Selects how the selected image is rendered: raw sensor output (`Raw 1`, `Raw 2`,
   ...) versus the filtered/pre-processed result produced by Image Enhance. Options
   come from the shared `RenderMode` catalogue.
3. **Refresh / reload icon (circular arrow)** — re-fetches and re-renders the current
   image. Shows a spinner while loading.
4. **Zoom in (`magnifier +`)** — increases zoom one step.
5. **Zoom out (`magnifier −`)** — decreases zoom one step.
6. **Fit / actual-size icon (magnifier with frame)** — fits the image to the canvas
   viewport.
7. **`40%` zoom readout** — current zoom level as a percentage. **What 100% means
   here is not yet confirmed — see §12.** Render it as a clickable value that opens
   a preset list (25 / 40 / 50 / 100 / 200 / Fit) and also accepts direct entry.
8. **Three view-mode icons (framed square variants)** — display toggles for the
   canvas: (a) show/hide region overlays, (b) show/hide result graphics
   (match markers, origin cross), (c) show/hide the grid/crosshair. Treat them as
   independent toggles with pressed state; label them via tooltips.

Zoom behaviour on the canvas: wheel zoom must be cursor-anchored, delta-normalised
(`z * Math.exp(-dy * 0.0015)`, `deltaMode` normalised) and attached as a
**non-passive** native `wheel` listener so the page does not scroll behind it.
Trackpad pinch (`wheel` with `ctrlKey`) is handled by the same listener. Middle-drag
or space-drag pans. Prefer a maintained pan/zoom library if one already exists in
the project.

---

## 5. Canvas and region overlays

The canvas shows the image with these overlays, colour-coded:

- **Yellow rectangle (outermost)** — the image region / full field of view frame.
- **Blue rectangle** — the **Search Region**: the area of interest the algorithm
  scans. Nothing outside it is searched.
- **Green rectangle** — the **Pattern Region**: the actual feature being matched
  (the template). It normally sits inside the search region.
- **Magenta/pink square handles** — the resize handles on the currently selected
  region (corners plus edge midpoints, 8 handles for a rectangle).
- **Green arrow/marker at the centre (Screen 2)** — the match origin point and its
  orientation (angle) for the currently displayed result.

Interaction requirements (all of these are required, not optional):

- Clicking a region selects it and shows its handles; the corresponding panel
  section highlights.
- **Drag the body** of a region to move it; **drag a handle** to resize it. Corner
  handles resize in two axes; edge handles in one. Shift-drag preserves aspect ratio.
- Geometry is clamped to the image bounds; minimum size is enforced from the shared
  shape definition.
- Movement/resize updates the shared settings live (throttled to animation frames)
  so numeric fields in the panel and the readouts stay in sync both ways: editing a
  numeric field moves the region, and moving the region updates the numbers.
- Geometry is stored in **image pixel coordinates**, not screen coordinates. Convert
  through the current zoom/pan transform; the anchor must not drift when zoomed.
- Keyboard: arrow keys nudge by 1px, shift+arrow by 10px, `Esc` deselects,
  `Delete` clears a mask layer.
- The same drag/resize engine is shared with the Modern UI. Do not write a second
  one for Standard.

---

## 6. Tool panel header and tabs

### 6.1 Title bar

- Dark navy strip reading **`T106`** (the tool's slot/ID within the inspection
  program) followed by the tool name field **`Pattern Search`** in an editable-looking
  boxed input. `T106` is fixed and derives from the tool's position; the name is
  user-editable and defaults to the tool type.
- Below it, a small tree row with the tool-type icon and `Pattern Search` — the
  breadcrumb/tree entry for the currently edited tool. In Screen 3 this becomes
  `Pattern Search > Search Region`, so the row is a **breadcrumb** reflecting the
  active sub-screen.
- Right-aligned on the next line: **`Reference Image  1 - 000`** — a selector for
  which registered reference image this tool is bound to. The `1 - 000` format
  (set - index? bank - slot?) is **not yet understood — see §12**. Render it as a
  boxed value with a picker; keep the raw `N - NNN` display format.

### 6.2 The four tabs

Four large icon tiles in one row. Selected tile = amber/orange fill with a green
inner glyph and a pressed bevel; unselected = pale grey; disabled = washed out.

| Tab                | State in Screen 1 | Meaning                                                                                                                              | Body it opens                                           |
| ------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| **Search Region**  | enabled           | Defines _where_ to look — the region of interest, plus mask regions to exclude.                                                      | §8 (Screen 3)                                           |
| **Pattern Region** | **selected**      | Defines _what_ to look for — the template pattern and its shape.                                                                     | §7 (Screen 1) then §7.3 Detection Conditions (Screen 2) |
| **Extract Colors** | disabled/greyed   | Colour extraction pre-step. Out of scope for now; render greyed with a tooltip "Not available for this image type".                  | —                                                       |
| **Image Enhance**  | enabled           | Image pre-processing / filtering (produces the `Filtered` rendering). **Contents deferred — its own screen, to be specified later.** | placeholder screen                                      |

Each tab keeps the canvas visible; only the panel body swaps. Tab state is part of
the shared settings so switching UI mode preserves the active tab.

---

## 7. Pattern Region tab

### 7.1 Edit Pattern Region (Screen 1)

Panel body contents, top to bottom:

1. Section heading **`Edit Pattern Region`**.
2. Instructional body text, reproduced verbatim:
   > Place the pattern region around the distinctive pattern to be detected.
   > Press the "OK" button after setting is completed.
   > The drop-down menu enables change of the region type.
3. Label **`Pattern Region`** with a shape **dropdown**, current value `Rectangle`,
   with a small shape glyph to the left of the label inside the control.
   **This dropdown is populated from the shared `PatternShape` catalogue** — the same
   list the Modern UI uses. Rectangle and Circle exist today; more will be added.
   Changing the shape converts the on-canvas region to that shape, preserving centre
   and approximate size, and swaps the handle set.
4. Label **`Reference Image`** with the boxed value `1 - 000` (same selector as §6.1;
   it is repeated here for convenience and must stay in sync — one state, two views).
5. **`OK`** and **`Cancel`** buttons, right-aligned at the bottom of the panel body.
   `OK` commits the region edit and returns to the tool's main body;
   `Cancel` reverts to the geometry captured when the tab was opened.

### 7.2 Detection Conditions (Screen 2)

After the pattern region is confirmed, the panel shows the Detection Conditions
block.

| Control                                         | Displayed         | Type                                             | Notes                                                                                                                                                                     |
| ----------------------------------------------- | ----------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Detection Conditions` header + **`>>`** button | —                 | expander                                         | The `>>` opens the advanced/extended conditions panel (further parameters, to be specified). Render it as a small square bevelled button at the header's right edge.      |
| `Angle Range`                                   | `+/- 030`         | numeric field with a `+/-` prefix label          | Allowed rotation deviation in degrees, ±. Zero-padded to 3 digits. Range 0–180.                                                                                           |
| `Detection Count`                               | `01`              | numeric field                                    | Maximum number of matches to report. Zero-padded to 2 digits. Minimum 1. Drives `Counts` and the `1/2` pager.                                                             |
| `Search Sensitivity`                            | `Normal` + slider | slider with a text value on the right            | Discrete levels (e.g. Low / Normal / High) or a 0–100 scale whose midpoint reads `Normal`. Tick marks are drawn beneath the track. Higher = finds weaker matches, slower. |
| `Accuracy`                                      | `Normal` + slider | slider with a text value                         | Same control style. Higher = more precise sub-pixel fit, slower.                                                                                                          |
| `Min. Match%`                                   | `40` + slider     | numeric field **and** slider, bound to one value | The minimum correlation score for a match to be accepted. `Match %` in the header is compared against this. 0–100.                                                        |

Slider styling: thin light track with a diamond/round handle and 9 tick marks under
the track; the current textual level sits right-aligned on the label row.

All values live in `settings.detection` and are shared with the Modern UI.

### 7.3 `40%` vs `Min. Match% 40`

Note for the implementer: the `40%` in the image toolbar (§4 item 7) is the **zoom
level**, and the `40` in Detection Conditions is the **minimum match percentage**.
They coincidentally share the number in these screenshots and must **not** be bound
to the same state.

---

## 8. Search Region tab — regions and mask layers (Screen 3)

Breadcrumb reads `Pattern Search > Search Region`.

### 8.1 Search Region block

- Section header bar `Search Region` (grey band).
- Row: label `Search Region` + shape **dropdown** currently `Rectangle`, plus a `>>`
  button to its right that opens the detailed geometry editor (numeric X/Y/W/H, and
  shape-specific parameters).
- The dropdown options come from the **same shared shape catalogue** as the pattern
  region. When it changes, the blue region on canvas converts shape.

### 8.2 Mask Region block — the four fixed layers

- Section header bar `Mask Region`.
- Exactly **four** rows: `Mask Region 0`, `Mask Region 1`, `Mask Region 2`,
  `Mask Region 3`. Each row has one dropdown, default `None`.
- Each dropdown lists `None` + the shared shape catalogue (Rectangle, Circle, ...).
  Selecting a shape creates that mask on the canvas with a default geometry inside
  the search region; selecting `None` removes it.
- **Mask regions are layers.** Think of the Standard UI as a layer stack limited to
  four slots, index 0 on top. Each mask excludes its area from the search.
  - **Standard UI: exactly 4, fixed, never more, never fewer.** Empty slots still
    render, showing `None`. There is no add/remove button — the count is fixed.
  - **Modern UI: unlimited layers**, with add/remove/reorder, free-form draw tools,
    naming, visibility toggles and everything it has today. That flexibility is kept
    exactly as it is.
  - Both read and write the **same `masks: MaskLayer[]`** in the shared model. When
    a case authored in the Modern UI has more than four masks and is opened in the
    Standard UI, show the first four and display a non-destructive notice that
    additional mask layers exist and are still applied — never silently drop them.
- Every mask on the canvas is selectable, draggable and resizable exactly as in §5,
  drawn in its own overlay token colour and labelled with its index.

### 8.3 Image Region block

Rendered disabled until the checkbox is ticked:

- Checkbox **`Use Image Region`** (unchecked by default).
- **`Reference Tool`** — a dropdown/selector, placeholder `None`, listing other tools
  in the program (`T101`, `T105`, ...) whose output can supply the region.
- **`Detection Color`** — a radio pair, `White` (selected) / `Black`.
- **`Preview`** — a button, right-aligned, disabled until the block is enabled.

**The exact purpose of this block is not yet known — see §12.** Build the UI, wire
it to `settings.imageRegion`, and do not implement inferred behaviour beyond
enabling/disabling the controls.

### 8.4 Panel footer

`OK` and `Cancel`, right-aligned at the bottom of the panel body, same semantics as
§7.1 item 5.

---

## 9. Bottom action bar

Two rows sit at the bottom. The upper row belongs to the panel; the lower black strip
spans the window.

**Panel footer row (inside the light panel, left→right):**

| Control        | Appearance                                              | Purpose                                                                                                                                                                   |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Origin/Point` | small square bevelled icon tile with a caption under it | Opens the origin/reference-point editor: sets which point of the pattern is reported as `Pos. X` / `Pos. Y` (centre, corner, or a user-picked point) and the angle datum. |
| `Display`      | small square bevelled icon tile with a caption under it | Opens display options for the canvas: which graphics, labels and result overlays are drawn.                                                                               |
| `OK`           | wide dark-grey bevelled button, right side              | Commits all edits in the current sub-screen and closes it.                                                                                                                |
| `Cancel`       | wide dark-grey bevelled button, far right               | Discards edits made in the current sub-screen and closes it.                                                                                                              |

`OK` / `Cancel` are stacked/duplicated in Screen 1 because two nested panels are open
at once (the tool panel and the Edit Pattern Region sub-panel). Model this as a real
panel stack: each open panel level renders its own footer, and the visible pair
belongs to the topmost level.

**Black action strip (full width, left→right):**

| Control               | Appearance                                                                             | Purpose                                                                                                                                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `...` / keypad button | small dark tile with a dotted-keypad glyph, leftmost (visible in Screen 2)             | Opens the on-screen numeric keypad / soft input used for entering values on a touch panel. Keep it exactly as it is.                                                                                                                                          |
| `Register Image`      | wide dark bevelled button with a two-frames-plus-arrow icon and the label to the right | Captures the current image and registers it as the reference image for this tool (this is what creates the `1 - 000` reference entries).                                                                                                                      |
| `Run`                 | **blue-filled** button with a white `▶` in a small square and the label `Run`          | Executes the Pattern Search tool once against the current image and refreshes all header readouts and canvas result graphics. This is the primary action — it is the only blue control on screen. Shows a running/spinner state and disables while executing. |
| Settings icon         | blue-tinted square tile at the far right, with a small gear-on-frame glyph             | Opens the run/tool settings menu (continuous run, trigger source, save settings, and related program-level options).                                                                                                                                          |

Keep the exact order, relative widths and colour weighting: two neutral dark buttons,
then the blue Run, then the blue-tinted settings tile pinned to the right edge.

---

## 10. Behaviour summary (state flow)

1. Operator opens the rule at `/setup/rules/:id` with Standard mode active.
2. `Pattern Region` tab → drag/resize the green region over the feature → choose the
   shape from the shared dropdown → `OK`.
3. Detection Conditions appear → set Angle Range, Detection Count, Search
   Sensitivity, Accuracy, Min. Match%.
4. `Search Region` tab → set the blue search region shape/geometry → assign up to
   four mask layers → optionally enable Image Region.
5. `Register Image` stores the reference; `Run` executes.
6. Results populate `Unit Time`, `Counts`, `Judged Label`, `Pos. X`, `Pos. Y`,
   `Angle`, `Match %`; the `1/2` pager steps through multiple matches.
7. Switching to Modern mode at any point shows the identical state in the Modern UI.

---

## 11. Acceptance criteria

- [ ] Standard UI reproduces Screens 1, 2 and 3 in structure, ordering and control
      inventory; nothing from the screenshots is missing.
- [ ] The Modern UI is unchanged and fully functional.
- [ ] A single UI-mode switch selects between them; state survives switching in both
      directions with no loss.
- [ ] Adding one new shape to the shared catalogue makes it appear in the Modern UI
      and in **all three** Standard dropdowns (pattern region, search region, all four
      mask slots) with no further code changes. Demonstrate this.
- [ ] No option list, enum or default value is duplicated between the two UIs.
- [ ] Search region, pattern region and every mask region are draggable and
      resizable on the canvas, clamped to image bounds, synced bidirectionally with
      the numeric fields.
- [ ] Exactly four mask slots in Standard; unlimited layers in Modern; both backed by
      the same `masks` array; extra Modern layers are never silently discarded.
- [ ] Cursor-anchored, delta-normalised wheel/pinch zoom with a non-passive listener;
      the page never scrolls behind the canvas.
- [ ] All colours are semantic tokens; no hardcoded colour utilities.
- [ ] Every unknown in §12 is rendered but left un-invented, and surfaced as an open
      question rather than guessed.

---

## 12. Open questions — ASK, DO NOT INVENT

These are explicitly unresolved. Render the UI faithfully, wire the state, and ask
before assigning behaviour or units.

1. **`Unit Time` (`8.8ms`)** — is this the tool's own execution time, the whole
   program's cycle time, or the camera exposure/trigger interval? More information is
   coming; treat it as a read-only measured duration for now.
2. **Zoom `40%`** — what is 100% relative to: sensor pixels 1:1, the fitted view, or a
   calibrated physical scale? Presets are a placeholder until confirmed.
3. **`Reference Image  1 - 000`** — what do the two numbers mean (bank - slot?
   set - frame index?), what is the valid range, and how does `Register Image`
   allocate the next value?
4. **`Image Enhance` tab contents** — to be specified later; likely a separate screen.
   Ship a placeholder body that states this.
5. **`Image Region` / `Use Image Region` block** — purpose of the block, what
   `Reference Tool` selects, and what `Detection Color` White/Black controls.
6. **`Extract Colors` tab** — why it is disabled here, and what it does when enabled.
7. **`>>` expanders** (Detection Conditions header, Search Region row) — the full
   contents of the advanced panels they open.
8. **`Counts`** — confirm this is the number of detected instances ("pockets") and how
   it relates to `Detection Count`.
9. **The three view-mode icons** in the image toolbar — confirm the exact toggle each
   one controls.

---

## 13. Embedded reference images (base64)

The three full screenshots, embedded so this file is self-contained. The zoomed crops
used inline above are embedded at their point of use.

### Screen 1 — Pattern Region selected, Edit Pattern Region panel

Embedded inline in section 2 above (`assets/01-pattern-search/01-pattern-search-main.png`).

### Screen 2 — Detection Conditions

### Screen 3 — Search Region and Mask Region 0-3

Original files also live in the repo at `assets/01-pattern-search/`.
The verbatim briefing that produced this spec is in
`02-conversation/01-pattern-search-briefing.md`.
