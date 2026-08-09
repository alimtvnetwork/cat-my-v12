# 53 - UI Improvements V4

Status: draft
Owner: Plan 79 (see `.lovable/plans/pending/79-ui-improvements-v4.md`)
Reference images: `./instruction-images-v4/`
Related specs: `spec/24-app-ui-design-system/09-UI-improvements-v2.md`, `spec/21-app/47-rule-condition-model.md`, `spec/21-app/52-sdk-facade-pattern.md`, `spec/24-app-ui-design-system/14-design-mode-custom-shapes.md`
Related commands: `.lovable/spec/commands/28-ui-improvements-v4.md`

---

## 0. Scope

UI Improvements V4 is the next visual and interaction pass on the Rules editor, Properties panel, canvas selection overlays, and the Rule / Category / Project domain surfaces. It supersedes ambiguities left by V2 and V3 for those surfaces. Any time the user says "UI improvements V4" or "V4 tasks", this file and Plan 79 are the source of truth.

The user's raw brief for this pass is transcribed verbatim into `.lovable/spec/commands/28-ui-improvements-v4.md`; this spec is the normalized, engineer-facing derivation of that brief.

---

## 1. Domain model recap (Rule / Category / Project)

### 1.1 Rule

- A Rule is the atomic inspection unit. Same object the current codebase already calls "rule" (see `spec/21-app/47-rule-condition-model.md`). The word "recipe" is deprecated; keep the alias only in migration code.
- CRUD surface: `/setup/rules` lists all rules. Row actions: Edit, Duplicate, Delete. Header action: New Rule.
- New Rule / Edit Rule opens the full rule editor: image (uploaded sample OR live camera capture) + toolbox + conditions.

### 1.2 Category

- A Category IS a Rule. Same table, same editor, same fields, one extra flag `isCategory = true` and an optional `notes` text.
- There is always a built-in `Uncategorized` category which contains no conditions (a passthrough).
- Users can create their own categories (e.g. "General Biscuit", "Spicy Biscuit"). A category's rule body runs BEFORE the rule that references it.
- Because the UI is identical to a Rule, we do NOT ship a separate category editor. The editor detects `isCategory` and shows the notes field and hides pocket size (or shows it as informational).

### 1.3 Ordered pre-rules ("Which it overrides from in order")

- Every Rule (and Category, since they share the type) has an ordered list `appliesBefore: RuleId[]`.
- Meaning: to evaluate this rule, first evaluate every id in `appliesBefore` in order, then evaluate this rule.
- List may be empty. Users can add, remove, reorder entries. UI is a sortable list with a picker to add existing rules or categories.
- Given rules `X1`, `X2` referenced by `X3`, evaluating `X3` runs `X1` then `X2` then `X3`.

### 1.4 Project

- Project is a DISJOINT entity that composes rules. CRUD surface at `/projects`.
- A Project stores: `name`, `rules: RuleId[]` (ordered), `imageSamples: SampleId[]`, `cameraSettingId?`, `micSettingsId?` (see section 7), and run history.
- Effective evaluation order = flat-expand each `rules[i]` into `[...rule.appliesBefore, rule]`, deduping while preserving first occurrence. Example: project rules `[X3, X4]` where `X3.appliesBefore = [X1, X2]` expands to `[X1, X2, X3, X4]`.
- Project editor has a Run button which executes against sample images OR live camera.

### 1.5 CameraSetting (separate entity)

- Already exists (see `src/lib/camera/model.ts`). V4 formalizes that `CameraSetting` is a separately-managed record; both Rules and Projects can bind to one by id.
- From the rule editor and the project editor, the user can either pick an existing camera setup (`c1`, `c2`, ...) or save the current one as a new named setup ("Save as CameraSetting").

### 1.6 MicSettings (new stub)

- Called "Mics Settings" in the brief. Standalone entity, project-level for now. Fields TBD; ship as a facaded stub so the project editor slot exists and persists via facade.

---

