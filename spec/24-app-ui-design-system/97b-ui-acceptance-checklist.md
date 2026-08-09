# App UI — Acceptance Checklist (source-of-truth to-do list)

**Version:** 1.0
**Owner:** spec 24 (App UI Design System)
**Companion to:** `97-acceptance-criteria.md` (this is the executable to-do form of those gates).
**Domain source of truth:** `spec/21-app/` (initial instructions, screens, shape model, rule catalog, tolerances, zoom/pan, JSON instruction output, error/logging).
**Editor shell source of truth:** `spec/24-app-ui-design-system/` (tokens, layout, canvas, rail, controller, state, errors, testing).

---

## 0. Rules for using this file

- Every item is a checkbox with a stable ID. Never renumber. When an item is superseded, cross it out, keep the ID, and add a "Superseded by <new ID>" note.
- Every item cites the exact spec line(s) it enforces.
- Failing any P0 item = the UI is not spec-consistent. Do not ship.
- P1 items block the corresponding screen; P2 items are polish/hardening.
- **No UI code lands before every P0 item in §1 (contradiction resolution) is checked.**

Status markers: `[ ]` open, `[~]` in progress, `[x]` done, `[!]` blocked, `[-]` won't do (with justification).

---

## 0b. Plan 64 landed steps (as of v3.277.0)

Plan 64 (`.lovable/plans/pending/64-plan24-ui-v2-recipes-rules-and-desktop-overhaul.md`) has landed the following steps in code. Individual gates in §1-§8 below are still the authoritative ticks; this section is a quick locator so reviewers can find where each step lives.

- Steps 59, 60, 61, 63, 64 (v3.274-v3.276): editor top-bar cleanup, layer-row chevron, palette dock controls, Reset Layout mounted.
- Steps 72, 75-79, 82, 85, 86-88 (v3.274-v3.276): New Project dialog captures camera/rule sets/categories; project tabs render real rows; Run confirm dialog; save-rule server fn; JSON / YAML / Zip export + Import round-trip.
- Steps 89, 90 (v3.275): User Functions palette shell + Tool palette with 5 active + 5 placeholder rule kinds.
- Step 81 (v3.273-v3.277): Recent Projects chip on Home; v3.277 fixed the infinite render loop by memoizing the slice selector.
- Steps 58, 96, 97 (v3.277): top-nav hover no-shift Playwright, global `:focus-visible` fallback, plan64 happy-path Playwright scaffolding.
- Step 95 (v3.276): density audit noted; no CSS token change required after Program-slot removal.
- Step 99: remains open; move plan to `done/` after §1-§8 gates below are ticked.

---

## 1. Contradiction resolution (P0, blocks UI build)

These are hard cross-spec conflicts. Each must be resolved with a written decision recorded in `_notes/` before any component is built.

