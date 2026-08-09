# App UI — Design System — Changelog

**Version:** 1.2  
**Updated:** 2026-07-14

Format follows Keep a Changelog. Versioning tracks the enclosing project's minor bumps that touch spec 24.

---

## [1.16.0] - 2026-07-14 - UI acceptance checklist grounded in spec/21 (project v3.54.0)

### Added

- `97b-ui-acceptance-checklist.md` — executable to-do form of the acceptance gates, grounded in a full read of `spec/21-app/01-initial-instructions.md` and every §30-41 file. Every checkbox cites the spec line(s) it enforces.
- §1 Contradiction resolution DEC-01..DEC-08 records the eight cross-spec conflicts that must be decided before any UI code:
  - DEC-01 Screen model: spec/21 routes are the app; spec/24 is the editor shell under `/setup/:taskId`.
  - DEC-02 Rule catalog: spec/21's 6 kinds are canonical; map spec/24 UI labels (`Presence`+`Absence` → `PresenceAbsence`, `OCR` → `OcrText`, `Pattern` → `GraphicDisplayCheck`, `Math` → `MathExpression`, `Blob` → `FlawDetect`); drop `TextMatch`/`Number`/`Color`/`Edge` from v1 UI.
  - DEC-03 Zoom: spec/21's discrete step set `5,10,25,40,50,75,100,150,200,300,400,600,800` (%) wins; spec/24 §03 to be updated.
  - DEC-04 Persistence: on-disk truth is `tasks/<TaskId>/instructions/<InstructionId>.json`; Zustand is in-memory only, serialized down via an adapter.
  - DEC-05 Region model: regions remain first-class; the rail is a two-level Region → Rule tree, not a flat rule list.
  - DEC-06 Log wire format: JSON-per-line (spec/21 §41) is canonical; spec/24's `key=value` is only the in-browser status strip render.
  - DEC-07 Error code namespace: every new `I_UI_*/W_UI_*/E_UI_*` reconciled against `spec/21-app/40-error-manage.md` App A.
  - DEC-08 Required subtasks: SS-01..SS-05 read gate at top of `00-overview.md`.
- §2 Screens gates: `H-*`, `RS-01..RS-14`, `RM-01..RM-07`, `R-01..R-05`, `SET-01..SET-06`, `AI-01`, `ERR-01..ERR-02`.
- §3 Design system, §4 Accessibility (`A11Y-01..05`), §5 Performance (`PERF-01..04`), §6 Observability (`OBS-01..04`).
- §7 Read-before-code list, §8 Definition of done, §9 rolled-up open TODOs (10 items).

### Changed

- `97-acceptance-criteria.md` links to `97b-ui-acceptance-checklist.md` as the executable form and marks the DEC-\* gate.

---

## [1.15.0] - 2026-07-14 - Keyboard nudge and rule-layer store hardening (project v3.53.0)

### Added

- `_notes/keyboard-nudge.md` locks `src/lib/editor/keyboard/nudge.ts` as the sole nudge delta computer: `Arrow` = 1 image px, `Shift+Arrow` = 10 image px, `Alt+Arrow` = 0.1 image px, rectangle-family clamps AABB to image bounds (refused with `W_UI_NUDGE_CLAMPED`), anchor-family translates the anchor, locked/hidden rules skipped silently, one undo per gesture (< 400 ms coalescing through existing commit boundary). Delta guards G-NUDGE-01..03.
- `_notes/rule-layer-store-hardening.md` locks `rules-slice.ts` action surface: pure `setLocked / setHidden / deleteRules / duplicateRules / reorderRules / selectAllVisibleUnlocked`. Duplicate offsets +16 image px clamped to image, inserts above source in z-order, replaces selection; delete refuses locked (`W_UI_RULE_DELETE_REFUSED`); every batch op is one undo entry; hidden-when-selected pruned in same commit. Invariants I-1..I-4 and delta guards G-STORE-01..03 (only slice writes `state.rules`, actions in test fixture, reducers pure).

