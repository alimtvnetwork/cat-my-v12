// Plan 03 step 3. Pure DnD helpers for the project tree (no React).
// Spec: 02-spec/21-app/81-project-recipe-rule-tree-view.md §5.1–§5.2.
// Sortable ids are `${kind}/${id}` so recipe and rule namespaces can
// never collide inside one DndContext.

import {
  TreeDropPositionType,
  TreeMoveKindType,
  TreeNodeKindType,
} from "@/lib/recipes/tree-types";
import type { TreeMoveRequest } from "@/lib/recipes/move";
import type { Recipe } from "@/lib/recipes/model";

export interface DndNodeRef {
  kind: TreeNodeKindType;
  id: string;
}

export function sortableIdFor(kind: TreeNodeKindType, id: string): string {
  return `${kind}/${id}`;
}

export function parseSortableId(sortableId: string): DndNodeRef | null {
  const slash = sortableId.indexOf("/");
  const kind = slash < 0 ? "" : sortableId.slice(0, slash);
  const id = slash < 0 ? "" : sortableId.slice(slash + 1);
  const isKnown = (Object.values(TreeNodeKindType) as string[]).includes(kind);

  if (isKnown === false || id.length === 0) return null;

  return { kind: kind as TreeNodeKindType, id };
}

/** Pointer Y within the target row → Before / Into / After. */
export function computeDropPosition(
  pointerY: number,
  rectTop: number,
  rectHeight: number,
  canGoInto: boolean,
): TreeDropPositionType {
  const ratio = (pointerY - rectTop) / Math.max(1, rectHeight);

  if (ratio < 0.34) return TreeDropPositionType.Before;
  if (ratio > 0.66) return TreeDropPositionType.After;
  if (canGoInto) return TreeDropPositionType.Into;

  return ratio < 0.5 ? TreeDropPositionType.Before : TreeDropPositionType.After;
}

/** §5.1 allowed-move matrix. Flat conditions (no nested ifs). */
export function isValidDrop(
  dragKind: TreeNodeKindType,
  targetKind: TreeNodeKindType,
  position: TreeDropPositionType,
): boolean {
  const isRecipeReorder =
    dragKind === TreeNodeKindType.Recipe &&
    targetKind === TreeNodeKindType.Recipe &&
    position !== TreeDropPositionType.Into;
  if (isRecipeReorder) return true;

  const isRuleIntoRecipe =
    dragKind === TreeNodeKindType.Rule &&
    targetKind === TreeNodeKindType.Recipe &&
    position === TreeDropPositionType.Into;
  if (isRuleIntoRecipe) return true;

  const isRuleOnRule =
    dragKind === TreeNodeKindType.Rule &&
    targetKind === TreeNodeKindType.Rule &&
    position !== TreeDropPositionType.Into;
  if (isRuleOnRule) return true;

  return false;
}

function findRuleRecipeId(recipes: readonly Recipe[], ruleId: string): string | null {
  const found = recipes.find((r) => r.ruleIds.includes(ruleId as never));

  return found ? found.id : null;
}

/** Translate a valid drop into the single commitTreeMove request. */
export function buildMoveRequest(
  recipes: readonly Recipe[],
  drag: DndNodeRef,
  target: DndNodeRef,
  position: TreeDropPositionType,
): TreeMoveRequest | null {
  if (drag.kind === TreeNodeKindType.Recipe && target.kind === TreeNodeKindType.Recipe) {
    return {
      moveKind: TreeMoveKindType.ReorderRecipe,
      sourceId: drag.id,
      targetId: target.id,
      position,
    };
  }

  if (drag.kind === TreeNodeKindType.Rule && target.kind === TreeNodeKindType.Recipe) {
    return {
      moveKind: TreeMoveKindType.MoveRuleToRecipe,
      sourceId: drag.id,
      targetId: target.id,
      position,
    };
  }

  if (drag.kind === TreeNodeKindType.Rule && target.kind === TreeNodeKindType.Rule) {
    const sameRecipe = findRuleRecipeId(recipes, drag.id) === findRuleRecipeId(recipes, target.id);

    return {
      moveKind: sameRecipe ? TreeMoveKindType.ReorderRule : TreeMoveKindType.MoveRuleToRecipe,
      sourceId: drag.id,
      targetId: target.id,
      position,
    };
  }

  return null;
}