## 2. Rules List surface (`/setup/rules`)

- Table or grid of rules with columns: Name, Category, `appliesBefore` count, Last Modified, Actions.
- Row click opens edit. Explicit "Edit" pencil for a11y.
- Header: search, filter by category, "New Rule" primary button, "New Category" secondary.
- Empty state seeded from facade (see section 9).

---

## 3. Rule Editor surface (`/setup/rules/$ruleId` and `/setup/rules/new`)

### 3.1 Layout (three docks)

Photoshop palette layout. Reference images:

- Left dock: Tools palette, see `./instruction-images-v4/01-tools-panel-photoshop.png`
- Right dock top: Properties / History / Swatches tabbed palette, see `./instruction-images-v4/02-properties-panel-icons.png` and `./instruction-images-v4/03-history-swatches-layers.png`
- Right dock bottom: Layers / Channels / Paths, see `./instruction-images-v4/03-history-swatches-layers.png` and `./instruction-images-v4/04-channels-tab.png`
- Center: canvas with the reference image and drawn ROIs
- Top of canvas: Rule metadata bar (Name, Category picker, Pocket Size selector 8..1, `appliesBefore` list with add / reorder)

### 3.2 Tools palette (left)

Icon-only, 32x32 hit target, single column. Every tool exposes a rich tooltip on hover: short name (bold), one-line description, keyboard shortcut, and a small preview thumbnail when relevant. Tooltip delay 300ms, follows pointer offset like Photoshop.

Tools ship in this order (v4 initial set):

1. Move / Select (V)
2. Marquee stack (M), long-press or right-click flyout: Rectangle, Ellipse / Circle, Polygon, Freehand. Shift constrains proportional. The tool remembers the last chosen variant in its button icon.
3. Magic wand / auto region (W)
4. Crop / ROI (C)
5. Eyedropper / color pick (I)
6. Brush / mask paint (B)
7. Stamp / duplicate ROI (S)
8. Eraser (E)
9. Gradient / falloff (G), for soft-edge masks
10. Blur / sharpen (R), pre-processing preview
11. Text label (T)
12. Pen / bezier (P)
13. Custom shape (U), links to Design Mode (spec 24/14)
14. Hand / pan (H)
15. Zoom (Z)
16. Foreground / background swatch pair

### 3.3 Rectangle-family long-press flyout

- Pointer-down and hold >= 350ms on any shape tool opens a horizontal flyout with all variants (Rectangle, Ellipse, Polygon, Freehand). Release over a variant selects it and starts the drag. Click-tap without hold uses the last selected variant.
- Keyboard: `Shift+M` cycles through variants.
- Shift while drawing: Rectangle to square; Ellipse to circle; Polygon to 15 degree angle snap; Freehand to straight segment from last vertex.

### 3.4 Selection overlay and transform (canvas)

Reference: `./instruction-images-v4/05-rotate-transform-handles.png`

- Every drawn ROI (rect, ellipse, polygon, freehand) shows a transform box with 8 square handles plus a rotation handle floating off one corner (offset 20px, cursor `alias`).
- Live badges above the shape while dragging, resizing, or rotating:
  - Position badge: `X . Y` (top-left of bbox, ~11px font in current build), MUST be increased to a legible size. Target: `13px` numerics with `tabular-nums`, weight 500, in a token-driven pill (`bg-popover/95`, `border-border`, `text-foreground`, `shadow-md`).
  - Size badge: `W x H` (below position badge).
  - Rotation badge: `theta deg` (above rotation handle, appears only while rotating or when angle != 0).
- Numeric badges use `tabular-nums` so digits do not jitter.
- Shift during resize preserves aspect ratio (already implemented for circle; extend to rectangle when Shift is held while dragging a corner handle).
- Alt during resize scales from center.
- Rotation snap: hold Shift to snap to 15 degree increments.

### 3.5 Rule metadata bar (top of canvas)

Left to right:

- Rule name text field (inline edit, autosave on blur).
- Category picker: dropdown of existing categories plus "Create new..." affordance.
- Pocket Size selector: segmented control with values `8 7 6 5 4 3 2 1` (single-select). This mirrors the brief's `Pocket Size 8,7,6,5,4,3,2,1`.
- `Applies before` collapsible: shows the ordered list of pre-rules with drag-to-reorder, per-row remove, and a "+ Add existing rule" picker (searchable).
- Save / Save As / Cancel on the right.

### 3.6 Properties palette (right, top)

Reference: `./instruction-images-v4/02-properties-panel-icons.png` and `./instruction-images-v4/03-history-swatches-layers.png`.

Compact icon rail on the far right (24px column) with:

- Info (i)
- History
- Adjustments (sliders)
- Grid / snap
- Brush settings
- Layers shortcut
- Type
- Paragraph
- CSS / raw JSON
- Image / sample switcher

Selecting an icon swaps the palette body. Palette body itself is dense (Photoshop density: 22-24px row height, 11-12px labels, 13px numerics). Every input is aligned to a 4px grid.

### 3.7 Layers / Channels / Paths palette (right, bottom)

- Tabs: `Layers`, `Channels`, `Paths`, mirroring `./instruction-images-v4/03-history-swatches-layers.png` and `./instruction-images-v4/04-channels-tab.png`.
- `Layers` = ROI conditions in draw order. Row: visibility eye, lock, thumbnail, name (inline edit), disclosure chevron on the right (Photoshop pattern, see command 10).
- `Channels` = per-channel color view (RGB / R / G / B) for the source image; visibility eye per channel.
- `Paths` = compiled custom SVG shapes from Design Mode (spec 24/14).
- Above the tabs: Normal blend mode plus Opacity plus Lock icons plus Fill (visual only in v4; wire later).

### 3.8 History / Swatches palette

- History tab: linear undo/redo stack showing each user action.
- Swatches tab: named colors used in conditions. Users can save a picked color to swatches for reuse.

### 3.9 Compactness bar (non-negotiable)

- No panel row taller than 28px.
- No form control taller than 28px unless it is a multi-line textarea or the canvas.
- All spacing on a 4px scale.
- No dividers stacked closer than 8px apart.
- No shadow blur > 12px in palettes.
- Uses existing shadcn tokens; no hardcoded colors.

---

## 4. Category surface

- Categories live in the same list surface (`/setup/rules?tab=categories`) OR share the list with a filter chip. Decision: single list, filter chip.
- Editor reuses the Rule editor with `isCategory` set. Pocket size row is replaced with a `Notes` textarea (multi-line).
- Deletion is blocked when a Category is referenced by any Rule's `appliesBefore` (show references dialog).

---

## 5. Project surface

### 5.1 List (`/projects`)

- Cards or table with search plus filter. Row actions: Edit, Duplicate, Delete, Run.
- Header action: New Project.

### 5.2 Editor (`/projects/$projectId` and `/projects/new`)

Sections (collapsible, order fixed):

1. Rules, ordered list of rule ids. Add via picker; drag to reorder; remove per row. Adjacent to each row: derived expanded chain badge (e.g. "X3, runs X1, X2 first").
2. Image Samples, grid of uploaded sample images (thumbnail plus name plus remove). "Add sample" button uploads a file OR captures from live camera.
3. Camera Setup, dropdown of `CameraSetting` records with an inline "Save current as new setup" affordance. Shows selected setup's key specs read-only.
4. Mics Settings, dropdown of `MicSettings` records (facaded stub in v4).
5. Run, primary button. Executes the expanded rule chain against selected sample(s) OR live capture.
6. Result, panel showing pass/fail per rule per sample, with a link back to the rule that failed.

### 5.3 Run semantics

- Effective chain = flat-expand `project.rules[]` via each rule's `appliesBefore`, dedupe preserving first occurrence, then evaluate in order.
- Category rules run according to their own `appliesBefore` too; the expansion is recursive; cycles are rejected at save time.