### Log surface

- `I_UI_RULES_NUDGED { ruleIds, dx, dy, source: 'keyboard', correlationId }` per committed nudge gesture.
- `W_UI_NUDGE_CLAMPED { ruleId, axis, correlationId }` rate-capped 5/sec.
- `I_UI_RULES_LOCKED / _UNLOCKED / _HIDDEN / _SHOWN / _DELETED / _DUPLICATED / _REORDERED { ruleIds, correlationId }` per commit.
- `W_UI_RULE_DELETE_REFUSED { ruleIds, reason: 'locked', correlationId }` when delete refused.

---

## [1.14.0] - 2026-07-14 - Selection halos/handles and marquee (project v3.52.0)

### Added

- `_notes/selection-halos-and-handles.md` locks `resolveRuleStyle(rule, ctx)` as the sole state-to-style resolver, 2 px `--ca-select` halo after all fills for selected rules, 8 corner/midpoint handles for rectangle-family single-select, 8x8 diamond handle for anchor-family single-select, locked-rule 60% opacity with no halo/handles, hidden rules culled, and hover as +1 px stroke without halo. Delta guards G-HALO-01..03.
- `_notes/marquee-selection.md` locks `src/lib/editor/tools/marquee-tool.ts` as the marquee gesture, activated when pointerdown misses every visible unlocked rule; `state.pendingMarquee` rendered in screen space by `renderFrame`; `commitMarqueeGesture` handles no-modifier replace, `Shift` union, `Alt` subtract, `Ctrl/Cmd` symmetric difference; `marqueeHit` uses fully-inside AABB containment against the culled visible unlocked set with anchor-family rules using an 8 px CSS anchor AABB. Delta guards G-MARQ-01..03.

### Log surface

- One `I_UI_SELECTION_CHANGED { ruleIds, source: 'marquee', matched, correlationId }` per committed marquee gesture.
- One `I_UI_TOOL_GESTURE_END { tool: 'marquee', durationMs, moved, correlationId }` per marquee release.

---

## [1.0.0] - 2026-07-14 - Spec 24 baseline sealed

Seeded per-folder changelog. Baseline captures every file landed under plan 30 steps 1–18.

### Added

- `00-overview.md` — purpose, inventory (9 files), plan 24/30 compliance table. (project v3.27.0, step 17)
- `01-foundations.md` — design tokens: color, typography, spacing, motion, elevation. (project v3.24.0, step 6)
- `02-layout.md` — global shell: header, left nav, right rail, canvas region. (project v3.24.0, step 7)
- `03-canvas.md` — coord model, zoom 0.25×–8×, pan, fit-to-view, drawing, selection, manipulation, 16 ms/200-shape budget, C-1..C-10. (project v3.24.0, step 8)
- `04-rule-layers.md` — Rule List rail anatomy, actions, listbox keyboard model, selection contract, drag-reorder, R-1..R-10. (project v3.24.0, step 9; row prefix normalized at project v3.31.0)
- `05-rule-controller.md` — mount contract, kind picker, per-kind visible-fields matrix, kind-switch preservation, live-preview policy, OCR/TextMatch/Math worked examples, K-1..K-10. (project v3.25.0, step 11)
- `06-state-persistence.md` — Zustand shape, action API, memoized selectors, `programs/<id>.json` v2 with 300 ms debounce, forward-only migrations, 50-step undo with gesture coalescing, correlation-id lifecycle, S-1..S-10. (project v3.25.0, step 12)
- `07-errors-logging.md` — `key=value` log format, 8 info + 3 warn + 4 error codes, `/setup*` boundaries, 5 lines/sec/correlation_id rate cap, E-1..E-10. (project v3.26.0, step 14–15)
- `08-testing.md` — 6 Vitest units, 3 Playwright suites, perf p95 ≤ 16 ms, Axe zero color-contrast, keyboard-only, visual snapshots, C/R/K/S/E test traceability. (project v3.26.0, step 16; row prefix normalized at project v3.31.0)
- `97-acceptance-criteria.md` — cross-file acceptance roll-up (F/L/C/R/K/S/E/T) and ship gate. (project v3.28.0, step 19)
- `98-changelog.md` — this file. (project v3.28.0, step 20)

