// Plan 03 step 1. Pure tree-move math (no React, no I/O).
// Spec: 02-spec/21-app/81-project-recipe-rule-tree-view.md §5.
// All functions are pure: input record in, new record out. The store
// commits the result; tests cover every branch here.

import { TreeDropPositionType, TreeMoveKindType } from "./tree-types";
import { RecipeValidationError, type Recipe, type RecipeId } from "./model";
import type { RuleId } from "@/lib/rules/model";

export interface TreeMoveRequest {
  moveKind: TreeMoveKindType;
  sourceId: string;
  targetId: string;
  position: TreeDropPositionType;
}

type RecipeRecord = Record<string, Recipe>;

function withoutId<T extends { id: string }>(list: readonly T[], id: string): T[] {
  return list.filter((item) => item.id !== id);
}

function insertAt<T>(list: readonly T[], index: number, item: T): T[] {
  const next = [...list];
  const clamped = Math.max(0, Math.min(index, next.length));
  next.splice(clamped, 0, item);

  return next;
}

function siblingIndex<T extends { id: string }>(
  list: readonly T[],
  targetId: string,
  position: TreeDropPositionType,
): number {
  const idx = list.findIndex((item) => item.id === targetId);

  if (idx < 0) return list.length;
  if (position === TreeDropPositionType.After) return idx + 1;

  return idx;
}

/** Rewrite sortOrder 0..n-1 in the GIVEN array order (no re-sorting).
 *  Use right after insertAt, where the array order is already the target. */
function assignSortOrders(recipes: readonly Recipe[]): Recipe[] {
  return recipes.map((recipe, index) => ({ ...recipe, sortOrder: index }));
}

/** Sort by (sortOrder, id) then rewrite 0..n-1. For messy initial state. */
export function normalizeSortOrders(recipes: readonly Recipe[]): Recipe[] {
  const sorted = [...recipes].sort((a, b) => a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : 1));

  return assignSortOrders(sorted);
}

function projectRecipes(record: RecipeRecord, projectId: string): Recipe[] {
  return Object.values(record).filter((r) => r.projectId === projectId);
}

function mergeBack(record: RecipeRecord, updated: readonly Recipe[]): RecipeRecord {
  const next = { ...record };

  for (const recipe of updated) next[recipe.id] = recipe;

  return next;
}

function reorderRecipes(record: RecipeRecord, req: TreeMoveRequest): RecipeRecord {
  const source = record[req.sourceId];
  const target = record[req.targetId];

  if (!source || !target) throw new RecipeValidationError("ReorderRecipe: unknown recipe id");
  if (source.projectId !== target.projectId) {
    throw new RecipeValidationError("ReorderRecipe: recipes belong to different projects");
  }
  if (req.position === TreeDropPositionType.Into) {
    throw new RecipeValidationError("ReorderRecipe: Into is not a valid recipe target");
  }

  const siblings = normalizeSortOrders(projectRecipes(record, source.projectId));
  const rest = withoutId(siblings, source.id);
  const at = siblingIndex(rest, target.id, req.position);
  const moved = assignSortOrders(insertAt(rest, at, source));

  return mergeBack(record, moved);
}

function findRuleRecipe(record: RecipeRecord, ruleId: string): Recipe | undefined {
  return Object.values(record).find((r) => r.ruleIds.includes(ruleId as RuleId));
}

function reorderRuleInRecipe(recipe: Recipe, sourceRuleId: string, targetRuleId: string, position: TreeDropPositionType): Recipe {
  const rest = recipe.ruleIds.filter((id) => id !== sourceRuleId);
  const at = siblingIndex(
    rest.map((id) => ({ id })),
    targetRuleId,
    position,
  );

  return { ...recipe, ruleIds: insertAt(rest, at, sourceRuleId as RuleId) };
}

function applyRuleMove(record: RecipeRecord, req: TreeMoveRequest): RecipeRecord {
  const sourceRecipe = findRuleRecipe(record, req.sourceId);

  if (!sourceRecipe) throw new RecipeValidationError("Rule move: source rule is not in any recipe");

  const targetRecipe =
    req.moveKind === TreeMoveKindType.MoveRuleToRecipe && req.position === TreeDropPositionType.Into
      ? record[req.targetId]
      : findRuleRecipe(record, req.targetId);

  if (!targetRecipe) throw new RecipeValidationError("Rule move: target not found");
  if (sourceRecipe.projectId !== targetRecipe.projectId) {
    throw new RecipeValidationError("Rule move: cross-project moves are not supported in v1");
  }

  if (sourceRecipe.id === targetRecipe.id) {
    return mergeBack(record, [reorderRuleInRecipe(sourceRecipe, req.sourceId, req.targetId, req.position)]);
  }

  const detached: Recipe = {
    ...sourceRecipe,
    ruleIds: sourceRecipe.ruleIds.filter((id) => id !== req.sourceId),
  };
  const attached = reorderRuleInRecipe(targetRecipe, req.sourceId, req.targetId, req.position);
  const withAppended =
    req.position === TreeDropPositionType.Into
      ? { ...targetRecipe, ruleIds: [...targetRecipe.ruleIds, req.sourceId as RuleId] }
      : attached;

  return mergeBack(record, [detached, withAppended]);
}

export function applyTreeMove(record: RecipeRecord, req: TreeMoveRequest): RecipeRecord {
  if (req.sourceId === req.targetId) return record;
  if (req.moveKind === TreeMoveKindType.ReorderRecipe) return reorderRecipes(record, req);

  return applyRuleMove(record, req);
}

/** Project's recipes in display order. Stable on sortOrder ties. */
export function selectRecipesForProject(record: RecipeRecord, projectId: string): Recipe[] {
  return normalizeSortOrders(projectRecipes(record, projectId));
}

/** Rule ids of this project that live in no recipe (R3 unassigned group). */
export function selectUnassignedRuleIds(
  record: RecipeRecord,
  projectId: string,
  allRuleIds: readonly RuleId[],
): RuleId[] {
  const assigned = new Set<string>();

  for (const recipe of projectRecipes(record, projectId)) {
    for (const id of recipe.ruleIds) assigned.add(id);
  }

  return allRuleIds.filter((id) => assigned.has(id) === false);
}

export type { RecipeId };