---

## 6. CameraSetting binding

- The Rule editor exposes a `Camera Setup` slot in the metadata bar (compact). Same picker semantics as project. This lets a rule declare that it was authored against a specific camera setup so mismatches at run time can be warned about.
- "Save current as CameraSetting" opens a modal to name the record and stores via the camera library facade.

---

## 7. MicSettings entity (stub)

- New entity `MicSettings { id, name, createdAt, updatedAt, params: Record<string, unknown> }`.
- Facaded store only; UI is a dropdown plus "New..." modal that accepts a name and freeform JSON. Full parameter schema is deferred to a later spec.
- Persistence via the same facade pattern as camera library (see section 9).

---

## 8. Seeding requirement

- Every screen described in this spec MUST render with meaningful data on a fresh install. No blank empty states in demo.
- Seed data:
  - 2 categories: `General Biscuit`, `Spicy Biscuit`.
  - 4 rules: `X1 Edge Presence`, `X2 Color Match`, `X3 Pocket Count` (uses `[X1, X2]` as `appliesBefore`), `X4 Barcode Read`.
  - 2 camera settings: `c1 Ceiling Cam`, `c2 Line Cam`.
  - 1 mic settings: `default`.
  - 1 project `My Proj 1` with rules `[X3, X4]` and sample images from `src/assets/samples/*`.
- Seed source: static JSON bundle loaded by the seed facade (existing pattern in `src/lib/seed/`). Users can mutate through the facade which then persists to IndexedDB via `idb-keyval`.

---

## 9. Facade API (mandatory)

Every persistence surface introduced by V4 goes through a facade in `src/lib/<domain>/facade.ts`. The facade abstracts current IndexedDB storage so it can be swapped for a real SDK later.

### 9.1 Rule facade (`src/lib/rules/facade.ts`)

```ts
interface RuleFacade {
  list(): Promise<Rule[]>;
  get(id: RuleId): Promise<Rule | null>;
  create(input: RuleDraft): Promise<Rule>;
  update(id: RuleId, patch: Partial<Rule>): Promise<Rule>;
  remove(id: RuleId): Promise<void>;
  duplicate(id: RuleId): Promise<Rule>;
}
```

### 9.2 Category facade

Reuses `RuleFacade` filtered by `isCategory`. No separate storage.

### 9.3 Project facade (`src/lib/projects/facade.ts`, already exists, extend)

Extend with `micSettingsId`, `cameraSettingId`, and `rules` operations that validate cycle-freedom on save.

### 9.4 CameraSetting facade

Already exists at `src/lib/camera/store.ts`; wrap under `src/lib/camera/facade.ts` if not already present.

### 9.5 MicSettings facade (`src/lib/mic/facade.ts`)

New. Same CRUD shape as Rule facade minus duplicate.

### 9.6 Facade TODOs

Each new facade MUST also register a pending TODO under `.lovable/pending-facades/` describing: what the fake persistence does now, what the real SDK call should be, and the migration checklist. See Plan 79 for the exact list.

---

## 10. Verification checklist

- [ ] Rules list renders seeded rules and categories.
- [ ] New Rule / Edit Rule editor matches section 3 layout at 1440px, 1280px, 1024px.
- [ ] Marquee long-press flyout produces rect / ellipse / polygon / freehand.
- [ ] Rotation handle appears and `theta deg` badge is legible.
- [ ] Position badge font >= 13px, tabular numerics, no jitter during drag.
- [ ] Category-as-rule editor reuses the same component.
- [ ] `appliesBefore` picker rejects cycles.
- [ ] Project editor expands `[X3, X4]` to `[X1, X2, X3, X4]` visibly.
- [ ] All new persistence goes through a facade; no direct IndexedDB call from a component.
- [ ] Seed data present on first load.
- [ ] Playwright visual coverage for: `/setup/rules`, `/setup/rules/new`, `/projects`, `/projects/$id`.

---