### Cross-links

- Namespace cross-link appended to `spec/03-error-manage/03-error-code-registry/01-registry.md` clarifying that `I_UI_*` / `W_UI_*` / `E_UI_*` / `I_CAM_*` are structured log events (spec 24 is source of truth) and must be ignored by the numeric-code linter. (project v3.26.0)

### Compliance

- Spec-authoring-guide requirement: every spec folder MUST carry its own `98-changelog.md`. Satisfied at project v3.28.0.
- `spec/spec-index.md` updated at project v3.27.0: App UI count 1 → 9, total 411 → 419.

---

## [1.1.0] - 2026-07-14 - Typography decision and geometry boundary

### Added

- `_notes/typography-size-tokens.md` records the step 25 decision: existing `--text-hmi-*` tokens are canonical, no `--fs-*` aliases, and editor implementation must use `text-hmi-*` utilities instead of raw Tailwind text sizes.
- `_notes/canvas-geometry-boundary.md` records the step 26 geometry boundary for `coords.ts` and `hit-test.ts`, including stable function signatures, validation output, logging ownership, and the future WASM adapter seam.

### Changed

- `00-overview.md` version/date refreshed to project v3.31.0.
- `01-foundations.md` now explicitly closes the typography gap with the `--text-hmi-*` decision.
- `03-canvas.md` now includes the stable geometry API boundary and validation/logging contract.
- `04-rule-layers.md` acceptance rows normalized to `R-1..R-10` so `L-*` remains reserved for Layout.
- `08-testing.md` traceability now uses `C/R/K/S/E`.

---

## [1.2.0] - 2026-07-14 - Math grammar and lighting controls

### Added

- `../../.lovable/plans/subtasks/30-app-ui-rule-editor-revamp/ss-03-math-expression-grammar.md` locks the safe Math rule grammar, 10 evaluator vectors, 8 geometry vectors, parser failure reasons, and test ownership for `math-evaluator.test.ts`, `coords.test.ts`, and `hit-test.test.ts`.
- `../../.lovable/plans/subtasks/30-app-ui-rule-editor-revamp/ss-05-lighting-controls.md` locks 7 lighting controls, ranges, defaults, validation rules, 4 log codes, 12 LC acceptance rows, and `lighting.test.ts` / `lighting.spec.ts` coverage.

### Changed

- `05-rule-controller.md` now points Math panel validation to SS-03.
- `07-errors-logging.md` now includes `W_UI_LIGHT_OUT_OF_RANGE` and `E_CAM_LIGHT_UNAVAILABLE`.
- `08-testing.md` and `97-acceptance-criteria.md` now include lighting coverage rows.

---

## 2026-07-14 - plan 30 steps 33-34

- `_notes/todo-tbd-sweep.md` added: swept `spec/24-app-ui-design-system/` for `TODO|TBD|FIXME|XXX`, 1 hit found (meta-marker in this changelog), zero rewrites required, regression guard defined for step 35.
- `_notes/wireframe-sanity-check.md` added: five regions W-01..W-05 (top bar, tool ribbon, canvas, right rail, status strip) reconciled against the reference image, zero deltas, snapshot gate wired to step 100.

## 2026-07-14 - plan 30 steps 35-36 (spec v1.0)

- `_notes/spec-done-checklist-v1.md` added: C-01..C-09 gates all PASS, spec tagged v1.0, future changes require an explicit spec-version bump entry.
- `_notes/typography-budget-gate.md` added: 7 size tokens, 4 weights, 1 family, 0 italic, 0 arbitrary sizes; three regression guards G-TYPO-01..03 for step 51+ implementation gate.