- **DEC-01** `[ ]` **Screen model source of truth.** spec/21 §30-39 defines routes `/setup/:taskId`, `/run/:taskId`, `/results/:runSessionId`, `/settings`, `/ai-review/:runSessionId`, `/errors`; spec/24 §02 defines `/setup`, `/setup/roi`, `/setup/reference`. Decision to record: **spec/21 routes are the app; spec/24 is the editor shell that renders under `/setup/:taskId`**. Any spec/24 route without a `:taskId` becomes a redirect to the default task. Record in `_notes/screen-model-decision.md`. (`spec/21-app/30-ui-overview.md:48-65`, `spec/24-app-ui-design-system/02-layout.md:15-93`)
- **DEC-02** `[ ]` **Rule catalog reconciliation.** spec/21 §33 locks 6 kinds (`PresenceAbsence`, `FlawDetect`, `Count`, `OcrText`, `GraphicDisplayCheck`, `MathExpression`); spec/24 §01/§05 lists 10 (`Presence`, `Absence`, `OCR`, `TextMatch`, `Number`, `Math`, `Color`, `Pattern`, `Edge`, `Blob`). Decision to record: spec/21's 6 kinds are canonical for v1. Map spec/24 UI labels: `Presence` + `Absence` → `PresenceAbsence` (`Mode` toggle in controller); `OCR` → `OcrText`; `Pattern` → `GraphicDisplayCheck`; `Math` → `MathExpression`; `Blob` → `FlawDetect`. Kinds `TextMatch`, `Number`, `Color`, `Edge` are **out of v1 UI** and must not appear in the ribbon or controller. Record mapping table in `_notes/rule-kind-mapping.md`. (`spec/21-app/33-rule-catalog.md:12-132`, `spec/24-app-ui-design-system/05-rule-controller.md:34-49`)
- **DEC-03** `[ ]` **Zoom model.** spec/21 §35 requires discrete steps `5,10,25,40,50,75,100,150,200,300,400,600,800` (%) clamped 5-800%; spec/24 §03 says continuous 0.25×-8× with 1.1×/notch. Decision: **spec/21's discrete step set is canonical.** Wheel snaps to nearest step; keyboard `+/-` moves one step; `0`=Fit, `1`=100%. spec/24 §03 must be updated. (`spec/21-app/35-zoom-and-pan.md:16-34`, `spec/24-app-ui-design-system/03-canvas.md:20`)
- **DEC-04** `[ ]` **Persistence shape.** spec/21 §36 persists `tasks/<TaskId>/instructions/<InstructionId>.json` with `Regions[]` + `ToleranceProfiles[]` + `Rules[]` + `SourceHash`; spec/24 §06 persists `programs/<id>.json` v2 with a flat `rules[]`. Decision: **spec/21 shape is the on-disk truth**; spec/24's Zustand store is the in-memory editor state that serializes down to the spec/21 envelope on save (debounced 300ms). Record adapter contract in `_notes/persistence-adapter.md`. (`spec/21-app/36-json-instruction-output.md:13-125`, `spec/24-app-ui-design-system/06-state-persistence.md:91-101`)
- **DEC-05** `[ ]` **Region model in the editor.** spec/21 §32 has first-class `Region` with roles (`Search`/`Pattern`/`Mask`/`Measurement`/`Image`), parent/child (depth ≤ 2), XY-linked safe-zone bounds; spec/24 rail has a flat rule list with shape owned by rule. Decision: **regions remain first-class**; the Rule List rail groups rules under their bound Region (parent) with a two-level tree, not a flat list. Add a Regions layer above the Rule List in the right rail. (`spec/21-app/32-shape-model.md:21-141`, `spec/24-app-ui-design-system/04-rule-layers.md`)
- **DEC-06** `[ ]` **Log wire format.** spec/21 §41 uses JSON-object-per-line records; spec/24 §07 uses `key=value` flat lines. Decision: **JSON-per-line is canonical (spec/21 wins for the persisted log)**; spec/24's `key=value` remains only as the in-browser status-strip render, converted from the same JSON payload. Update spec/24 §07 accordingly. (`spec/21-app/41-logging.md`, `spec/24-app-ui-design-system/07-errors-logging.md`)
- **DEC-07** `[ ]` **Error code namespace.** spec/21 §40 App A already defines `E_UI_MODE_MISMATCH`, `E_UI_READONLY_VIOLATION`, `E_UI_COUNTER_DRIFT`, `E_UI_TAIL_STALLED`, `E_UI_ROUTE_DRIFT`, `E_UI_LAYOUT_REFLOW`, `E_UI_ZOOM_CLAMPED`. Every new `I_UI_*` / `W_UI_*` / `E_UI_*` code introduced by spec/24 must be added to that master registry with no duplicates. Audit and reconcile in `_notes/ui-log-code-reconciliation.md`. (`spec/21-app/40-error-manage.md` App A, `spec/24-app-ui-design-system/07-errors-logging.md:91-93`)
- **DEC-08** `[ ]` **Subtasks required-reading gate.** `SS-01..SS-05` (Rule Controller schema, canvas interaction, math grammar, migration plan, lighting controls) are referenced normative but not audited in this pass. Add "Read before coding" gate at the top of `00-overview.md` listing all five. (`.lovable/plans/subtasks/30-app-ui-rule-editor-revamp/`)

---

## 2. Screens gates (mirrors spec/21 §30-39)

### 2A. Home `/` (P1)

- **H-01** `[ ]` Left Job list column fixed 280 px; right Task table flex. (`30-ui-overview.md:48-65`)
- **H-02** `[ ]` New Job / New Task / Run / Setup / Results actions all resolvable from a single row.
- **H-03** `[ ]` Nav is locked with confirm dialog when any RunSession is `RUNNING`. (`30-ui-overview.md:21-31`)

### 2B. Rule Setup `/setup/:taskId` (P0)

