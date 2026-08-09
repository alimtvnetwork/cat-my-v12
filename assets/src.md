# CAT MY UI v1 — Design Learnings from `assets/tools-images/`

Synthesis of the 50 reference photos (49 JPGs + 1 externalized `.asset.json`, captured 2026-06-29 17:25–17:32) of a **legacy machine-vision inspection HMI** running program `an inspection program` on an an industrial monitor. Domain: 2D visual inspection of QFN semiconductor packages.

Full evidence: `.lovable/plans/done/01-learn-tools-images.md` and `SS-01..SS-13`.

---

## 1. Image clusters (SS-03)

| Cluster            | Count | Time        | Content                                     |
| ------------------ | ----- | ----------- | ------------------------------------------- |
| A — Overview       | 32    | 17:25–17:28 | Full HMI framings                           |
| B — Detail         | 11    | 17:28–17:30 | Panel/dialog close-ups                      |
| C — Second subject | 7     | 17:31–17:32 | Includes externalized `20260629_173118.jpg` |

## 2. Screen archetypes (SS-08)

A. Tool Setting workspace · B. Settings dialogs (Camera / Trigger / Lighting) · C. ROI editor · D. Reference-image registration · E. Error list · F. Run screen · G. Boot · H. Excluded labels.

Route map: `/`, `/setup`, `/settings/{camera,trigger,lighting}`, `/setup/roi`, `/setup/reference`, `/run`, `/errors`.

## 3. Flow (SS-09)

`Boot → /setup` → pick tool from ribbon → configure in right panel → open ROI/Reference editor as modal loop → return to config → **Run** (global blue primary) → live viewport; NG event → `/errors` → resolve → back to Run. Navigation locked while running.

---

## 4. Design details

### 4.1 Color tokens (SS-04, SS-12) — `--hmi-*` namespace

**Chrome (window frames, title bar)**
| Token | Hex | Use |
|---|---|---|
| `--hmi-chrome-900` | `#2b2b2b` | Deep bezel / titlebar text on light |
| `--hmi-chrome-800` | `#3a3a3a` | |
| `--hmi-chrome-700` | `#4a4a4a` | App title bar background |
| `--hmi-chrome-600` | `#6b6b6b` | Muted chrome |

**Panels (tool config, side rails)**
| Token | Hex | Use |
|---|---|---|
| `--hmi-panel-100` | `#f2f2f2` | Lightest surface |
| `--hmi-panel-200` | `#e6e6e6` | |
| `--hmi-panel-300` | `#d4d4d4` | Default panel bg |
| `--hmi-panel-400` | `#b8b8b8` | Panel borders (hairline 1px) |

**Viewport (camera canvas)**
| Token | Hex |
|---|---|
| `--hmi-viewport-bg` | `#1a1a1a` |
| `--hmi-viewport-grid` | `#2a2a2a` |

**Functional accents**
| Token | Hex | Use |
|---|---|---|
| `--hmi-accent-primary` | `#1e78c8` | **Run** / primary action |
| `--hmi-accent-primary-hover` | `#2a8ad8` | Hover state |
| `--hmi-accent-select` | `#f5c800` | Selected tool tile / anchor |
| `--hmi-accent-select-strong` | `#f39c00` | Active tab underline |

**Status**
| Token | Hex |
|---|---|
| `--hmi-status-ok` | `#2ea043` (green) |
| `--hmi-status-ng` | `#d13438` (red) |
| `--hmi-status-warn` | `#e8a317` |
| `--hmi-status-info` | `#1e78c8` |

**ROI overlays (drawn on viewport)**
| Token | Hex | Stroke |
|---|---|---|
| `--hmi-roi-search` | `#f5c800` | Dashed |
| `--hmi-roi-model` | `#2ea043` | Solid |
| `--hmi-roi-mask` | `#d13438` | Hatched |
| (anchor) | `#f5c800` | Crosshair |

**Text**
| Token | Hex |
|---|---|
| `--hmi-text-on-chrome` | `#f2f2f2` |
| `--hmi-text-on-panel` | `#1a1a1a` |
| `--hmi-text-muted` | `#6b6b6b` |

### 4.2 Typography (SS-05, SS-12)