## 2026-07-14 - plan 30 steps 37-38

- `_notes/color-budget-gate.md` added: 16 semantic `--ca-*` tokens locked (8 surfaces + 2 ink + 3 status + 3 brand/interaction), zero raw literals / Tailwind palette utilities / arbitrary color utilities / theme branching in editor scope; four regression guards G-COLOR-01..04.
- `_notes/motion-budget-gate.md` added: 4 durations + 4 easings locked, canvas RAF exception scoped to `src/components/editor/canvas/**`, `prefers-reduced-motion: reduce` collapse mapped to shell root; four regression guards G-MOTION-01..04.

## 2026-07-14 - plan 30 steps 39-40

- `_notes/elevation-budget-gate.md` added: 5 semantic `--elevation-*` tokens locked (0 flat -> 4 halo), single-composition rule, canvas selection/hover halo mapped to layer 4; four regression guards G-ELEV-01..04.
- `_notes/spacing-iconography-budget-gate.md` added: 9-step 4 px spacing grid (`--space-0..10`), lucide-react as sole icon set, 4 icon sizes (`--icon-sm..xl`) with fixed 1.5 stroke, no inline SVG outside canvas; six regression guards G-SPACE-01..03 + G-ICON-01..03.

## 2026-07-14 - plan 30 steps 41-42

- `_notes/layout-budget-gate.md` added: shell grid frozen at top bar 48 px / tool ribbon 56 px / right rail 320 px / status strip 28 px / canvas flex; two breakpoints (`wide` >=1440, `compact` 1024-1439); three regression guards G-LAYOUT-01..03.
- `_notes/tool-ribbon-budget-gate.md` added: 5 chips C/R/K/S/E at 40x40 in fixed order, 5 visual states, tooltip @500 ms on `--elevation-2`, full keyboard delegation to `_notes/kind-picker-keyboard-model.md`; four regression guards G-RIBBON-01..04.

## 2026-07-14 - plan 30 steps 43-44

- `_notes/status-strip-budget-gate.md` added: 28 px strip with left (last log code) / center (dev-only FPS) / right (undo/redo/save state) slots, tabular-nums numerics, `--motion-instant` only, `role="status"` landmark; four regression guards G-STATUS-01..04.
- `_notes/rule-kinds-budget-gate.md` added: 5 kinds C/R/K/S/E matrix locked with param defaults, single `params.thresholds` shape, exactly-1 `rule.kind-switch` history entry, `W_UI_SHAPE_CLEARED_ON_KIND_SWITCH` when shape type incompatible; four regression guards G-KIND-01..04.

## 2026-07-14 - plan 30 steps 45-46

- `_notes/selectors-budget-gate.md` added: one id-only `selection: RuleId[]` store field, four modes (`none`, `single`, `multi`, `range`), canvas and Rule List gesture ownership, stack-order canvas hit resolution, controller mount only on `selection.length === 1`, and one `I_UI_SELECTION_CHANGED` log per committed gesture; four regression guards G-SELECT-01..04.
- `_notes/undo-budget-gate.md` added: eight history kinds, complete before/after snapshots, 50-entry ring, FIFO eviction, redo clearing, 400 ms params coalescing, F-UNDO-01..07 result matrix, and undo/redo logging; four regression guards G-UNDO-01..04.

## 2026-07-14 - plan 30 steps 47+49

- `_notes/boundaries-budget-gate.md` added: 7 module layers, 4 error-boundary tiers (route/shell/canvas/controller) with max depth 3, action-creator-only store mutations, serialized-input persistence adapter, and one `I_UI_PERSIST_WRITE` + at most one `E_UI_PERSIST_WRITE` per commit; four regression guards G-BOUND-01..04. Folds step 48.
- `_notes/perf-budget-gate.md` added: 16 ms frame across 5 slices (store 2 / selectors 2 / hit-test 2 / canvas 8 / shell 2), RAF-coalesced pointer, LRU-1 memoized selectors, single `<canvas>` 200-rule render with 64 px viewport cull, zero re-renders on pointer move, one `W_UI_FRAME_BUDGET_EXCEEDED` per over-budget frame pair; four regression guards G-PERF-01..04.

