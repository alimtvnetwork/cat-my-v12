# Plan: Project → Recipe → Rule Tree View (Standard Mode)

**Status:** pending
**Created:** 2026-10-11
**Spec:** `02-spec/21-app/81-project-recipe-rule-tree-view.md`
**Source concept:** Yeasin Kabir Joy's modern UI (5-part tool anatomy, multi-rule pipeline guide, two-phase preview) replicated into standard mode.

## Goal

In standard mode's project section (`/projects/$projectId/`), show a tree view — Project (L0) → Recipes (L1) → Rules (L2) — with visible depth, drag-and-drop moves (reorder recipes, reorder rules, move rules between recipes), and a selection-driven preview panel in the right rail.

## Steps

### Step 1 — Domain + store (no UI)
- [ ] `src/lib/recipes/model.ts` — Zod `RecipeSchema`, branded `RecipeId`, `isRecipe` guard, `RecipeValidationError`, `RecipeNotFoundError`. Rule entity untouched.
- [ ] `src/lib/recipes/tree-types.ts` — `TreeNodeKindType`, `TreeDropPositionType`, `TreeMoveKindType` (typed enums, `Type` suffix, PascalCase members).
- [ ] `src/lib/recipes/move.ts` — pure move math: `reorderSiblings`, `moveRuleBetweenRecipes`, `normalizeSortOrders`. No React.
- [ ] `src/lib/recipes/store.ts` — zustand store + persist via the same repository-facade seam as projects; selectors `selectRecipesForProject`, `selectUnassignedRules`; actions `addRecipe`, `renameRecipe`, `removeRecipe`, `setRecipeEnabled`, `commitTreeMove` (optimistic + rollback).
- [ ] `src/lib/recipes/useRecipeLibrary.ts` — `useSyncExternalStore` hook mirroring `useRulesLibrary`.
- [ ] `src/lib/recipes/seed.ts` — seed recipes/rules ("Tree Demo" project) for seed mode + Playwright fixtures.
- [ ] Unit tests `src/lib/recipes/__tests__/`: move math, model validation (empty/duplicate names), per-recipe chain expansion, cycle safety.
- **Done when:** `bunx vitest run src/lib/recipes` green.

### Step 2 — Tree view (read-only)
- [ ] `src/components/projects/tree/ProjectTreeView.tsx` — DndContext shell (no drag yet), tree assembly.
- [ ] `src/components/projects/tree/TreeRow.tsx` — row anatomy per §4.2 (chevron, depth badge L0/L1/L2, icon, name, count pill, verdict pill, indent guides).
- [ ] `src/components/projects/tree/TreeToolbar.tsx` — expand-all / collapse-all / new-recipe.
- [ ] Wire "Structure" section into `src/routes/projects/$projectId/index.tsx` (standard mode only).
- [ ] Expand state persisted: `ui.project-tree.expanded.<projectId>`.
- [ ] "Unassigned rules" pseudo-group (R3).
- **Done when:** 3 depths render; expand/collapse persists across reload; selection callback fires.

### Step 3 — Drag-and-drop
- [ ] `@dnd-kit`: `DndContext` + `PointerSensor` (distance 4) + `KeyboardSensor`; `SortableContext` per level; `DragOverlay`; insertion-line / into-highlight / deny affordances.
- [ ] Enforce §5.1 move matrix. `Alt+ArrowUp/Down` reorder, `Alt+ArrowLeft/Right` move rule across recipes (same `commitTreeMove` path).
- [ ] `aria-live` announcements. Optimistic update + rollback + toast + `ClientLogger` on failure.
- **Done when:** AC4–AC8 pass manually; order survives reload.

### Step 4 — Preview panel
- [ ] `src/components/projects/tree/TreePreviewPanel.tsx` + per-kind sections (§6.1 project, §6.2 recipe, §6.3 rule, §6.4 empty).
- [ ] Recipe: numbered rule chips + "runs X1, X2 first" badges (V4 language) + effective chain length.
- [ ] Actions: Open Setup / Run / Add rule / Edit rule / Duplicate (respect run-lock).
- **Done when:** AC9 passes; actions navigate correctly.

### Step 5 — Polish + verify
- [ ] Empty states, toasts, seed fixtures, Playwright e2e (`tests/e2e/`: drag rule A→B, reload, assert).
- [ ] `bunx tsgo --noEmit`, eslint, `check-magic-strings.sh --strict` green.
- [ ] Update spec anchors if implementation diverged.

## Constraints (from repo rules)
- Files ≤ 100 lines; functions ≤ 15 (≤ 8 preferred); no nested `if`; positive conditions; `is*`/`has*` booleans; typed enums; no magic strings; grayscale `ca-*` tokens only; hairline borders; no shadows.
- Backend data-source mode: mutations via `runBackendWrite`. Seed mode hermetic.
- Errors: catch → log → rethrow/rollback. Never silent.
- No commit/push without explicit user approval.

## Acceptance
Spec §11 (AC1–AC12). E2E must cover AC6 (cross-recipe move + reload persistence).