- **RS-01** `[ ]` Regions Panel 280 px left, Canvas flex, Rule Builder 360 px right, Tool Ribbon 72 px, Action Bar 44 px. No panel resizes on zoom/pan. (`31-rule-setup-screen.md:11-27`, `35-zoom-and-pan.md:23-27`)
- **RS-02** `[ ]` Blocked (read-only banner + disabled save) while RunSession is `RUNNING`. (`31-rule-setup-screen.md:71-75`)
- **RS-03** `[ ]` Empty starting state — canvas shows reference image with no pre-drawn shapes. (`01-initial-instructions.md:167`)
- **RS-04** `[ ]` Draw rectangle / ellipse / polygon (3-64 pts, no self-intersection). Min sizes enforced: rect ≥4 px/axis, ellipse radii ≥2 px. (`32-shape-model.md:34-100`)
- **RS-05** `[ ]` Region roles selectable from the closed enum only (`Search`/`Pattern`/`Mask`/`Measurement`/`Image`); role-rule binding matrix enforced client-side before save. (`33-rule-catalog.md:115-126`)
- **RS-06** `[ ]` Rule Builder mounts iff `selection.length === 1` (single region OR single rule). (`spec/24 §05`, `05-rule-controller.md:16-24`)
- **RS-07** `[ ]` Rule kinds visible in ribbon = exactly the 6 from DEC-02; `Presence`/`Absence` share one entry with a `Mode` toggle.
- **RS-08** `[ ]` `MathExpression` grammar restricted to `+ - * / min max abs round` on `Rule.<id>.<key>` — parser must reject anything else with `E_RULE_MATH_UNSUPPORTED`. (`33-rule-catalog.md`, spec/21 math ref)
- **RS-09** `[ ]` Tolerance editor covers every kind (`MatchPercent`, `ScalarRange`, `XyBox`) with min/max/match-percentage where applicable — not fixed pins. (`34-tolerance-model.md`, `01-initial-instructions.md:165`)
- **RS-10** `[ ]` XY-linked safe-zone editor visible for child regions with `MinX/MaxX/MinY/MaxY/MatchPercentMin`. NG reason surfaces as `RuleOutsideSafeZone`. (`32-shape-model.md:114-141`)
- **RS-11** `[ ]` Show JSON opens the exact `36-json-instruction-output.md` v2 envelope for the current draft, canonicalized (sorted keys, ≤6-decimal floats, `\n`, UTF-8 no BOM). (`36-json-instruction-output.md:112-119`)
- **RS-12** `[ ]` Save writes to `tasks/<TaskId>/instructions/<InstructionId>.json` and emits `RuleAuthored` audit event. (`36-json-instruction-output.md:121-125`, `31-rule-setup-screen.md` acceptance)
- **RS-13** `[ ]` Reusable rule-set import: pick from another task's saved instruction and load its Regions+Rules+ToleranceProfiles under new IDs. (`01-initial-instructions.md:169`)
- **RS-14** `[ ]` Discard prompts before dropping unsaved changes (per `04-rule-layers.md` unsaved-change rule).

### 2C. Run Monitor `/run/:taskId` (P0)

- **RM-01** `[ ]` Regions: TitleBar 32 / ActionHeader 40 / Viewport + VerdictStrip 320 / BottomBar 44. No panel resize on any action. (`37-run-monitor-screen.md:11-30`)
- **RM-02** `[ ]` View locked to FIT; zoom/pan disabled during RUNNING. (`37-run-monitor-screen.md:59-66`, `35-zoom-and-pan.md:65-69`)
- **RM-03** `[ ]` STOP button is a large primary control; NG Jump advances to next NG frame. (`37-run-monitor-screen.md`)
- **RM-04** `[ ]` Counters (Total / Pass / Fail / Error / fps) render with `tabular-nums` and refresh at 500 ms. (`30-ui-overview.md:69`, spec/21 §97 gate)
- **RM-05** `[ ]` Never re-evaluates rules — renders only stored `Result` records. (`spec/21 §97 A-11`)
- **RM-06** `[ ]` Error banner mapped to tier-40 error codes only; lower tiers stay in the status strip. (`spec/21 §97 gate`)
- **RM-07** `[ ]` Nav locked with confirm dialog while RUNNING; unlocked only after STOP → `IDLE`. (`30-ui-overview.md:21-31`)

### 2D. Results `/results/:runSessionId` (P1)