## 2026-07-14 - plan 30 steps 50-51

- `_notes/visual-snapshots-budget-gate.md` added: 10 snapshot surfaces VS-01..VS-10, 3 viewports (`wide` primary, `compact`, `wide-hidpi`) with per-surface applicability, dark theme only, 0.1% pixel tolerance and 0 per-test overrides, fixture-declared masks, motion collapsed and 2-RAF canvas stability; four regression guards G-VISUAL-01..04. Total baselines at v1: 16.
- `_notes/implementation-foundations-kickoff.md` added: closes all 14 budget gates and opens implementation. 1 token source (`src/styles.css`), 7-layer `src/lib/editor` skeleton with 4 public barrels, 1 logger in `errors.ts`, 1 CI budget script `scripts/check-editor-budgets.sh`. Four regression guards G-FOUND-01..04.

## 2026-07-14 - plan 30 steps 52-53

- `_notes/shell-grid-topbar.md` added: locks the 3-row / 3-col editor shell grid (48/1fr/28 rows, 56/1fr/320 cols), 5 named slots (topBar/ribbon/rail/status/children) with no fallbacks, banner top bar with tablist and program name + save/publish action props, `--elevation-1` chrome with `--motion-fast` tab underline, `editor.shell.v2` feature flag path in `src/routes/setup*.tsx`, and `E_UI_EDITOR_SHELL_CRASH` boundary log; three delta guards G-SHELL-01..03.
- `_notes/tool-ribbon-kind-switch.md` added: locks the 5-chip radiogroup wired to `rules.kindSwitch` action returning discriminated `Result`, same-kind commit no-op (no log, no history), incompatible shape clear with `W_UI_SHAPE_CLEARED_ON_KIND_SWITCH`, params reset to kind defaults, exactly 1 `rule.kind-switch` history entry per switch, `I_UI_RULE_KIND_CHANGED` per commit, `W_UI_KIND_DISABLED` at most once per disabled attempt, and `selection.length !== 1` full disable path; three delta guards G-RIBBON-05, G-RIBBON-06, G-LOG-01 (console.\* banned in editor scope with a single shell-boundary allowlist entry).

## 2026-07-14 - plan 30 steps 54-55

- `_notes/right-rail-rule-list.md` added: locks the 320 px rail with `--elevation-1` root, section-header typography shift at 1440 px, 40 px rows with kind badge / name / hidden / locked (`--icon-md` lucide), listbox keyboard model (arrows/Home/End/PageUp/Down/Enter/Space/Esc), 3 new `selection` actions (`set` / `toggle` / `range`) + Ctrl+A over visible-unlocked, empty state card at 0 rules, and one `I_UI_SELECTION_CHANGED` per committed gesture; three delta guards G-RAIL-01..03.
- `_notes/status-strip-scaffold.md` added: locks the 28 px 3-slot strip with left slot fully wired to a 200-entry FIFO log ring `src/lib/editor/log-stream.ts` (`push` / `last` / `tail` / `subscribe`, subscriber cap 8, `E_UI_LOG_STREAM_OVERFLOW`), level chip colors info->`--ca-ok` / warn->`--ca-warn` / error->`--ca-ng`, click opens log console at `--elevation-3`, center FPS badge and right save state as static placeholders until steps 95 and 58, `errors.ts` logger forwards to `push()`; three delta guards G-STATUS-05..07.

## 2026-07-14 - plan 30 steps 56-57

