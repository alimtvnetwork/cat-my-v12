# SS-13 — Final Design Brief: CAT MY UI v1

Single-page synthesis of SS-01..SS-12. Read this first; drill into the
subtask files only when you need the raw evidence.

## 1. What we're cloning

A machine-vision inspection HMI in the Keyence CV-X family, running the
program **"SUPERTHIN QFN 5X5_REV1"** on an HP ProDisplay P17A. Evidence:
50 photographs of the operator screen taken 2026-06-29 between 17:25 and
17:32 local (SS-01, SS-03). Domain: 2D visual inspection of QFN
semiconductor packages — teach a model, define ROIs, run production,
review OK/NG results (SS-10).

## 2. Scope (MVP)

In: Setup workspace (tool ribbon + config panel + viewport), ROI editor,
reference-image registration, camera/trigger/lighting settings dialogs,
Run screen with live viewport + counters, Error list. Out of MVP:
hardware bridge, multi-camera, recipe versioning, user auth (SS-10 §5,
SS-11 §D).

## 3. Screen archetypes (SS-08)

A Tool Setting · B Settings Dialogs · C ROI Editor · D Reference
Registration · E Error List · F Run · G Boot · H Excluded (labels).

Route map: `/`, `/setup`, `/settings/{camera,trigger,lighting}`,
`/setup/roi`, `/setup/reference`, `/run`, `/errors`.

## 4. Flow (SS-09)

`Boot → /setup` → pick tool from ribbon → configure in right panel →
(optional) open ROI/Reference editor as modal loop, return to config →
`Run` (blue primary, global) → live viewport; NG event → `/errors`
overlay/route → resolve → back to Run. Nav is locked while running.

## 5. Layout tokens (SS-08)

4px base grid. Titlebar 32 · Action header 40 · Tool ribbon 72 ·
Bottom action bar 44. Dense, near-square panels, hairline borders, no
shadows.

## 6. Visual language

- **Palette** (SS-04, SS-12): chrome greys `#2b–#6b`, panel greys
  `#d4–#f2`, viewport near-black `#1a1a1a`, primary blue `#1e78c8`
  (Run), select yellow `#f5c800`, status green `#2ea043` / red
  `#d13438`. ROI overlays: yellow-dashed (search), green-solid
  (model), red-hatched (mask).
- **Typography** (SS-05, SS-12): `system-ui, "Segoe UI", Inter` at
  12–14px body, 20px counters with `tabular-nums`. No serif.
- **Iconography** (SS-07): two tiers — 48–64px semi-3D tool tiles
  (state = tile background, never icon swap) and 16px flat monochrome
  chrome glyphs. No drop shadows, no gradients.

## 7. Component inventory (SS-06)

App titlebar · Mode/action header · Tool ribbon · Image viewport with
ROI overlay layer · Tool config panel · Modal dialog + data tables ·
Bottom action bar · Status log · Counters. State vocabulary: Selected
(orange), Primary action (blue), Error (red), Pass (green).

## 8. Domain model (SS-10)

Entities: Program · Camera · Trigger · Lighting · ReferenceImage ·
Tool · ROI · Model · Judgment · Measurement · Result · Run · Error ·
User. Units: px default, mm when calibration present, score 0–100.

## 9. Open questions carried into build (SS-11)

Gating: exact hues, exact type stack. Non-gating (defaults locked):
tool taxonomy, reference cardinality (array + primary), role model
(two-role toggle, no auth in MVP), units (px), persistence
(localStorage until Cloud enabled), image storage (compress to WebP
≤2MB). Risks: R1 no browser→industrial-camera path (UI-only clone),
R2 realtime perf discipline, R3 scope creep, R4 IP — label the app as
a study, not a Keyence product.

## 10. Design tokens (SS-12)

`--hmi-*` namespace defined but NOT yet wired into `src/styles.css`
`@theme`. Build phase merges tokens (hex → oklch) and adds them via
`@theme inline` per the Tailwind v4 authoring rules; shadcn tokens
stay untouched as the app-wide default.

## 11. Build-phase entry criteria (post-SS-15)

1. User confirms gating items in §9.
2. Wire `--hmi-*` tokens into `src/styles.css` under `@theme` (convert
   hex → oklch).
3. Scaffold routes per §3, with `/setup` as first surface.
4. Build the Tool Ribbon + Image Viewport + Config Panel triad; every
   other archetype reuses these primitives.
5. Enable Lovable Cloud only when persistence or auth is actually
   requested by the user.

## 12. Evidence trail

`.lovable/plans/subtasks/01-learn-tools-images/ss-01-inventory.md` …
`ss-12-tokens.md`. Raw images: `assets/tools-images/` (one asset
externalized as `.asset.json`, resolved copy at
`/tmp/img-analysis/20260629_173118.jpg` per SS-02).
