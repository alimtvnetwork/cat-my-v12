# SS-01 Inventory of primary inputs

Slug: inventory-primary-inputs
Status: done
Created: 2026-07-17
Parent: 68-ui-improvements-v2-enhancement

## Goal

Produce a flat, deduplicated scratch list of every distinct UI-improvement item mentioned across the three primary inputs. Each item captured with `{id, one-line summary, source-file:source-line}`.

## Inputs to read end-to-end

- `spec/24-app-ui-design-system/09-UI-improvements-v2.md` — the original V2 backlog (source of truth for item wording).
- `.lovable/plans/done/66-ui-v3-missing-completion.md` — first execution wave (extracts step titles, not step bodies).
- `.lovable/plans/done/67-ui-fluid-modern-v2-v3-completion.md` — 50-step execution wave.

## Output shape

Append the scratch list to the bottom of THIS subtask file under a `## Scratch list` heading. Format:

```
- [I-01] Drag affordance polish — spec/24/09:L42 ; plan 67 step 3
- [I-02] Header rebuild — spec/24/09:L58 ; plan 67 step 10
```

Dedupe by item semantics, not wording. Items that only appear in plan 66 or 67 (not spec 09) still count and get an `[I-XX]` id — mark them with `origin: plan` for step SS-03 to reconcile.

## Done when

- Every bullet, heading, and numbered item in spec 09 has an `[I-XX]` entry.
- Every step title in plans 66 and 67 has been checked and either linked to an existing `[I-XX]` or added as a new one.
- No duplicates.

## Scratch list

Ids are stable and consumed by SS-02. Origin `spec09` = mentioned in V2 spec directly; `plan` = surfaced only in plan 66/67. Line refs approximate (spec 09 is one giant paragraph plus recap starting L22).

### Header, shell, navigation

- [I-SH-01] Single header, no duplicate `<header>` above `Titlebar` — spec09 L26 ; plan 66 step 3 ; plan 67 step 10 ; origin: spec09
- [I-SH-02] Reduce header vertical space, stop repeating "Control Automation" — spec09 L26 ; plan 67 step 10 ; origin: spec09
- [I-SH-03] Multi-segment breadcrumb from route match tree, names resolved from store — spec09 L26 ; plan 66 step 5 ; plan 67 step 11 ; origin: spec09
- [I-SH-04] Browser-style Back and Forward buttons — spec09 L26 ; plan 66 step 4 ; plan 67 step 12 ; origin: spec09
- [I-SH-05] Floating draggable Running / Validation pill with stop + click-to-jump, persisted position — spec09 L26 ; plan 66 step 6 ; plan 67 step 13 ; origin: spec09
- [I-SH-06] Command palette Cmd/Ctrl+Shift+P indexing routes/panels/rule kinds — plan 66 step 7 ; plan 67 step 8 ; origin: plan
- [I-SH-07] Window menu reopens closed panels with checkmarks — plan 66 step 7 ; plan 67 step 7 ; origin: plan
- [I-SH-08] Menu items larger, animated, no hover-jitter — spec09 L28 ; plan 67 step 14 ; origin: spec09
- [I-SH-09] Editor-mode menu gating: Window/Panel entries only in editor routes — plan 67 step 9 ; origin: plan
- [I-SH-10] Home cursor semantics: cards default cursor, only inner pills clickable — user request (2026-07-17) ; origin: plan

### Setup landing + sub-areas

- [I-SU-01] Setup landing three tiles: Camera, Rules, Lighting — spec09 L28 ; plan 67 step 15 ; origin: spec09
- [I-SU-02] "Rules" as canonical term, Recipes are Rule Sets — spec09 L24 ; origin: spec09
- [I-SU-03] PascalCase in data, Title Case in UI, no snake_case visible — spec09 L24 ; origin: spec09
- [I-SU-04] Lighting setup surface (exposure, gain, enhance, darken) — spec09 L28 ; plan 67 step 16 ; origin: spec09
- [I-SU-05] Camera setup surface (FOV, pockets, shutter speed) — spec09 L26 ; origin: spec09
- [I-SU-06] YAML export/import parity for bundles — spec09 L32 ; plan 66 step 8 ; origin: spec09
- [I-SU-07] SQLite-zip export/import decision — spec09 L32 ; plan 66 step 9 ; origin: spec09