- `_notes/route-error-boundary.md` added: locks the route tier with `RouteErrorFallback` on every editor route (`setup*`, `results`, `run`, `ops`), `defaultErrorComponent` in `src/router.tsx`, `notFoundComponent` re-using `src/routes/errors.tsx`, one `E_UI_ROUTE_CRASH` log with `correlation_id` per crash and one `I_UI_ROUTE_RETRY` on reload, retry calls both `router.invalidate()` and `reset()`, no visible stack traces; three delta guards G-BOUND-05, G-ROUTE-01..02.
- `_notes/inner-error-boundaries.md` added: locks the 3 inner tiers under a shared `boundary-base.tsx` class (`EditorErrorBoundary` / `CanvasErrorBoundary` / `ControllerErrorBoundary`), tier matrix with codes `E_UI_EDITOR_SHELL_CRASH` / `E_UI_CANVAS_CRASH` / `E_UI_CONTROLLER_CRASH`, key-bump reset without store mutation, ribbon/top bar/status always-live during inner crashes, max render-path depth 3, controller mount gated on `selection.length === 1`, matching `I_UI_BOUNDARY_RESET` per reset; three delta guards G-BOUND-06..08.

## 2026-07-14 - plan 30 steps 58-59

- `_notes/save-state-persistence-stub.md` added: locks `UNDO_CAPACITY = 50` FIFO ring in `src/lib/editor/undo/ring.ts`, three save states (`saved` / `dirty` / `saving`) via `selectSaveState`, `PersistenceAdapter` interface with a `memory-adapter.ts` default that resolves after 1 macrotask, mandatory `I_UI_PERSIST_WRITE` on success + `E_UI_PERSIST_WRITE` on failure with `{ bytes, duration_ms, correlationId }`, `serialize.ts` as the only constructor of `Program` values, right-slot layout `Un{u}/50 · R{r}/50 · {Saved|Dirty|Saving...}` with `--motion-instant`-only animated ellipsis, and naive commit path calling `adapter.write(serialize(state))` after every non-null action entry; three delta guards G-SAVE-01..03.
- `_notes/top-bar-polish.md` added: locks program name via `selectProgramName` with an 8 px `--ca-select` dirty pill, tablist (Setup/Ops/Results) synced from `Route.location` with `--motion-fast` underline and full keyboard model, Save button with `saved`/`dirty`/`saving`/`Retry` label transitions dispatching through the persistence adapter and emitting `I_UI_SAVE_CLICKED`, Publish stubbed as `I_UI_PUBLISH_STUB` dialog only, `--ca-focus-ring` at `--elevation-4` on both actions, no `title=` fallbacks; three delta guards G-TOPBAR-01..03.

## 2026-07-14 - plan 30 steps 60-61

- `_notes/layout-gate-green-closure.md` added: closes the missing implementation gap by adding `src/components/editor/**`, `src/lib/editor/**`, and `scripts/check-editor-budgets.sh`; rewires `setup*.tsx` routes to the editor shell and records before/after guard evidence.
- `_notes/canvas-viewport-mount.md` added: mounts one DPR-aware `<canvas>` in the shell `children` slot, paints seeded rule rectangles, highlights selected rules from the rail, and emits `I_UI_CANVAS_READY` into the status strip log stream.

## 2026-07-14 - plan 30 steps 62-63

- `_notes/pan-zoom-geometry-boundary.md` added: locks `src/lib/editor/coords.ts` as the sole owner of image/screen transforms with pure `Viewport`, `imageToScreen` / `screenToImage`, `fitToView`, `clampZoom [0.25, 8]`, `clampPan`, anchor-preserving `applyWheel`, and G-COORD-01..03 delta guards; one `I_UI_VIEWPORT_CHANGED` per gesture end.
- `_notes/canvas-draw-pass.md` added: locks `src/lib/editor/render/frame.ts` as the single `renderFrame(ctx, state)` entry point with fixed clear -> world -> reference -> cull -> rules -> halos -> marquee pipeline, cached style tokens, zero allocations in the visible-rule loop, and G-DRAW-01..03 delta guards enforcing the 200-rule/16 ms p95 budget.

## 2026-07-14 - plan 30 steps 64-65

