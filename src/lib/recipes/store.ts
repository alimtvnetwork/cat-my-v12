// Plan 03 step 1. Recipe zustand store (persisted).
// Spec: 02-spec/21-app/81-project-recipe-rule-tree-view.md §8.
// Mirrors src/lib/projects/store.ts: persist via the repository-facade
// seam (IndexedDB in browser, memory shim in SSR/vitest). Recipe is a
// disjoint aggregate: the store owns Recipe rows; Rule rows stay in the
// rule library. commitTreeMove is the single DnD commit path (optimistic
// + rollback, never silent).

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ClientLogger } from "@/lib/observability/client-logger";
import { createFacadeStateStorage } from "@/lib/projects/facade";
import {
  RecipeValidationError,
  asRecipeId,
  type Recipe,
  type RecipeId,
} from "./model";
import type { RuleId } from "@/lib/rules/model";
import {
  applyTreeMove,
  type TreeMoveRequest,
} from "./move";

export interface NewRecipeInput {
  projectId: string;
  name: string;
  notes?: string;
}

interface RecipeStoreState {
  recipes: Record<string, Recipe>;
  addRecipe: (input: NewRecipeInput) => Recipe;
  renameRecipe: (id: RecipeId, name: string) => void;
  removeRecipe: (id: RecipeId) => void;
  setRecipeEnabled: (id: RecipeId, isEnabled: boolean) => void;
  addRuleToRecipe: (recipeId: RecipeId, ruleId: RuleId) => void;
  removeRuleFromRecipe: (recipeId: RecipeId, ruleId: RuleId) => void;
  commitTreeMove: (req: TreeMoveRequest) => void;
}

function newId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };

  if (g.crypto?.randomUUID) return g.crypto.randomUUID();

  const fallback = `recipe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  ClientLogger.warn("[recipes/store] crypto.randomUUID unavailable, using fallback id", fallback);

  return fallback;
}

function cleanName(name: string): string {
  return name.trim();
}

function hasDuplicateName(
  recipes: Record<string, Recipe>,
  projectId: string,
  name: string,
  exceptId?: string,
): boolean {
  const clean = cleanName(name).toLowerCase();

  return Object.values(recipes).some(
    (r) => r.projectId === projectId && r.id !== exceptId && r.name.trim().toLowerCase() === clean,
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

export const useRecipeStore = create<RecipeStoreState>()(
  persist(
    (set, get) => ({
      recipes: {},

      addRecipe: (input) => {
        const name = cleanName(input.name);

        if (name.length === 0) throw new RecipeValidationError("Recipe name must not be empty");
        if (hasDuplicateName(get().recipes, input.projectId, name)) {
          throw new RecipeValidationError(`Duplicate recipe name in project: ${name}`);
        }

        const siblings = Object.values(get().recipes).filter((r) => r.projectId === input.projectId);
        const recipe: Recipe = {
          id: asRecipeId(newId()),
          projectId: input.projectId,
          name,
          sortOrder: siblings.length,
          ruleIds: [],
          notes: input.notes?.trim() || undefined,
          isEnabled: true,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };

        set((state) => ({ recipes: { ...state.recipes, [recipe.id]: recipe } }));

        return recipe;
      },

      renameRecipe: (id, name) => {
        const clean = cleanName(name);
        const existing = get().recipes[id];

        if (!existing) throw new RecipeValidationError(`Unknown recipe: ${id}`);
        if (clean.length === 0) throw new RecipeValidationError("Recipe name must not be empty");
        if (hasDuplicateName(get().recipes, existing.projectId, clean, id)) {
          throw new RecipeValidationError(`Duplicate recipe name in project: ${clean}`);
        }

        set((state) => ({
          recipes: { ...state.recipes, [id]: { ...existing, name: clean, updatedAt: nowIso() } },
        }));
      },

      removeRecipe: (id) => {
        if (!get().recipes[id]) throw new RecipeValidationError(`Unknown recipe: ${id}`);

        set((state) => {
          const next = { ...state.recipes };
          delete next[id];

          return { recipes: next };
        });
      },

      setRecipeEnabled: (id, isEnabled) => {
        const existing = get().recipes[id];

        if (!existing) throw new RecipeValidationError(`Unknown recipe: ${id}`);

        set((state) => ({
          recipes: { ...state.recipes, [id]: { ...existing, isEnabled, updatedAt: nowIso() } },
        }));
      },

      addRuleToRecipe: (recipeId, ruleId) => {
        const existing = get().recipes[recipeId];

        if (!existing) throw new RecipeValidationError(`Unknown recipe: ${recipeId}`);
        if (existing.ruleIds.includes(ruleId)) {
          throw new RecipeValidationError("Rule is already in this recipe");
        }

        const owner = Object.values(get().recipes).find(
          (r) => r.projectId === existing.projectId && r.ruleIds.includes(ruleId),
        );

        if (owner) {
          throw new RecipeValidationError(`Rule already belongs to recipe: ${owner.name}`);
        }

        set((state) => ({
          recipes: {
            ...state.recipes,
            [recipeId]: {
              ...existing,
              ruleIds: [...existing.ruleIds, ruleId],
              updatedAt: nowIso(),
            },
          },
        }));
      },

      removeRuleFromRecipe: (recipeId, ruleId) => {
        const existing = get().recipes[recipeId];

        if (!existing) throw new RecipeValidationError(`Unknown recipe: ${recipeId}`);

        set((state) => ({
          recipes: {
            ...state.recipes,
            [recipeId]: {
              ...existing,
              ruleIds: existing.ruleIds.filter((id) => id !== ruleId),
              updatedAt: nowIso(),
            },
          },
        }));
      },

      commitTreeMove: (req) => {
        const before = get().recipes;

        try {
          set({ recipes: applyTreeMove(before, req) });
        } catch (err) {
          ClientLogger.error("[recipes/store] commitTreeMove rejected, state unchanged", {
            req,
            err,
          });
          throw err;
        }
      },
    }),
    {
      name: "ca:recipes:v1",
      storage: createJSONStorage(() => createFacadeStateStorage()),
      partialize: (state) => ({ recipes: state.recipes }),
    },
  ),
);

// Pure selectors: explicit state, usable from loaders/tests/non-React code.
export const selectRecipe = (state: RecipeStoreState, id: string): Recipe | undefined =>
  state.recipes[id];