- **R-01** `[ ]` Layout: TitleBar / FilterBar 40 / virtualized table + DetailPane 420 / BottomBar 44. (`38-results-screen.md:11-30`)
- **R-02** `[ ]` Filters use DB indexes only; no client-side full-scan. (`spec/21 §97 gate`)
- **R-03** `[ ]` Row click populates Detail Pane; double-click opens image viewer with same zoom/pan model (view-only). (`35-zoom-and-pan.md:65-69`)
- **R-04** `[ ]` Export CSV + Evidence bundle via `exportAuditBundle` — never re-runs rules. (`38-results-screen.md`, `spec/21 §97 gate`)
- **R-05** `[ ]` Pagination reads JSONL v2 `results-*.jsonl` in stable order. (`spec/21 §97 gate`)

### 2E. Settings `/settings` (P1)

- **SET-01** `[ ]` ScopeTree 260 px (`ROOT` / `TASK:*` / `RUNTIME:*`) + KeyEditor. (`39-settings-screen.md:11-59`)
- **SET-02** `[ ]` Only `RUNTIME:*` keys editable while any RunSession is `RUNNING`; others show a lock icon. (`39-settings-screen.md:11-59`)
- **SET-03** `[ ]` Field list matches the 27 config keys from `27-config-surface.md`; unknown keys render read-only "unknown key" row. (`spec/21 §97 gate`)
- **SET-04** `[ ]` Admin-gated keys hidden for non-admin (v1 note: single-operator install, still enforce the flag). (`39-settings-screen.md:82-95`)
- **SET-05** `[ ]` Save emits `SettingsChanged` audit event with before/after diff.
- **SET-06** `[ ]` Import/Export writes/reads the canonical config JSON.

### 2F. AI Review `/ai-review/:runSessionId` (P2)

- **AI-01** `[ ]` Renders the exact copy "Not available in this build." — no other component tree loads. (`30-ui-overview.md:16,19`)

### 2G. System Errors `/errors` (P1)

- **ERR-01** `[ ]` Always reachable, including while nav is locked elsewhere. (`30-ui-overview.md:17,24`)
- **ERR-02** `[ ]` Renders JSON-per-line entries from the persisted log (DEC-06). Filter by tier, code, correlation_id.

---

## 3. Design system gates (spec/24 §01-08)

- **F-01** `[ ]` Zero hardcoded hex in components. All colors via `--ca-*` / `--canvas-bg` / `--overlay-line` / `--rule-*` / `--font-*` tokens. (`01-foundations.md`)
- **F-02** `[ ]` Fonts: `--font-display` (Ubuntu) headings, `--font-hmi` (Poppins) body, `--font-hmi-mono` numerics.
- **F-03** `[ ]` Motion: 200 ms panel, 150 ms shape; `prefers-reduced-motion` collapses to 1 ms.
- **L-01** `[ ]` Grid `56px 40px 1fr 28px` × `1fr 360px`. TopBar 56 / TabStrip 40 / Workspace flex / StatusStrip 28. (`02-layout.md:15-93`)
- **L-02** `[ ]` Right rail collapses to 40 px icon strip below 1200 px; below 800 px shows "Unsupported viewport" screen.
- **L-03** `[ ]` Keyboard focus order: TopBar → TabStrip → ToolRibbon → Workspace → RuleList → RuleController → LightingDrawer trigger → StatusStrip. Escape returns focus to Workspace.
- **C-01..C-10** `[ ]` Canvas gates from `97-acceptance-criteria.md` §C, updated for DEC-03 zoom steps.
- **R-01..R-10** `[ ]` Rule rail gates from §R, updated for DEC-05 two-level (Region → Rule) grouping.
- **K-01..K-10** `[ ]` Controller gates from §K, updated for DEC-02 six-kind catalog and DEC-05 region roles.
- **S-01..S-10** `[ ]` State/persistence gates from §S, updated for DEC-04 (in-memory Zustand → on-disk `36-json-instruction-output.md` envelope adapter).
- **E-01..E-10** `[ ]` Error/logging gates from §E, updated for DEC-06 wire format and DEC-07 code reconciliation.
- **T-01..T-N** `[ ]` Testing gates from §T: Vitest unit, Playwright per screen, Axe zero color-contrast on `/setup*`, keyboard-only pass, perf p95 ≤ 16 ms with 200 shapes, visual snapshots.

---

## 4. Accessibility gates (P0)

- **A11Y-01** `[ ]` WCAG 2.1 AA text contrast ≥ 4.5:1; overlay stroke ≥ 3:1. Verify with Axe in CI. (`spec/24 §01 foundations`)
- **A11Y-02** `[ ]` Focus-visible ring 2 px + 2 px offset on every interactive element, in tokens.
- **A11Y-03** `[ ]` Every screen fully operable keyboard-only. Playwright keyboard-only suite is green.
- **A11Y-04** `[ ]` `aria-live="polite"` on polygon vertex counter and Run Monitor counters.
- **A11Y-05** `[ ]` Rule List uses `role="listbox"` + `role="option"`; multi-select follows ARIA APG listbox pattern.

