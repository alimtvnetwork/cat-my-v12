# 26 — Rule Setup Screen

**Status:** Locked (Plan 04 Step 26). Route `/setup/:taskId`. The Rule Author's primary workspace.

Anchors: images 34–36 (canvas + tool ribbon + rule builder), 22 (`Region`/`Rule` tables), 23 (`RuleOverride` cascade), 27 (tolerance defaults), 32 (shape model — next), 33 (rule catalog — later), 36 (JSON instruction output).

## 1. Purpose

Author regions and rules on a reference image, preview verdicts, and persist. No RunSession runs from this screen — the Dispatcher takes over only from `/run/:taskId`.

## 2. Layout (fills viewport minus global chrome)

Three columns, one bottom strip. All widths in px, fixed; only the Canvas center flexes.

```
┌──────────────┬───────────────────────────────────────────┬──────────────┐
│              │                                           │              │
│  Regions     │              Canvas                       │  Rule        │
│  Panel       │   (image + overlay + drag handles)        │  Builder     │
│  (280)       │                                           │  Panel (360) │
│              │                                           │              │
├──────────────┴───────────────────────────────────────────┴──────────────┤
│  Tool Ribbon (72)  · shape tools · reference-image switcher · fit/100% │
├─────────────────────────────────────────────────────────────────────────┤
│  Action Bar (44)   · Preview · Save · Discard · JSON preview toggle    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Regions Panel (left, 280 px)

- Tree grouped by parent (per 22 §3.2 `parentRegionId`).
- Each row: color chip (region color, deterministic hash of `regionId`) · name · `shapeKind` badge · `isActive` toggle · rule count.
- Selection = canvas highlight + Rule Builder focus.
- Header actions: `+ Region` (dropdown by shape), `Group selected`, `Ungroup`, `Duplicate`, `Delete` (soft: sets `isActive=0`).
- Multi-select via Shift/Ctrl. Bulk actions in a row-appearing toolbar.

### 2.2 Canvas (center, flex)

- Renders the currently-selected reference image at pixel-integer coordinates (32 §Coordinate system).
- Overlays: all `isActive` regions of the current Task; selected region rendered with drag/resize handles.
- Zoom: `Fit` (default), `100 %`, wheel-zoom around cursor. Layout of side panels never reflows (35-zoom-pan).
- Cursor modes: `select` (default) · `rectangle` · `ellipse` · `polygon` (v1 shapes only; freeform deferred — AI-04).
- Interactions: draw · drag · resize · rotate (rectangle only in v1) · nudge with arrow keys (1 px, Shift = 10 px). Details in subtask SS-01.

### 2.3 Rule Builder Panel (right, 360 px)

- Empty state (no region selected): "Select a region to add a rule."
- With region selected:
  - Region metadata: name (editable), color chip, shape summary, `parentRegionId` selector.
  - Rules list for the region. Each rule row is collapsible.
  - `+ Rule` dropdown enumerates `ruleKind` values from 33-rule-catalog.
  - Per rule: params form (kind-specific) + tolerance form + live preview verdict pill (`OK` / `NG` / `ERROR`).
- Overrides banner: if `rules.db` has an active `RuleOverride` for a rule (per 23), show a yellow chip "Overridden (TASK / RUNTIME)" with a "Show base" toggle.

### 2.4 Tool Ribbon (bottom, 72 px)

- Left: shape buttons (`Rectangle`, `Ellipse`, `Polygon`) as toggle group.
- Center: reference-image switcher — thumbnail strip of images in `images/processed/` from the last `RunSession`, plus `Import…` for a file picker. One image active at a time.
- Right: zoom controls (`Fit`, `100 %`, `-`, `+`), grid-snap toggle (snap to 4 px), coordinate readout (image-space X/Y of cursor).

### 2.5 Action Bar (bottom, 44 px)

- Left: unsaved-changes indicator ("● Unsaved" red dot).
- Center: `Preview` (runs rules on current image using local rule engine, in-process — no Dispatcher), `Show JSON` (right-drawer with the 36-json-instruction-output).
- Right: `Discard` (revert to last saved), `Save` (persists to `task.db` + adds `RuleOverrideAudit` per 23 §4.2 if overrides changed).

## 3. Data Contracts

- **Load:** on route enter, fetch:
  - `Task` (root.db, per 21 §3.2) — name, image format, reference image list.
  - `Region[]` + `Rule[]` (task.db) — full non-archived set.
  - `RuleOverride[]` (rules.db) — scope `TASK` only in this screen (RUNTIME overrides are per-RunSession, edited from Run Monitor).
- **Save:** single atomic RPC `saveRuleSet(taskId, {regions, rules, overrides})`. Server-side wraps in one transaction per DB file, in this order: `task.db` (regions → rules) then `rules.db` (overrides + audit rows). Partial success is impossible — cross-DB failure aborts the whole call.
- **Preview:** never touches DBs. Runs `core/rules.evaluate(image, snapshot)` in a browser-visible worker RPC that returns a synthetic `Result` shape (per 24 §2 without the ids).

## 4. Save Rules

- `Save` is disabled unless every rule passes schema validation (`core/config` types + 33-rule-catalog).
- Ambiguous states surfaced as inline errors on the offending row (never a toast-only failure).
- Saving is forbidden while any `RunSession` for this `taskId` is `RUNNING`. UI enforces via the Nav lock (25 §3); server enforces via a check on `RunSession.status` before writing.

## 5. Keyboard Shortcuts (deferred to SS-02)

Reserved: `V` select, `R` rectangle, `E` ellipse, `P` polygon, `Del` delete, `Ctrl+D` duplicate, `Ctrl+G` group, `Ctrl+S` save, `Ctrl+Z/Y` undo/redo. Full spec in subtask.

## 6. Undo / Redo

- In-memory ring buffer, 50 steps, per screen entry.
- Scope: region CRUD + rule CRUD + tolerance edits + reference-image switch.
- Cleared on `Save`.
- Not persisted across route changes.

## 7. Reference Image Handling

- Thumbnail strip loads lazily (first 20; scroll to load more).
- Import (`.jpg`/`.png`/`.bmp` matching `capture.imageFormat`) copies the file into `images/processed/` with a new `imageSequence` in a `_ref` sub-namespace (naming exception: `ref-<9-digit>.<ext>`; validated by 25).
- Removing an imported reference does not affect existing regions (regions live in image-space coordinates, not file-bound).

## 8. Failure Modes

| Case                                    | UI behavior                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| Save called during `RUNNING` RunSession | Server returns `E_RUNSESSION_ACTIVE`; UI shows blocking dialog with "Go to Run Monitor" link |
| Rule schema invalid                     | Row-level inline error; Save disabled                                                        |
| Reference image missing on disk         | Canvas shows placeholder + "Image not found" strip; regions still editable                   |
| RPC failure on Load                     | Full-screen error state with `Retry`                                                         |
| Preview fails on a rule                 | That rule's row shows red `ERROR` pill; other rules continue                                 |

Every error surface logs to console + backend `logs/task.log` (per 41). No silent swallowing.

## 9. Non-Goals (v1)

- No multi-image rule authoring (rules apply to any image; preview is single-image).
- No AI-suggested regions.
- No versioning of rule sets beyond `RuleOverrideAudit` — undo/redo is in-memory only.
- No collaborative editing (single writer per Task by convention).

## 10. Grouping & Layers Panel (Plan 35, v3.163+)

Durable contract for the Layers Panel introduced in Plan 35 (steps 15-22). This section supersedes any prior loose references to "groups" in §2.1.

### 10.1 Panel separation

- The Layers Panel is a dedicated left-rail component (`src/components/editor/layers/LayersPanel.tsx`), distinct from the Properties Panel (right rail) and the Canvas (center).
- Layers Panel owns: rule ordering, group membership, visibility (`isHidden`), lock (`isLocked`).
- Properties Panel owns: per-rule params, tolerance, kind. It never mutates group membership.
- Canvas is read-only w.r.t. grouping; selection is bidirectional with the Layers Panel.

### 10.2 Data model

- Groups are first-class objects held in the editor store `rules-slice`, shape `RuleGroup = { id, name, memberRuleIds: string[], collapsed?: boolean }`.
- Group membership is stored on the group, never duplicated on the rule.
- A rule may belong to at most one group. Ungrouped rules render at the panel root.
- Serialization: `ruleset-io` v2.1 persists `groups` alongside `rules`. Loaders MUST prune `memberRuleIds` referencing unknown rule ids and MUST accept files with no `groups` field (back-compat with v2.0).

### 10.3 Drag & drop

- Reorder within a group, across groups, and into/out of groups is supported.
- Drop targets: (a) between rows (reorder), (b) onto a group header (append as last member), (c) onto the root strip (ungroup + append).
- Multi-select drag moves the whole selection preserving relative order.
- Drops that would create a cycle, exceed one-group-per-rule, or target a locked group are rejected with an inline shake + toast (`E_UI_GROUP_DROP_REJECTED`).

### 10.4 Group / Ungroup / Merge

- `Group selected` (`Ctrl+G`) creates a new `RuleGroup` from the current multi-selection; requires ≥1 rule. Auto-names `Group N` where N is the smallest unused positive integer.
- `Ungroup` (`Ctrl+Shift+G`) removes the selected group(s) and promotes members to the root at the group's former index.
- `Merge` (context menu, ≥2 selected groups) concatenates members in selection order into the first selected group; other groups are deleted.
- All three operations are undoable via the standard history ring (§6).

### 10.5 Error surfaces

| Code                       | Trigger                                                  | Surface                                               |
| -------------------------- | -------------------------------------------------------- | ----------------------------------------------------- |
| `E_UI_GROUP_DROP_REJECTED` | Invalid drop target (cycle, locked, membership conflict) | Row shake + toast, no state change                    |
| `E_UI_RULE_MIGRATE_FAIL`   | v1→v2 migration failed on a rule during import           | Modal listing `ruleIndex` per failure, import aborted |
| `E_UI_GROUP_PRUNE`         | Import dropped unknown `memberRuleIds`                   | Non-blocking toast with count; import proceeds        |

All three MUST log to console with the code + payload, and MUST be covered by unit tests in `tests/unit/ruleset-io*.test.ts` or `src/components/editor/layers/__tests__/`.

## Acceptance Checklist

- [ ] Every UI action maps to a Rule catalog entry in spec 33.
- [ ] Zoom/pan behavior defers to spec 35; no duplicate spec here.
- [ ] Emits `RuleAuthored` audit event per spec 72.
- [ ] Grouping contract in §10 matches `rules-slice` and `ruleset-io` v2.1.
- [ ] Layers Panel and Properties Panel are separate components with the responsibilities in §10.1.

### 10.6 Selection ownership (Plan 57 slice 1)

- The Layers Panel is the sole writer of the current rule selection set. The Properties Panel, Canvas overlays, and keyboard shortcut handlers read `selection` from `rules-slice` but never call `setSelection` directly; they route intent through the Layers Panel API (`focusRule(id)`, `toggleRuleInSelection(id)`, `clearSelection()`).
- Rationale: prevents divergent selection state between rail and canvas (regression source cited in `.lovable/memory/v2/plan35/30-slice-1.md`), and keeps the Layers-vs-Properties responsibility split from §10.1 enforceable in tests.