## 11. Non-goals

- No full Photoshop blend modes.
- No true multi-layer compositing on the canvas.
- No live camera hardware integration in v4 (blocked on I-BE-04); use recorded samples.
- No MicSettings parameter schema; stub only.

---

## 12. Plan 100 references (2026-07-19)

Plan 100 (`.lovable/plans/pending/82-plan100-ui-v4-100steps.md`) is the active
execution plan for the V4 direction. It captures a fresh round of user
screenshots and expands the V4 scope with keyboard-first navigation, an
address-bar titlebar, an inline-edit primitive, a docked-properties selection
bridge, HUD-follows-shape, and a seed orchestrator per screen.

### 12.1 Screenshot fixtures

Stored under `spec/21-app/53-ui-improvements-v4-assets/plan82/`. Every issue
captured this round links back here.

| File            | Depicts                                                                                                                                                                                              | Linked issue      |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `upload-71.png` | Floating HUD with X/Y/W/H badges, preset row, threshold slider next to a purple ROI over a SOIC chip. Reference target for HUD legibility and preset placement.                                      | I-33 (HUD follow) |
| `upload-72.png` | K C8 solder joint and R right pin bank annotations on a blurred board. Reference for kind-token badge styling.                                                                                       | I-27 (badges)     |
| `upload-73.png` | HUD "Text" pane with `RRR` inline rename input. Reference for inline-edit affordance placement.                                                                                                      | I-30 (properties) |
| `upload-74.png` | Full editor viewport showing wedged Tools hint strip between header and canvas, purple ROI, and docked Properties panel reading "No content wired for properties." Reference for issues #30 and #32. | I-30, I-32        |
| `upload-75.png` | Rule Set breadcrumb duplicated in the titlebar and again in the page body. Reference for issue #31 and the address-bar work.                                                                         | I-31              |
| `upload-76.png` | Rule Set fill section (Import shape / Import mask / Design mode / Validate / Add rule) flush against the Rule Layers panel with no padding. Reference for issue #34 and the padding baseline.        | I-28, I-29, I-34  |

### 12.2 Linked issues opened this round

- `.lovable/issues/28-rules-list-mixes-categories.md`
- `.lovable/issues/29-rule-edit-does-not-open-editor.md`
- `.lovable/issues/30-properties-panel-not-reflecting-selection.md`
- `.lovable/issues/31-duplicate-breadcrumb.md`
- `.lovable/issues/32-tools-strip-between-header-and-canvas.md`
- `.lovable/issues/33-hud-does-not-follow-shape.md`
- `.lovable/issues/34-rule-set-fill-section-padding-broken.md`

### 12.3 Linked commands opened this round

- `.lovable/spec/commands/29-fullscreen-and-shortcut-conventions.md`
- `.lovable/spec/commands/30-inline-edit-commit-semantics.md`
- `.lovable/spec/commands/31-padding-and-readability-baseline.md`
- `.lovable/spec/commands/32-address-bar-nav.md`
- `.lovable/spec/commands/33-properties-selection-bridge.md`
- `.lovable/spec/commands/34-hud-follows-shape.md`
- `.lovable/spec/commands/35-seed-fixtures-per-screen.md`

---

## 13. Fullscreen + global shortcuts

Source of truth: `.lovable/spec/commands/29-fullscreen-and-shortcut-conventions.md`.
Architecture detail: `.lovable/plans/subtasks/82-plan100-ui-v4-100steps/SS-01-shortcut-registry-architecture.md`.

### 13.1 Registry

A single shortcut registry (`src/lib/shortcuts/registry.ts`) is the only place
combos are declared. Every feature that wants a keyboard entry calls
`registerShortcut({ id, scope, combo, when, run, label, group })` on mount and
returns the disposer on unmount. Duplicate `id` registrations are a dev-time
error, never silently overwritten.

