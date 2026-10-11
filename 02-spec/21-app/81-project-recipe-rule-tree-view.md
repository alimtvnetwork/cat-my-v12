# 81 — Project → Recipe → Rule Tree View (Standard Mode)

**Version:** 1.0.0
**Updated:** 2026-10-11
**AI Confidence:** Draft
**Ambiguity:** None

---

## Keywords

`project-tree` · `recipe` · `drag-and-drop` · `standard-mode` · `preview-panel` · `hierarchy`

---

## Scoring

| Criterion | Status |
|-----------|--------|
| `01-index.md` present in module | ✅ |
| AI Confidence assigned | ✅ |
| Ambiguity assigned | ✅ |
| Keywords present | ✅ |
| Scoring table present | ✅ |

---

## Purpose

Specify a **Project → Recipes → Rules** hierarchy for **standard UI mode**, rendered as a **tree view with visible depth** and **drag-and-drop moving** between places, plus a **preview panel** in the project section. A blind AI reading only this file (plus the cross-referenced files) must be able to implement the feature without guessing: domain model, enums, visual anatomy, DnD move matrix, persistence path, error handling, and per-step checklists are all defined here.

---

## 1. Background — the modern UI concept (Yeasin)

Source: contributor Yeasin Kabir Joy ("joy"), branches `feature/21-sep-26-joy-greyscale-pattern-matching` (PRs #3, #4) and `dev-joy`. The "modern UI concept" this spec replicates into standard mode consists of:

1. **5-part tool anatomy** — every vision tool module is composed of `Header / Canvas / SettingsCard / ResultCard / Footer` (see `src/components/vision/standard/tools/pattern-matching/`). Each part is a small, single-purpose component with typed props in `types.ts`.
2. **Multi-rule pipeline visualization** — `MultiRulePipelineGuide.tsx`: a vertical numbered flowchart of chained rules with sequence badges, gate badges, status colors, and connecting arrows. Rules short-circuit downstream on failure.
3. **Two-phase preview** — select/configure first, then preview/simulate in a side panel before committing (conveyor simulation with play/pause, batch progress).
4. **Recipe/segment editing** — modern mode's `RecipeEditor` works on ordered `RecipeSegment`s, each carrying its own vision/camera/ROI settings.

What we replicate in standard mode: the 5-part anatomy (tree / preview / toolbar as parts), the vertical numbered-chain visual language for the hierarchy, and the select-then-preview two-phase pattern. We do **not** port the simulation canvases in v1.

---

## 2. Goals / Non-goals

### Goals

- G1: First-class **Recipe** entity between Project and Rules: `Project → Recipes → Rules`.
- G2: Tree view in the standard-mode project section showing **depth (height)** visibly: indentation + guide rails + depth badges + counts.
- G3: **Drag-and-drop**: reorder recipes within a project; reorder rules within a recipe; **move rules from one recipe to another** (same project).
- G4: **Preview panel**: selecting any node (project / recipe / rule) shows a rich preview in the right rail.
- G5: Standard-mode grayscale HMI styling; keyboard-accessible DnD; optimistic updates with rollback.

### Non-goals (v1)

- Cross-project moves (drag a recipe/rule into a *different* project) — v1.1 via explicit "Move to project…" menu.
- Simulation canvases / live camera preview in the tree view.
- Changing the `Rule` entity, the ruleset model, or the backend SQLite schema. v1 persists through the existing IndexedDB facade channel (same as Project).

---

## 3. Domain model

### 3.1 Recipe entity (new)

`Recipe` is a **disjoint aggregate** (same pattern as V4 Project: it *owns* ordered id lists, it does not embed child entities).

```ts
// src/lib/recipes/model.ts
export type RecipeId = string & { readonly __brand: "RecipeId" };

export const RecipeSchema = z.object({
  id: RecipeIdSchema,                       // branded, min 1, max 64
  projectId: z.string().min(1).max(64),     // owner project
  name: z.string().trim().min(1).max(64),
  sortOrder: z.number().int().min(0),        // order within project
  ruleIds: z.array(RuleIdSchema).default([]), // ordered; disjoint aggregate
  notes: z.string().max(500).optional(),
  isEnabled: z.boolean().default(true),
  createdAt: IsoDateString,
  updatedAt: IsoDateString,
});
export type Recipe = z.output<typeof RecipeSchema>;
```

Invariants:

- R1: `ruleIds` order is the user-visible rule order inside the recipe. Renormalized to `0..n-1` after every mutation.
- R2: A `RuleId` may appear in **at most one** recipe per project. Moving a rule removes it from the source recipe (move, not copy).
- R3: Deleting a recipe does **not** delete its rules; rules become *unassigned* (visible under an "Unassigned rules" pseudo-group at the recipe level) until moved or deleted. Deleting a rule follows existing V4 referrer rules (`RuleReferencedError`).
- R4: `Rule` entity is **unchanged** — no `recipeId` field on rules (keeps RuleFacade, audits, and backend untouched).
- R5: Empty-name and duplicate-name (case-insensitive, within project) recipes are rejected at save with `RecipeValidationError`.

### 3.2 Project changes

`Project` (src/lib/projects/store.ts) is **unchanged** except: recipes are derived, not stored on Project.

- Single source of truth: `Recipe.projectId` + `Recipe.sortOrder`.
- Selector: `selectRecipesForProject(state, projectId): Recipe[]` — filter + sort by `sortOrder`, stable by `id` on ties.
- No `recipeIds` array on Project (avoids dual-source-of-truth on moves).

### 3.3 Effective chain per recipe

Reuse the V4 chain expander (`src/lib/projects/chain.ts`, `computeEffectiveChain`):

- Recipe effective chain = `flatten(recipe.ruleIds.map(r => [...expand(r.appliesBefore), r]))`, `dedupeByIdKeepFirst`.
- The recipe preview shows per-rule derived badges: `"X3 runs X1, X2 first"` (same language as the V4 project editor).
- Cycle detection unchanged: cycles rejected at rule save time; chain expander returns `{ chain, cycle }` defensively.

### 3.4 Enums (typed, `Type` suffix, PascalCase members)

```ts
// src/lib/recipes/tree-types.ts (dedicated file per CODE RED rule 9)
export enum TreeNodeKindType {
  Project = "Project",
  Recipe = "Recipe",
  Rule = "Rule",
}

export enum TreeDropPositionType {
  Before = "Before",   // insert before target row
  Into = "Into",       // become child of target (rule -> recipe only)
  After = "After",     // insert after target row
}

export enum TreeMoveKindType {
  ReorderRecipe = "ReorderRecipe",
  ReorderRule = "ReorderRule",
  MoveRuleToRecipe = "MoveRuleToRecipe",
}
```

`TreeNodeKindType` drives row rendering, preview switching, and DnD validation. No string literals for kinds anywhere.

---

## 4. Tree view — visual spec

### 4.1 Placement (standard mode only)

- Route: `/projects/$projectId/` (existing overview). Add a **"Structure"** section below the existing overview cards.
- Layout inside the section: **left = tree panel** (`flex-1`, min-width 320), **right = preview rail** (`w-80`, fixed 320px, own scroll). Uses `StandardAppShell` chrome; no route change.
- Modern UI mode: unchanged (this spec is standard-mode only).

### 4.2 Node anatomy

Depths: `0 = Project` (single root row for the current project), `1 = Recipe`, `2 = Rule`.

Every row (all depths):

- **Chevron** (recipes only; 16px hit area): `ChevronRight` collapsed / `ChevronDown` expanded. Project row chevron toggles all recipes.
- **Depth badge** (mono, `text-[10px]`): `L0` / `L1` / `L2` — makes height explicit even without counting indent.
- **Icon**: Project = `FolderOpen`/`Folder`; Recipe = `Layers`; Rule = rule tool icon (reuse `ToolIcon`).
- **Name** (truncate, `text-xs font-semibold` for project, `text-xs` otherwise).
- **Count pill** (recipes: N rules; project: N recipes · M rules).
- **Status pill** (rules only): last verdict `OK / NG / ERROR` (color = state, never icon swap — per 30-ui-overview §5). Unknown → muted "—".
- **Indent guides**: 16px per depth + 1px vertical guide rail (`border-ca-border`) connecting siblings — the "see height" requirement.
- **Row height**: 32px fixed (dense HMI). Hover: `bg-ca-panel-2`. Selected: `bg-ca-select/20` + left border `border-ca-select/40` (mirrors Yeasin's active-tab treatment).

Project root row additionally shows a **"New recipe"** (+) button on hover.

### 4.3 Expand / collapse / selection

- Click chevron or double-click row → toggle. Click row → select (preview updates).
- Expanded state persisted per project in `localStorage` under registered `ui.*` key `ui.project-tree.expanded.<projectId>` (per 30-ui-overview §4: ephemeral UI state only under `ui.*` keys).
- "Expand all" / "Collapse all" buttons in the tree toolbar.
- Empty recipes show a dashed drop-target hint row: "Drop rules here".

### 4.4 Empty states

- Project with no recipes: tree shows project root + empty-state card ("No recipes yet." + "New recipe" button).
- Recipe with no rules: dashed hint row (also the drop target).
- "Unassigned rules" pseudo-group (depth 1, muted, not draggable as a group, not deletable): holds rules of this project that belong to no recipe (R3).

---

## 5. Drag-and-drop

### 5.1 Allowed-move matrix

| Dragged \ Target | Project root | Recipe row | Rule row |
|---|---|---|---|
| **Recipe** | ✗ (single root) | **Before/After** = reorder within project | ✗ |
| **Rule** | ✗ | **Into** = move into recipe (append at drop position) | **Before/After** = reorder; if target is in another recipe, rule moves to that recipe at that position |

- Rule → Project root: invalid (rules must live in a recipe). Deny affordance.
- Recipe → Rule: invalid. Deny affordance.
- "Unassigned" pseudo-group: rules can be dragged **out** of it into recipes; nothing can be dropped **into** it (use explicit "Unassign" row action instead).

### 5.2 Interaction (@dnd-kit — already a dependency)

- `DndContext` with `PointerSensor` (`activationConstraint: { distance: 4 }`) and `KeyboardSensor`.
- One `SortableContext` per sortable level (`verticalListSortingStrategy`): recipes list; each recipe's rule list.
- Drop position from pointer Y within target row: top third = Before, middle = Into (recipes only), bottom third = After.
- Visuals during drag: `DragOverlay` with the dragged row (opacity 0.9, `border-ca-select`); insertion line (2px `bg-ca-select`) for Before/After; row highlight (`bg-ca-select/20`) for Into; `not-allowed` cursor + red-tinted outline for invalid targets.
- `aria-live` announcements: "Moved Rule X into Recipe Y, position 3".

### 5.3 Keyboard DnD (mirrors `useLayerDnd` / `keyboard-controller` pattern)

- Focus row → `Alt+ArrowUp/Down`: reorder within current parent.
- Focus rule row → `Alt+ArrowLeft/Right`: move rule to previous/next recipe (same project), appended at end.
- Same commit path as pointer DnD (single `commitTreeMove` function).

### 5.4 Commit, persistence, errors

- Exactly one commit function: `commitTreeMove(args: { moveKind: TreeMoveKindType; sourceId: string; targetId: string; position: TreeDropPositionType }): Promise<void>`.
- **Optimistic update** on the recipe store; on facade error → rollback to pre-move snapshot, `toast.error`, `ClientLogger.error` with operation + ids. Never silent (CODE RED rule 6).
- Persistence path: recipe store persisted slice via the same IndexedDB repository-facade seam as projects (`createFacadeStateStorage`-style). In Backend data-source mode, mutations go through `runBackendWrite` (`src/lib/data-source/gate.ts`) — seed mode stays hermetic.
- SortOrder renormalization: after every move, sibling `sortOrder` values rewritten `0..n-1` in the same commit (no fractional indexes in v1).

---

## 6. Preview panel (right rail)

Selection-driven. Header: kind badge (`TreeNodeKindType`) + name + depth badge. Sections below per kind — 5-part anatomy adapted (Header / Body / Actions; no canvas in v1):

### 6.1 Project preview

- Counts: N recipes · M rules (M excludes disabled), unassigned-rule count if > 0.
- Last run verdict pill (from project run history) + timestamp.
- Bindings: camera name, mic settings name (or "—").
- Reference thumbnail (project reference image if present, else muted placeholder box 4:3).
- Actions: `Open Setup`, `Run` (disabled while a run is active — 30-ui-overview §3 nav-lock rule applies).

### 6.2 Recipe preview

- Ordered rule chips (numbered, Yeasin pipeline-guide language): each chip = sequence number + rule name + verdict pill.
- Per-rule derived badge: `"runs X1, X2 first"` when `appliesBefore` is non-empty.
- Effective chain length + short-circuit note ("downstream rules skip on failure").
- Toggle: enable/disable recipe (grays out row in tree).
- Actions: `Add rule` (opens rule picker), `Run recipe`.

### 6.3 Rule preview

- Summary card (Yeasin `ResultCard` language): name, category name, pocket size, conditions count, camera setting.
- Last verdict pill + last-run timestamp.
- `appliesBefore` chain chips.
- Actions: `Edit rule` (→ `/setup/rules/$id`), `Duplicate`.

### 6.4 Empty selection

Muted card: "Select a project, recipe, or rule to preview." (Never blank.)

---

## 7. Standard-mode styling (mandatory)

- Grayscale tokens only: `bg-ca-bg`, `bg-ca-panel`, `bg-ca-panel-2`, `border-ca-border`, `text-ca-ink`, `text-ca-ink-muted`, `bg-ca-select/20`, `border-ca-select/40`, `text-ca-select`. **Zero hardcoded hex** (30-ui-overview §5).
- Hairline 1px borders, **no shadows**, 4px base grid, body 12px, counts `font-variant-numeric: tabular-nums`.
- Accent usage (from Yeasin): numbered mono badges for sequence/depth, `cyan` reserved for active/selected states only.
- Compound keyboard helpers: `KeyboardKeyType.isEnterOrSpace(key)` — never chained `||` (AGENTS.md).
- Boolean props/state: `is*` / `has*` only, positive framing, non-nullable.

---

## 8. Data source, facades, persistence

- New files (dedicated, ≤ 100 lines each):
  - `src/lib/recipes/model.ts` — Zod schema, branded `RecipeId`, `isRecipe` guard, `RecipeValidationError`, `RecipeNotFoundError`.
  - `src/lib/recipes/tree-types.ts` — `TreeNodeKindType`, `TreeDropPositionType`, `TreeMoveKindType`.
  - `src/lib/recipes/store.ts` — zustand store + persist via the same repository-facade seam as projects; selectors `selectRecipesForProject`, `selectUnassignedRules`.
  - `src/lib/recipes/useRecipeLibrary.ts` — `useSyncExternalStore` hook mirroring `useRulesLibrary` (stable snapshots).
  - `src/lib/recipes/seed.ts` — seed recipes/rules for seed mode + Playwright fixtures.
  - `src/lib/recipes/move.ts` — pure move math: `reorderSiblings`, `moveRuleBetweenRecipes`, `normalizeSortOrders` (unit-tested, no React).
- Facade pattern (spec 52): business logic never touches storage directly; storage seam injectable (`memory` kind for tests).
- Seed vs Backend: seed fixtures in seed mode; backend mode mutations pass `runBackendWrite`. No new SQLite migration in v1 (same channel as Project).

---

## 9. Error handling

- Typed errors: `RecipeValidationError` (empty/duplicate name), `RecipeNotFoundError`, `RuleMoveError` (invalid target). All extend the project `AppError` conventions; surface inline next to the offending field or via toast for DnD failures (spec 03-error-manage).
- Catch → log (`ClientLogger`) → rethrow or rollback. Never silent.
- Delete recipe with rules → confirm dialog listing the rule count and the unassigned-rule consequence (mirrors V4 referrer dialog).

---

## 10. Implementation steps (multi-step)

- **Step 1 — Domain + store**: `model.ts`, `tree-types.ts`, `store.ts` (persisted), `useRecipeLibrary.ts`, `seed.ts`, `move.ts`. Unit tests for move math + model validation. *Done when: `bunx vitest run src/lib/recipes` green.*
- **Step 2 — Tree view (read-only)**: `ProjectTreeView.tsx` + `TreeRow.tsx` + `TreeToolbar.tsx` in `src/components/projects/tree/`; depth guides, badges, counts, expand/collapse (persisted `ui.*`), selection → `onSelectNode`. Wired into `/projects/$projectId/` "Structure" section. *Done when: 3 depths render, expand/collapse persists across reload.*
- **Step 3 — Drag-and-drop**: `DndContext` + `SortableContext`s + `DragOverlay` + `commitTreeMove` + keyboard DnD. Enforce §5.1 matrix. Optimistic update + rollback. *Done when: rule moves between recipes and order survives reload; invalid drops denied.*
- **Step 4 — Preview panel**: `TreePreviewPanel.tsx` + per-kind sections (§6.1–6.4). *Done when: selecting each kind shows the specified fields; actions navigate correctly.*
- **Step 5 — Polish + verify**: empty states, `aria-live`, toasts, seed fixtures, Playwright e2e (move rule A→B, reload, assert), `bunx tsgo --noEmit`, eslint, `check-magic-strings.sh --strict`. Update this spec's anchors if anything changed.

File-size rule: every new file ≤ 100 lines; functions ≤ 15 lines (≤ 8 preferred); no nested `if`s; params objects beyond 2–3 params.

---

## 11. Acceptance criteria (checklist)

- [ ] AC1: `/projects/$projectId/` shows "Structure" section with tree (left) + preview (right) in standard mode; modern mode unchanged.
- [ ] AC2: Tree shows Project (L0) → Recipes (L1) → Rules (L2) with indent guides, depth badges, counts, verdict pills.
- [ ] AC3: Expand/collapse persists across reload (`ui.project-tree.expanded.<projectId>`).
- [ ] AC4: Drag recipe → reorders within project (Before/After indicator, order persists).
- [ ] AC5: Drag rule within recipe → reorders (order persists).
- [ ] AC6: Drag rule into another recipe → moves (removed from source, appended/positioned in target, persists).
- [ ] AC7: Invalid drops (rule→project root, recipe→rule) show deny affordance and change nothing.
- [ ] AC8: Keyboard: `Alt+ArrowUp/Down` reorders; `Alt+ArrowLeft/Right` moves rule across recipes.
- [ ] AC9: Preview shows §6.1/6.2/6.3 content per selected kind; empty selection shows §6.4.
- [ ] AC10: Failed move rolls back, toasts error, logs with context.
- [ ] AC11: No hardcoded hex; grayscale tokens only; hairline borders; no shadows.
- [ ] AC12: `bunx tsgo --noEmit`, eslint, magic-strings check, unit + e2e green.

---

## 12. Test plan

- Unit (`src/lib/recipes/__tests__/`): move math (reorder, cross-recipe move, normalize), model validation (empty/duplicate names), chain expansion per recipe, cycle safety.
- Component (`__tests__` colocated): tree renders 3 depths; expand/collapse; preview switches on selection; deny affordance on invalid drop target.
- E2E (Playwright, `tests/e2e/`): seed project with 2 recipes × 3 rules → drag rule from recipe A to B → reload → assert new order; keyboard move; preview content assertions.
- Fixtures: seed project "Tree Demo" with deterministic ids (no magic strings in tests — import the constants).

---

## Cross-References

- [UI overview (locked screens)](./30-ui-overview.md)
- [Rule setup screen](./31-rule-setup-screen.md)
- [SDK facade pattern](./52-sdk-facade-pattern.md)
- [UI improvements v4 (rule/category/project model)](./53-ui-improvements-v4.md)
- [Ruleset draft save (Recipe table precedent)](./80-ruleset-draft-save.md)
- [Error management](../../03-error-manage/)
- [Database conventions](../../04-database-conventions/)
- [Design system](../../07-design-system/)
- [Yeasin branch (merged)](https://github.com/alimtvnetwork/cat-my-v12) — `feature/21-sep-26-joy-greyscale-pattern-matching` (PR #4)
- Code anchors: `src/components/vision/standard/tools/pattern-matching/MultiRulePipelineGuide.tsx` (visual language), `src/components/editor/layers/` + `src/hooks/editor/useLayerDnd.ts` (DnD precedent), `src/lib/rules/model.ts` + `src/lib/rules/useRulesLibrary.ts` (domain/hook pattern), `src/lib/projects/store.ts` (persistence seam), `src/lib/data-source/gate.ts` (write gate)