### Rule editor shell

- [I-RE-01] Remove leftover Program panel — spec09 L28 ; plan 67 step 17 ; origin: spec09
- [I-RE-02] Full-width rule-layer row, chevron on the right — spec09 L28 ; plan 67 step 17 ; origin: spec09
- [I-RE-03] Reduce lines / retire 90s look — spec09 L28 ; origin: spec09
- [I-RE-04] Unify Layers/Tools/Properties/Preview under `DockableFrame` — spec09 L28 ; plan 66 step 10 ; plan 67 steps 18-21 ; origin: spec09
- [I-RE-05] Panel state (dock/float/minimize/hide) persisted per-workspace — plan 67 step 6 ; origin: plan
- [I-RE-06] Drag initiator on grip only, grab->grabbing cursor — plan 67 step 2 ; origin: plan
- [I-RE-07] Drop-zone overlay with token highlight and snap preview — plan 67 step 3 ; origin: plan
- [I-RE-08] Design Mode compile to SVG (`compileDesignShape`) — spec09 L28 ; plan 66 step 11 ; plan 67 step 24 ; origin: spec09
- [I-RE-09] Custom-shape SVG export + import buttons — spec09 L28 ; plan 66 step 12 ; plan 67 step 25 ; origin: spec09
- [I-RE-10] Image-mask primitive (raster or SVG ROI mask) — spec09 L28 ; plan 66 step 13 ; plan 67 step 26 ; origin: spec09
- [I-RE-11] Preview panel minimize/maximize + screenshot capture — spec09 L28 ; plan 67 step 21 ; origin: spec09
- [I-RE-12] Snap-settle spring animation with `prefers-reduced-motion` — plan 67 step 4 ; origin: plan

### Rule authoring flow

- [I-RA-01] New Rule / Category Rule / Task Rule chooser — spec09 L28 ; plan 67 step 22 ; origin: spec09
- [I-RA-02] Default name sequence "Rule Set 01/02" — spec09 L30 ; plan 67 step 22 ; origin: spec09
- [I-RA-03] Clone existing ruleset (reference vs copy mode) — spec09 L32 ; plan 67 step 23 ; origin: spec09
- [I-RA-04] Cloned ruleset shows source badge — plan 67 step 23 ; origin: plan
- [I-RA-05] Load image into ruleset; per-rule uploaded image — spec09 L28 ; origin: spec09
- [I-RA-06] Validate-Against-Image dialog with thumbnail strip + last-result badge — spec09 L28 ; plan 67 step 43 ; origin: spec09
- [I-RA-07] Rule conditions model + validation order (sequential short-circuit) — plan 42 (done) ; origin: plan

### Rule primitives

- [I-RP-01] Rectangular ROI (Presence/Absence, existing) — spec09 L28 ; origin: spec09
- [I-RP-02] Circular ROI form (radius + center) — plan 67 step 27 ; origin: plan
- [I-RP-03] SameImage primitive parameters — origin: plan
- [I-RP-04] OCR primitive (text-region + validate happy path) — spec09 L28 ; plan 67 step 28 ; origin: spec09
- [I-RP-05] Color / Mat primitive with color-space + tolerance + eyedropper — spec09 L28 ; plan 66 step 19 ; plan 67 step 35 ; origin: spec09
- [I-RP-06] Flaw Detection primitive — spec09 L28 ; plan 66 step 14 ; plan 67 step 29 ; origin: spec09
- [I-RP-07] Barcode / QR primitive with decoded-text field — spec09 L28 ; plan 66 step 15 ; plan 67 step 30 ; origin: spec09
- [I-RP-08] Blob Detection primitive — spec09 L28 ; plan 66 step 16 ; plan 67 step 31 ; origin: spec09
- [I-RP-09] Edge Width primitive (LineTool) — spec09 L28 ; plan 66 step 17 ; plan 67 step 32 ; origin: spec09
- [I-RP-10] Edge Pitch primitive (LineTool) — spec09 L28 ; plan 66 step 17 ; plan 67 step 33 ; origin: spec09
- [I-RP-11] Positional Adjustment primitive — spec09 L28 ; plan 66 step 18 ; plan 67 step 34 ; origin: spec09
- [I-RP-12] Live preview badge / debounced verdict — user request ; origin: plan

