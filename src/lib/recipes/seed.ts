// Plan 03 step 1. Seed recipes for seed mode, dev, and Playwright.
// Deterministic ids (no magic strings in tests — import these constants).
// Goes through the same store actions the UI uses so persistence and the
// facade-backed write path exercise identically to a real user flow.

import { useRecipeStore } from "./store";
import { asRecipeId } from "./model";
import type { RuleId } from "@/lib/rules/model";

export const SEED_RECIPE_INCOMING_ID = asRecipeId("seed-recipe-incoming");
export const SEED_RECIPE_FINAL_ID = asRecipeId("seed-recipe-final");

export const SEED_RECIPE_DEFS = [
  { id: SEED_RECIPE_INCOMING_ID, name: "Incoming Inspection", sortOrder: 0 },
  { id: SEED_RECIPE_FINAL_ID, name: "Final Check", sortOrder: 1 },
] as const;

/**
 * Seed two recipes for a project and distribute the given rule ids
 * across them (first half → Incoming, rest → Final). Idempotent: skips
 * recipes that already exist. Returns the recipe ids in display order.
 */
export function ensureSeedRecipes(projectId: string, ruleIds: readonly RuleId[]): string[] {
  const state = useRecipeStore.getState();
  const stamp = new Date().toISOString();
  const half = Math.ceil(ruleIds.length / 2);
  const created: string[] = [];

  SEED_RECIPE_DEFS.forEach((def, defIndex) => {
    if (state.recipes[def.id]) {
      created.push(def.id);

      return;
    }

    const sliceStart = defIndex === 0 ? 0 : half;
    const sliceEnd = defIndex === 0 ? half : ruleIds.length;

    useRecipeStore.setState((prev) => ({
      recipes: {
        ...prev.recipes,
        [def.id]: {
          id: def.id,
          projectId,
          name: def.name,
          sortOrder: def.sortOrder,
          ruleIds: ruleIds.slice(sliceStart, sliceEnd),
          isEnabled: true,
          createdAt: stamp,
          updatedAt: stamp,
        },
      },
    }));
    created.push(def.id);
  });

  return created;
}