---

## 5. Performance gates (P1)

- **PERF-01** `[ ]` Canvas p95 frame time ≤ 16 ms during drag with 200 shapes. (`spec/24 §03 T-3`)
- **PERF-02** `[ ]` No layout reflow on zoom/pan (`E_UI_LAYOUT_REFLOW` never fires in the perf suite). (`35-zoom-and-pan.md:23-27`)
- **PERF-03** `[ ]` Save debounce 300 ms; store writes coalesce within one gesture into one undo entry.
- **PERF-04** `[ ]` Run Monitor counters refresh at 500 ms without dropping frames.

---

## 6. Observability gates (P1)

- **OBS-01** `[ ]` Every user gesture that mutates state emits exactly one `I_UI_*` log entry with a `correlation_id`. (`spec/24 §07`)
- **OBS-02** `[ ]` Rate cap: ≤ 5 log lines/sec per `correlation_id`. Excess drops with a single `W_UI_LOG_RATE_CAPPED` entry. (`spec/24 §07`)
- **OBS-03** `[ ]` `E_UI_*` boundary errors caught at route level render an error page with the code visible and never a blank screen. (`spec/24 §07`)
- **OBS-04** `[ ]` StatusStrip surfaces the last N=10 log lines with tier color.

---

## 7. Read-before-code list (append to `00-overview.md`)

Every session that touches UI code must read these first. Missing this = P0 failure.

- `spec/21-app/01-initial-instructions.md` (system intent)
- `spec/21-app/30-ui-overview.md` through `39-settings-screen.md` (screens)
- `spec/21-app/32-shape-model.md`, `33-rule-catalog.md`, `34-tolerance-model.md`, `35-zoom-and-pan.md`, `36-json-instruction-output.md`
- `spec/21-app/40-error-manage.md` (App A code registry)
- `spec/21-app/41-logging.md` (wire format)
- `spec/24-app-ui-design-system/00-overview.md` through `08-testing.md`
- `spec/24-app-ui-design-system/97-acceptance-criteria.md` and this file
- `.lovable/plans/subtasks/30-app-ui-rule-editor-revamp/SS-01..SS-05` (all five)

---

## 8. Definition of done

The UI is spec-consistent (shippable) only when:

1. Every P0 item in §1 has a recorded decision note under `_notes/`.
2. Every P0/P1 item in §2-6 is `[x]` with evidence (Playwright run id, screenshot, log excerpt, or file:line).
3. `99-consistency-report.md` shows zero unresolved contradictions with spec/21.
4. `98-changelog.md` records the version that closes this checklist.
5. A blind-AI audit (spec/25) can re-execute this checklist and reproduce every `[x]`.

---

## 9. Open TODOs (rolled up from §1-6, prioritized)

1. `[ ]` DEC-01..DEC-08 decision notes under `spec/24-app-ui-design-system/_notes/`.
2. `[ ]` Update spec/24 §03 zoom range and §07 log wire format to reflect DEC-03 and DEC-06.
3. `[ ]` Extend spec/24 rail (§04) to two-level Region → Rule tree per DEC-05.
4. `[ ]` Restrict spec/24 controller (§05) rule-kind picker to the 6 spec/21 kinds per DEC-02.
5. `[ ]` Write the Zustand ↔ `36-json-instruction-output.md` adapter contract per DEC-04.
6. `[ ]` Reconcile every new `I_UI_*/W_UI_*/E_UI_*` code with `spec/21-app/40-error-manage.md` App A per DEC-07.
7. `[ ]` Add "Read before coding" gate at the top of `00-overview.md` per DEC-08 (list from §7 above).
8. `[ ]` Fill in real spec sections for `/` (Home) and `/errors` or sign them off as inline-only.
9. `[ ]` Confirm AI Review `/ai-review/:runSessionId` renders only the stub copy — no lazy-loaded editor tree.
10. `[ ]` Decide whether Run Monitor / Settings needs an explicit "worker pool size" and "fps target" surface per `01-initial-instructions.md` (§10 gap).

---

**Do not start writing UI components until §1 is fully checked.** Every downstream row in §2-6 assumes those decisions are locked.

---

## 10. Plan 64 (UI v2) checklist rows

