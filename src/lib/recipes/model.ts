// Plan 03 step 1. Recipe domain model + Zod schema + type guards.
// Spec: 02-spec/21-app/81-project-recipe-rule-tree-view.md §3.
//
// Recipe is a disjoint aggregate (V4 pattern): it OWNS an ordered
// `ruleIds` list. The Rule entity is untouched — no `recipeId` on rules.
// Data-only: no persistence, no side effects (facade/store own those).

import { z } from "zod";
import { RuleIdSchema, type RuleId } from "@/lib/rules/model";

// --- Branded id ------------------------------------------------------------

export type RecipeId = string & { readonly __brand: "RecipeId" };

export const RecipeIdSchema = z
  .string()
  .min(1)
  .max(64)
  .transform((v) => v as RecipeId);

export function asRecipeId(value: string): RecipeId {
  return value as RecipeId;
}

// --- Errors ----------------------------------------------------------------

export class RecipeValidationError extends Error {
  readonly name = "RecipeValidationError";
}

export class RecipeNotFoundError extends Error {
  readonly name = "RecipeNotFoundError";
}

// --- Schema ----------------------------------------------------------------

const IsoDate = z.string().datetime({ offset: true });

export const RecipeSchema = z
  .object({
    id: RecipeIdSchema,
    projectId: z.string().min(1).max(64),
    name: z.string().trim().min(1).max(64),
    sortOrder: z.number().int().min(0),
    ruleIds: z.array(RuleIdSchema).default([]),
    notes: z.string().max(500).optional(),
    isEnabled: z.boolean().default(true),
    createdAt: IsoDate,
    updatedAt: IsoDate,
  })
  .superRefine((recipe, ctx) => {
    const seen = new Set<string>();

    for (const ruleId of recipe.ruleIds) {
      if (seen.has(ruleId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ruleIds"],
          message: `Duplicate rule id in recipe: ${ruleId}`,
        });
      }

      seen.add(ruleId);
    }
  });

export type Recipe = z.output<typeof RecipeSchema>;
export type RecipeDraft = Omit<Recipe, "id" | "createdAt" | "updatedAt"> & {
  id?: RecipeId;
};

// --- Type guards -----------------------------------------------------------

export function isRecipe(value: unknown): value is Recipe {
  return RecipeSchema.safeParse(value).success;
}

export function isEnabledRecipe(recipe: Recipe): boolean {
  return recipe.isEnabled !== false;
}