- **Family:** `system-ui, "Segoe UI", Inter, Arial, sans-serif`. Never serif.
- **Tabular numerics** (counters, log timestamps): same family with `font-variant-numeric: tabular-nums`. No separate mono needed.
- **Casing:** UPPER reserved for the app title banner only; everything else Title/Sentence.
- **Weights in use:** 400 (body/menu), 600–700 (headers, dialog titles, counters). No thin/light.

| Role                       | Size    | Weight           | Notes                              |
| -------------------------- | ------- | ---------------- | ---------------------------------- |
| App title bar              | 13–14px | 700              | UPPER, white on `--hmi-chrome-700` |
| Menu bar (File/Edit/View)  | 12px    | 400              | Title case                         |
| Panel headers              | 13–14px | 700              | Title case on `--hmi-panel-300`    |
| Big counters (Total/OK/NG) | 20–56px | 700              | Tabular, right-aligned             |
| Dialog title               | 14px    | 700              |                                    |
| Dialog body / help         | 11–12px | 400              | Muted `#4a4a4a` on `#d4d4d4`       |
| Tab label                  | 12px    | 400 / 700 active | Active tab uses orange underline   |
| Status/log line            | 11px    | 400              | Tabular, fixed line-height         |

### 4.3 Spacing & layout grid (SS-08)

4px base grid. Fixed heights:
| Region | Height |
|---|---|
| Titlebar | 32px |
| Action header | 40px |
| Tool ribbon | 72px |
| Bottom action bar | 44px |

Spacing scale: `4 · 8 · 12 · 16 · 24 · 32`. Radii: `0 · 2 · 4px` (panels are near-square). Borders: hairline 1px, strong 2px.

### 4.4 Elevation / focus (SS-07)

- **No** drop shadows. **No** gradients. **No** glassmorphism.
- Focus = 2px inner ring in `--hmi-accent-primary`.
- State expressed by **background color**, never by icon swap or shadow.

### 4.5 Iconography (SS-07)

Two tiers:

1. **Tool tiles** — 48–64px, semi-3D isometric pictograms, 2–3 colors, descriptive (not abstract). Selected state = orange tile background.
2. **Chrome glyphs** — 16px flat monochrome line icons for menu bar / toolbar chrome.

### 4.6 Component inventory (SS-06)

App titlebar · Mode/action header · Tool ribbon · Image viewport w/ ROI overlay layer · Tool config panel · Modal dialog + data tables · Bottom action bar · Status log · Numeric counters.

**State vocabulary:** Selected (orange), Primary action (blue), Error (red), Pass (green).

---

## 5. Domain model (SS-10)

**Entities:** Program · Camera · Trigger · Lighting · ReferenceImage · Tool · ROI · Model · Judgment · Measurement · Result · Run · Error · User.
**Verbs:** Capture, Register, Teach, Test.
**Units:** px default, mm when calibration present, score 0–100.
**Statuses:** OK/NG, Idle/Running.

## 6. Scope & risks (SS-10, SS-11)

- **MVP in:** Setup workspace, ROI editor, reference registration, camera/trigger/lighting dialogs, Run screen w/ live viewport + counters, Error list.
- **MVP out:** hardware bridge, multi-camera, recipe versioning, user auth.
- **Risks:** no browser → industrial-camera path (UI-only clone); realtime perf discipline; scope creep; IP — label as a **study**, never as a vendor product.

## 7. Build-phase gates (mem://constraint/build-gates)

1. User confirms exact hues + type stack.
2. Merge `--hmi-*` tokens into `src/styles.css` `@theme` (convert hex → oklch); leave shadcn tokens as app-wide defaults.
3. First surface: Tool Ribbon + Image Viewport + Config Panel triad — every other archetype reuses these primitives.
4. Enable Lovable Cloud only when persistence/auth is actually requested.

## 8. Evidence trail

- Raw images: `assets/tools-images/` (one externalized `.asset.json`, resolved at `/tmp/img-analysis/20260629_173118.jpg`).
- Subtasks: `.lovable/plans/subtasks/01-learn-tools-images/SS-01..SS-13`.
- Archived plan: `.lovable/plans/done/01-learn-tools-images.md`.
- Memory: `mem://design/hmi-brief`, `mem://design/hmi-tokens`, `mem://reference/learn-tools-images`, `mem://constraint/build-gates`.