- `_notes/pointer-interaction-dispatcher.md` added: locks `src/lib/editor/pointer/dispatcher.ts` as the sole canvas event owner with `PointerIntent` union, `attachPointerDispatcher(canvas, ctx)` returning detach, `setPointerCapture` lifecycle, space-drag pan, wheel + ctrl-wheel pinch as `zoom`, one `screenToImage` per event, no store writes, and G-PTR-01..03 delta guards.
- `_notes/draw-tools-rect-family.md` added: locks `src/lib/editor/tools/rect-tool.ts` as the shared drag-to-create tool for `roi` / `rect` / `presence` / `blob` with Shift = square, Alt = center, `MIN_RECT_PX = 4` accidental-click guard, in-flight paint via `state.pendingShape`, and G-DRAW-TOOL-01..03 delta guards; `I_UI_RULE_CREATED` / `W_UI_RULE_CREATE_REJECTED` codes wired.

## 2026-07-14 - plan 30 steps 66-67

- `_notes/remaining-draw-tools-text-math-ocr.md` added: closes the actual missing-module gap by adding the tool registry plus `anchor-tool.ts`; `K/S/E` now create OCR/Text/Math anchors, while `C/R` keep the rectangle tool path.
- `_notes/hit-test-pointer-selection.md` added: locks `src/lib/editor/hit-test.ts` with topmost visible unlocked selection and wires `CanvasViewport` pointerdown to `source=canvas-hit` selection logs.

## Upcoming (unreleased, pinned in `.lovable/prompts/351-next-task.md`)

- Selection halos and handles (step 68).
- Marquee selection (step 69).

---

## [1.17.0] - 2026-07-16 - Plan 64 UI v2 spec authoring (project v3.244.0 -> v3.253.0)

### Added

- Navigation shell block: `10-navigation-shell.md`, `11-running-process-pill.md`, `12-rules-editor-shell.md`, `13-rule-kinds-catalogue.md`, `14-design-mode-custom-shapes.md`, `15-export-import.md`.
- Project + setup block: `16-project-lifecycle.md`, `17-camera-setup.md`, `18-lighting-setup.md` (Q4), `19-ai-settings-placeholder.md` (Q20), `20-backend-endpoint-map.md` (54 rows), `21-filesystem-layout.md` (Q12).
- Domain + rule kinds: `22-override-modes.md` (Q6/Q7), `23-recent-projects-home.md`, `24-categories.md`, `25-run-flow.md`, `26-validate-single-image.md`, `27-user-js-functions.md` (Q8), `28-flaw-detection.md` (Q9), `29-barcode-qr.md` (Q10), `30-blob-detection.md`, `31-positional-adjust.md` (Q11).
- Export / import: `32-export-json-schema.md`, `33-export-yaml-schema.md` (Q15), `34-project-zip-layout.md` (Q16), `35-import-flow.md`, `36-shape-svg-asset.md`, `37-mask-from-image.md`.
- Shell contracts: `38-header-breadcrumb.md`, `39-back-forward.md` (Q19), `40-menu-anti-jitter.md`, `41-panel-docking-model.md`, `42-drag-drop-running-pill.md` (Q17), `43-rule-editor-toolbar.md`.
- DB diagrams: `spec/23-app-db/02-rule-sets.mmd`, `03-projects.mmd`, `04-runs-captures.mmd`, `05-user-assets.mmd`. Root DB schema gained §4 SQLite Column Contract.

### Changed

- `00-overview.md` freezes vocabulary Rule Set / Rule / Category / Project / Run.
- `01-foundations.md` adds Naming section (PascalCase storage, Title-Case UI, `formatLabel` contract).
- `97b-ui-acceptance-checklist.md` gains §10 with 21 new checklist rows (P64-\*).
- `99-consistency-report.md` gains §11 "Recipe" residue audit.

### Open ambiguities

Q1, Q4, Q6-Q12, Q15-Q21 remain open. Answers propagate through `.lovable/ambiguity-questions/00-index-blocked-specs.md`.