Added 2026-07-16 as part of Plan 64 spec authoring closeout. Every row cites the spec it enforces. These rows must all be checked before the corresponding UI code in Section C of Plan 64 ships.

### 10A. Navigation shell (P0)

- **P64-NAV-01** `[ ]` Compact header has a single row, no duplicated "Control Automation" label, breadcrumb + Back/Forward + running-pill slot render inside the header height token. (`10-navigation-shell.md`, `38-header-breadcrumb.md`, `39-back-forward.md`)
- **P64-NAV-02** `[ ]` Every route defines a `crumb` object or exits with `BreadcrumbLabelMissing` in dev. (`38-header-breadcrumb.md`)
- **P64-NAV-03** `[ ]` `Alt+Left` / `Alt+Right` fire history.back / .forward exactly once per press outside text inputs. (`39-back-forward.md`)

### 10B. Menu anti-jitter (P0)

- **P64-MNU-01** `[ ]` No `.menu-item` hover style changes any forbidden property in `40-menu-anti-jitter.md`. Verified by `linter-scripts/check-forbidden-strings.py`.
- **P64-MNU-02** `[ ]` Playwright hover-CLS assertion < 0.01 for top-nav.

### 10C. Running Pill (P0)

- **P64-PIL-01** `[ ]` Pill lives in one of four corner enum values; `saveRunningPillCorner` persists per user; reload restores. (`11-running-process-pill.md`, `42-drag-drop-running-pill.md`)
- **P64-PIL-02** `[ ]` SSE stream driving pill state has a `getOpStatus` polling fallback documented in `25-run-flow.md`.
- **P64-PIL-03** `[ ]` Focus + arrow keys move pill between corners; `aria-live` announces the new corner.

### 10D. Rules editor (P0)

- **P64-RED-01** `[ ]` Photoshop palettes: Tools, Layers, Preview. Dock persistence per `41-panel-docking-model.md`. Reset Layout restores defaults.
- **P64-RED-02** `[ ]` Toolbar contains every rule kind from `13-rule-kinds-catalogue.md` with the shortcuts in `43-rule-editor-toolbar.md`.
- **P64-RED-03** `[ ]` PositionalAdjust may only be added inside a Group at sequence 0; violation shows the tooltip from `31-positional-adjust.md`.
- **P64-RED-04** `[ ]` Validate button honours the flow in `26-validate-single-image.md`, disabled while the rule is dirty.

### 10E. Domain rename Recipe -> Rule Set (P0)

- **P64-DOM-01** `[ ]` No user-facing string in the app reads "Recipe". Enforced by grep gate in `99-consistency-report.md` §11.
- **P64-DOM-02** `[ ]` Storage columns and API function names use `RuleSet` / `Rule`. (`spec/23-app-db/01-root-db-schema.md` §4, `20-backend-endpoint-map.md`.)

### 10F. Export / Import (P1)

- **P64-EXP-01** `[ ]` JSON export validates against `schemas/rule-set-v1.json` and carries a matching `checksumSha256`. (`32-export-json-schema.md`)
- **P64-EXP-02** `[ ]` YAML export parses back to the same canonical JSON payload; anchors rejected. (`33-export-yaml-schema.md`)
- **P64-EXP-03** `[ ]` `.capz` bundle carries `manifest.entries` with per-file sha256; tamper -> `IntegrityError` on import. (`34-project-zip-layout.md`)
- **P64-EXP-04** `[ ]` `applyImport` is transactional and writes one audit line per changed row. (`35-import-flow.md`)

### 10G. Shapes and masks (P1)

- **P64-SHP-01** `[ ]` Shape SVG on disk uses absolute path commands, 3-decimal precision, no transforms, per `36-shape-svg-asset.md`.
- **P64-SHP-02** `[ ]` Raster mask import produces a Shape that round-trips via `32-` and re-renders pixel-identical. (`37-mask-from-image.md`)

### 10H. Project section (P1)

- **P64-PRJ-01** `[ ]` Project section create flow (issue 16) rebuilt per `16-project-lifecycle.md`; no broken UI states in Playwright happy path.
- **P64-PRJ-02** `[ ]` Recent Projects chip renders on Home per `23-recent-projects-home.md` with keyboard support.
- **P64-PRJ-03** `[ ]` Override chain table matches the resolver in `22-override-modes.md`.

Verification of §10 completion: every P0 row must be checked and every P1 row must be checked or explicitly `[-]` deferred with a linked follow-up plan before Plan 64 moves to `done/`.
