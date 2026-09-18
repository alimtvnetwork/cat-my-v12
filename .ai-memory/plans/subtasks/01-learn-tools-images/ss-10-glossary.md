# SS-10 — Domain glossary & feature scope

Source: 50 reference screenshots of a Keyence-style machine-vision inspection HMI
(program "SUPERTHIN QFN 5X5_REV1", operator "CONTROL AUTOMATION TECHNOLOGY SDN BHD").
This glossary names the entities/verbs/statuses the app must model. Terms are
grouped so they map cleanly onto data types, routes, and UI state.

## 1. Core entities (nouns → future data models)

- **Program / Inspection Program** — top-level saved project (e.g. "SUPERTHIN QFN 5X5_REV1"). Has: name, revision, camera config, trigger config, tool list, reference image(s), pass/fail criteria, run stats.
- **Camera** — physical imaging device. Attributes: id/index, resolution, exposure, gain, white balance, lens/optics, calibration.
- **Trigger** — condition that captures a frame. Types seen: external (I/O), internal/continuous, manual. Attributes: source, delay, debounce.
- **Lighting** — illumination controller channel(s): on/off, intensity, strobe timing.
- **Reference Image** — a "golden" captured frame registered to the program; ROIs and models are authored against it.
- **Tool** — an inspection primitive placed on the reference image. Families observed:
  - Position / Alignment (ShapeTrax / Pattern-search)
  - Presence / Count
  - Dimension / Distance
  - Edge / Line
  - Area / Blob
  - OCR / Barcode (implied by tool ribbon)
  - Color / Intensity
- **ROI (Region of Interest)** — geometric region owned by a tool. Sub-parts: search region (dashed), model/pattern region (solid), mask (hatched), anchor/origin (yellow crosshair), corner labels.
- **Model / Pattern** — the template a matching tool learns from the reference image.
- **Judgment / Criterion** — pass/fail rule per tool (thresholds, min/max, tolerance).
- **Measurement** — a numeric output of a tool for one frame (score, count, distance, coordinate).
- **Result / Inspection Result** — per-frame aggregate: per-tool measurements + per-tool judgments + overall OK/NG.
- **Run / Session** — a continuous production run: start time, counts (Total, OK, NG), throughput.
- **Error / Event** — entry in the Error List: timestamp, code, severity, source (tool id / subsystem), message.
- **User / Operator** — role-scoped account (implied: Operator vs Engineer/Admin — Settings are gated).

## 2. Verbs (actions → future routes/handlers)

- Create / Open / Save / Rename / Duplicate **Program**
- Capture **Reference Image**; Re-register reference
- Add / Remove / Reorder / Duplicate **Tool**
- Edit **ROI** (draw, move, resize, rotate, mask)
- Teach **Model** from reference
- Set **Judgment** thresholds
- Configure **Camera / Trigger / Lighting**
- **Test** (single-shot inspection on current frame)
- **Run / Stop** production
- **Reset counters**
- **Acknowledge / Clear Error**; **Jump to source** (tool that raised it)
- **Export** results / logs

## 3. Statuses & state vocabulary (drives color tokens)

- Tool selection: **Selected** (orange fill), **Unselected** (grey tile)
- Judgment: **OK / Pass** (green), **NG / Fail** (red), **Not evaluated** (grey)
- Run state: **Idle**, **Running**, **Paused**, **Stopped**, **Error**
- Trigger state: **Waiting**, **Captured**, **Missed**
- Connection: **Online**, **Offline**
- Error severity: **Info**, **Warning**, **Error**, **Critical**

## 4. Units & formats

- Coordinates & sizes: **pixels** (px), sometimes **mm** after calibration
- Angles: **degrees** with 3-decimal precision seen in counters
- Scores/match: **0–100** or **0.000–1.000**
- Counts: integer with **tabular-nums**
- Timestamps: `YYYY-MM-DD HH:MM:SS` in Error List

## 5. Feature scope for the eventual build (MVP slice)

In-scope for a faithful clone:

1. Program list + open/create.
2. Reference-image viewport with pan/zoom.
3. Tool catalog ribbon (isometric tiles) → add tool → ROI editor.
4. Per-tool config panel (parameters + judgment thresholds).
5. Run screen: live viewport, counters (Total/OK/NG), start/stop.
6. Error List with jump-to-source.
7. Settings: Camera, Trigger, Lighting.

Out-of-scope (documented but not built in MVP):

- Actual camera/HW I/O (mock with sample frames).
- Calibration wizard.
- Multi-user auth beyond a role toggle.
- Historical analytics dashboards.

## 6. Ambiguities to resolve in SS-11

- Exact taxonomy of tool families vs the ribbon tiles (need image-by-image labeling pass).
- Whether "Reference Image" is single or multi (some frames hint at multi-slot registration).
- Role model (Operator vs Engineer) — inferred, not proven.
- Units default (px vs mm) — depends on calibration presence.