Scope precedence (highest first): `hud` > `editor` > `route:*` > `menu` > `global`.
A higher-scope combo wins over a lower-scope one with the same key. The
`when` predicate gates activation without unregistering, so contextual
shortcuts (e.g. `[`/`]` cycling presets) light up only while a shape is
selected.

### 13.2 Required bindings

| Scope       | Combo                                           | Action                                                                                                         |
| ----------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| global      | `Ctrl+Shift+F`                                  | Toggle fullscreen (`document.fullscreenElement`).                                                              |
| global      | `Escape`                                        | Exit fullscreen if active. Otherwise falls through to route/editor handlers (close menus, cancel inline edit). |
| global      | `Ctrl+Shift+/` and `?`                          | Open the Shortcuts Cheat Sheet dialog.                                                                         |
| global      | `Ctrl+K`                                        | Open the Command Palette.                                                                                      |
| global      | `Ctrl+L`                                        | Focus the address bar (edit-path mode).                                                                        |
| global      | `Alt+Left` / `Alt+Right` / `Alt+Up`             | Router back / forward / up-one-level.                                                                          |
| menu        | `Alt` (hold)                                    | Toggle Alt-mnemonic overlay (`data-alt-menu` on `<body>`; letters underlined via `<AltKey letter="F" />`).     |
| menu        | `Alt+F` / `Alt+E` / `Alt+V` / `Alt+W` / `Alt+H` | Open File / Edit / View / Window / Help menus with focus on first item.                                        |
| route:rules | `F2`                                            | Rename focused rule row.                                                                                       |
| editor      | `V` / `H` / `R` / `C` / `P` / `T`               | Select / Hand / Rect / Circle / Polygon / Text tool.                                                           |
| editor      | `F2`                                            | Rename selected shape.                                                                                         |
| editor      | `Delete`                                        | Delete selected shape.                                                                                         |
| editor      | `Ctrl+D`                                        | Duplicate selected shape.                                                                                      |
| hud         | `[` / `]`                                       | Cycle preset Strict / Balanced / Loose.                                                                        |
| hud         | `,` / `.`                                       | Nudge threshold -/+ 0.01.                                                                                      |
| hud         | `Alt+1..9`                                      | Switch selected shape to Nth in the layer list.                                                                |

### 13.3 Cheat Sheet dialog

`src/components/shortcuts/ShortcutCheatSheet.tsx` renders the registry
grouped by `group` (Window, Navigation, Menus, Tools, Selection, HUD,
Editing, Debug). Every row is `label + <kbd>` chips built by
`formatCombo`. Dialog includes a filter input, a "Copy all as markdown"
button, and a "Print" button. The dialog itself is keyboard-navigable:
`ArrowDown` moves rows, `Enter` runs the row's action if the `when`
predicate allows.

### 13.4 Alt mnemonics

`AltMnemonicLayer.tsx` listens for Alt keydown/up globally. While Alt is
held it sets `document.body.dataset.altMenu = "on"`. `<AltKey letter="F">File</AltKey>`
renders `<span><u>F</u>ile</span>` only when the overlay is on; otherwise
it renders "File" plain. This keeps the underline out of default rendering
and matches Windows accelerator semantics.

### 13.5 Keyboard-first menu contract

Every top-menu label MUST wrap its accelerator letter in `<AltKey>`. Every
menu item MUST be reachable by arrow keys + Enter without a mouse. Menu
items with combos render `<kbd>` chips right-aligned. Icon-only buttons in
the Titlebar, Tools rail, and Properties pane MUST provide `aria-label`.

### 13.6 Fullscreen affordance

A Fullscreen icon button lives in the Titlebar right cluster (grouped with
Theme, Density, Cheat Sheet, Command Palette). It uses `Maximize` /
`Minimize2` icons based on `document.fullscreenElement` and tooltips the
combo `Ctrl+Shift+F`. Vendor-prefixed fullscreen APIs are gated behind a
`toggleFullscreen()` helper in `src/lib/shortcuts/fullscreen.ts` so
browsers without the standard method still work (or fail loudly via
`showToastError`, never silently).

