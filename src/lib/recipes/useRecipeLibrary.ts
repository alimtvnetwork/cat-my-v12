// Plan 03 step 1. React bindings over the recipe store.
// Mirrors src/lib/rules/useRulesLibrary.ts: stable snapshot identity
// between renders via useMemo over the raw record (zustand already
// notifies through useSyncExternalStore internally).

import { useMemo } from "react";
import { useRecipeStore, type NewRecipeInput } from "./store";
import { selectRecipesForProject, selectUnassignedRuleIds } from "./move";
import { TreeMoveKindType } from "./tree-types";
import type { TreeMoveRequest } from "./move";
import type { Recipe, RecipeId } from "./model";
import type { RuleId } from "@/lib/rules/model";

export function useRecipesForProject(projectId: string): readonly Recipe[] {
  const recipes = useRecipeStore((s) => s.recipes);

  return useMemo(() => selectRecipesForProject(recipes, projectId), [recipes, projectId]);
}

export function useUnassignedRuleIds(projectId: string, allRuleIds: readonly RuleId[]): readonly RuleId[] {
  const recipes = useRecipeStore((s) => s.recipes);

  return useMemo(
    () => selectUnassignedRuleIds(recipes, projectId, allRuleIds),
    [recipes, projectId, allRuleIds],
  );
}

export function useRecipeActions(): {
  addRecipe: (input: NewRecipeInput) => Recipe;
  renameRecipe: (id: RecipeId, name: string) => void;
  removeRecipe: (id: RecipeId) => void;
  setRecipeEnabled: (id: RecipeId, isEnabled: boolean) => void;
  commitTreeMove: (req: TreeMoveRequest) => void;
} {
  const addRecipe = useRecipeStore((s) => s.addRecipe);
  const renameRecipe = useRecipeStore((s) => s.renameRecipe);
  const removeRecipe = useRecipeStore((s) => s.removeRecipe);
  const setRecipeEnabled = useRecipeStore((s) => s.setRecipeEnabled);
  const commitTreeMove = useRecipeStore((s) => s.commitTreeMove);

  return useMemo(
    () => ({ addRecipe, renameRecipe, removeRecipe, setRecipeEnabled, commitTreeMove }),
    [addRecipe, renameRecipe, removeRecipe, setRecipeEnabled, commitTreeMove],
  );
}

export { TreeMoveKindType };
export type { TreeMoveRequest };