### JS functions + chain events

- [I-FS-01] `/setup/functions` route: list + Monaco edit + JSON import/export — spec09 L28 ; plan 66 step 20 ; plan 67 step 36 ; origin: spec09
- [I-FS-02] Chain events inspector: upstream rule -> function -> downstream rule — spec09 L28 ; plan 66 step 21 ; plan 67 step 37 ; origin: spec09
- [I-FS-03] Barcode decoded text feeds chain-event downstream — spec09 L28 ; origin: spec09

### Projects

- [I-PR-01] Project create flow works end-to-end — spec09 L26 ; plan 66 step 22 ; plan 67 step 38 ; origin: spec09
- [I-PR-02] Project detail: camera settings + rules + category rules — spec09 L26 ; origin: spec09
- [I-PR-03] AI settings placeholder card — spec09 L26 ; plan 66 step 23 ; plan 67 step 39 ; origin: spec09
- [I-PR-04] Category creation section — spec09 L26 ; origin: spec09
- [I-PR-05] Category auto-apply resolver — spec09 L26 ; plan 66 step 24 ; plan 67 step 40 ; origin: spec09
- [I-PR-06] Multi rule-set selection on project detail with override preview — spec09 L26 ; plan 67 step 41 ; origin: spec09
- [I-PR-07] Project export/import as zip — spec09 L26 ; origin: spec09
- [I-PR-08] Recent projects dropdown on Home — spec09 L26 ; origin: spec09

### Run

- [I-RN-01] Run picker: multi rule-set select — spec09 L26 ; plan 66 step 25 ; plan 67 step 42 ; origin: spec09
- [I-RN-02] Override-chain preview in Run picker — spec09 L26 ; plan 66 step 25 ; plan 67 step 42 ; origin: spec09
- [I-RN-03] Verification-image preview strip — spec09 L26 ; plan 66 step 25 ; plan 67 step 42 ; origin: spec09
- [I-RN-04] Inline edit-jump from Run picker to Rules editor — spec09 L26 ; plan 66 step 25 ; plan 67 step 42 ; origin: spec09
- [I-RN-05] Expected-image-count field — spec09 L26 ; plan 66 step 25 ; plan 67 step 42 ; origin: spec09
- [I-RN-06] `RulesetPicker` component — plan 67 step 41 ; origin: plan

### Cross-cutting

- [I-CX-01] Color-token sweep + ESLint gate on hardcoded colors — plan 66 step 26 ; plan 67 step 44 ; origin: plan
- [I-CX-02] Error registry + `reportError` toast bus — plan 66 step 27 ; plan 67 step 45 ; origin: plan
- [I-CX-03] CI entrypoint `bun run ci` — plan 66 step 29 ; plan 67 step 48 ; origin: plan
- [I-CX-04] Playwright visual-regression baselines — plan 66 step 28 ; plan 67 step 46 ; origin: plan
- [I-CX-05] Accessibility pass (axe 0 serious/critical) — plan 67 step 47 ; origin: plan
- [I-CX-06] Reason codes as constant object + lint gate — plan 42 (done, v3.433.0) ; origin: plan
- [I-CX-07] Worker health status as dismissible floating toast — user request (2026-07-17, v3.430.0) ; origin: plan

### Backend / persistence (V2 mentioned, mostly deferred)

- [I-BE-01] SQLite persistence for rulesets/rules/images — spec09 L28,L30 ; origin: spec09
- [I-BE-02] Mermaid DB diagrams under `spec/23-app-db/` — spec09 L30 ; origin: spec09
- [I-BE-03] Data folder layout `data/<ruleset>/<ruleId>/{image, rules.json}` — spec09 L28 ; origin: spec09
- [I-BE-04] Python endpoint mapping table for OCR/worker — spec09 L28 ; origin: spec09
- [I-BE-05] SDK facade pattern for storage swap — user request (v3.418.0) ; origin: plan

### Meta

- [I-MT-01] Reference images stored in assets folder with proper names — spec09 L15,L20 ; origin: spec09
- [I-MT-02] Ambiguity questions filed under `.lovable/ambiguity-questions/` — spec09 L28 ; origin: spec09

Total: 71 unique items. Handed to SS-02.