---

## 14. Address bar (single-breadcrumb rule)

Source of truth: `.lovable/spec/commands/32-address-bar-nav.md`. Fixes I-31
(`upload-75.png`). The Titlebar renders one segmented address bar; every page
body MUST NOT render a second breadcrumb. `useCrumbTrail()` reads
`useRouterState({ select: s => s.matches })` and pulls a `crumb(loaderData)`
static from each route module, so `$projectId` and `$rulesetId` show human
names, not UUIDs. `Ctrl+L` focuses the bar in edit mode; `Enter` navigates via
`router.navigate`, `Escape` reverts. Back / Forward / Up buttons wrap
`router.history.canGoBack / canGoForward / go(-1) / go(1)` and a computed
parent segment. A ratchet test (`tests/lint/single-breadcrumb.spec.ts`) fails
the build if `<AppBreadcrumb` appears outside `src/components/chrome/Titlebar.tsx`.

## 15. Properties selection bridge

Source of truth: `.lovable/spec/commands/33-properties-selection-bridge.md`.
Fixes I-30 (`upload-74.png`). One store, `useSelectionStore` in
`src/lib/editor/selection-store.ts`, owns the current selection as a tagged
union (`shape | rule | ruleset | project | none`). Canvas overlay, docked
PropertiesPalette, and floating HUD all read/write the same store. Dirty
state stays on the domain stores, never on the selection store. Selection is
per-route-instance via a React context, so the setup editor and the
per-ruleset editor keep separate cursors. Ratchet test
`src/components/rules/__tests__/properties-bridge.test.tsx` asserts that
canvas selection lights up the correct pane and both HUD and pane mutate the
same rule.

## 16. HUD follows shape

Source of truth: `.lovable/spec/commands/34-hud-follows-shape.md`. Fixes
I-33. Setting `hudFollowMode` on `useUiPrefsStore` picks one of `follow`
(default, rAF-driven placement recomputed from the shape's rotated AABB),
`anchor` (mount-time placement, today's behaviour), or `manual` (persisted
position from v3.628.0). `computeHudPlacement` prefers top-right offset,
flips to top-left on right-edge clip, falls to top-center below the shape
on both-side clip, and clamps into the viewport. `Alt+H` cycles modes for
the current session without persisting.

## 17. Seed fixtures per screen

Source of truth: `.lovable/spec/commands/35-seed-fixtures-per-screen.md`.
One orchestrator `seedAll(profile)` in `src/lib/seed/orchestrator.ts`
writes every facade in a coherent snapshot for one of three profiles:
`sample-pcb` (12 rules covering every kind, 4 rulesets, 3 cameras, 6
samples), `soic-inspection`, `connector-bank`. Stable human-readable ids
(`project:sample-pcb`, `ruleset:solder-joints`, `rule:solder-joint-count`)
make deep links deterministic and are what fixes I-29. First-run seeds
`sample-pcb` from `__root.tsx.beforeLoad` when the project count is zero.
Every write goes through a facade; ad-hoc `seed.ts` writes are banned
after Phase G.

## 18. Inline edit commit semantics

Source of truth: `.lovable/spec/commands/30-inline-edit-commit-semantics.md`.
Every inline rename in the app (rule name, ROI label, project name, category,
HUD text field) MUST behave the same way. `Enter` commits, blur commits,
`Escape` reverts, a visible ✓ button commits by click and a ✕ button cancels,
`F2` starts rename on the focused row wherever renaming is supported, and
double-click keeps working. Inline inputs use readable typography (min 13px
value, 12px label) with min 8px horizontal and 6px vertical padding so the
text never clips at default zoom. The primitive lives at
`src/components/primitives/InlineEdit.tsx` (Phase B step 17) and replaces the
ad-hoc rename in `SelectionOverlay.tsx`, rule list rows, and project cards so
the semantics cannot drift.

## 19. Padding and readability baseline

Source of truth: `.lovable/spec/commands/31-padding-and-readability-baseline.md`.
Fixes I-34 (`upload-76.png`) plus every "section is too tight / text is
unreadable" complaint. Non-negotiable minimums: section header padding
`px-4 py-3`; toolbar cluster padding `px-2` with `gap-2` between clusters and
`gap-1` inside a cluster; buttons `h-8 px-3` default, `h-7 px-2` compact,
never below `h-6`; row density min 22px with 24-28px target; text min 13px
for values and 12px for labels (`text-[10px]` and `text-[11px]` are banned
for anything a user must read). The single-breadcrumb rule from §14 is
repeated here as the readability corollary: titlebar breadcrumb OR page
breadcrumb, never both. Reference visuals for enforcement live in
`spec/21-app/53-ui-improvements-v4-assets/plan82/upload-71..76.png`.

## 20. Rules vs Categories separation

Source of truth: `.lovable/issues/28-rules-list-mixes-categories.md`. Fixes
I-28. The ruleset editor renders two mutually exclusive lists driven from
the same store: the Rules panel filters `useRulesLibrary().rules` to
`isCategory === false` and the Categories tab renders the complement
(`isCategory === true`), never both in the same list. Both surfaces reuse
one `RuleRow` primitive so kind badge, `RulePreviewThumbnail`, updated-at
stamp, and inline rename affordances stay identical; only the empty-state
copy and the "Add" action differ ("Add rule" opens the rule-create dialog
from §13.2, "Add category" opens the category-create dialog). A ratchet
test (`src/features/rules/__tests__/rules-vs-categories.test.tsx`) seeds
one rule and one category, mounts the ruleset editor, and asserts that
the Rules list contains only the rule row while the Categories tab
contains only the category row. Phase D steps 31-32 implement this.

## 21. Error surfacing (mandatory funnel)

Source of truth: `src/lib/errors/notify.ts` plus
`src/components/errors/GlobalErrorModal.tsx`. Every user-visible failure
MUST route through `showToastError(err, context)` which calls
`useErrorStore.captureException` under the hood, so the correlation id
(8-char, from `src/types/errors.ts`) is generated once and reused by the
toast, the modal, and the persisted history. Silent `catch {}` blocks are
banned; the ratchet lint
(`src/lib/errors/__tests__/no-silent-catch.test.ts`) fails the build on
any `catch` that neither rethrows nor calls the funnel. `GlobalErrorModal`
renders a "Copy details" button that copies `{correlationId, message,
stack, context, timestamp}` as JSON so users can paste one blob into
support. Server functions log via `console.error({correlationId, ...})`
before throwing so worker logs and the client toast share the same id.
Phase H steps 71-78 implement the missing pieces (Copy button, correlation
id surfacing in the toast, retry-with-reset, offline fallback).

## 22. Row-link keyboard invariants (Plan 100 D-37/38/39)

The `/setup/rules` row is a keyboard-primary surface. Two invariants,
enforced by `tests/visual/rules-list-keyboard.spec.ts`:

1. Enter on a focused row link navigates to the editor. Native anchor
   behavior; do not override or preventDefault it.
2. Space ALSO navigates. Anchors ignore Space by default, so
   `RuleRow` in `src/routes/setup.rules.tsx` attaches an `onKeyDown`
   handler that calls `useNavigate()` on Space and logs failures with
   the row id via `console.error("[setup.rules row] Space nav failed", ...)`.
   The handler skips events that bubble up from nested interactives
   (delete button, ContextMenuTrigger internals) by checking
   `e.currentTarget !== e.target`.

Related consolidation: the RuleEditor's route-scoped tool hotkey
wiring lives in `src/lib/editor/keyboard/useToolShortcuts.ts` (step
37). The editor component itself is composition-only. Failures during
`onSelect` are logged via `console.error("[useToolShortcuts] tool
select failed", ...)` rather than swallowed, so a broken key binding
is visible in the console instead of appearing as a dead hotkey.
