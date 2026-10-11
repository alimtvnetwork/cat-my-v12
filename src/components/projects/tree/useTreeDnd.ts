// Plan 03 step 3. useTreeDnd: @dnd-kit wiring for the project tree.
// Spec: 02-spec/21-app/81-project-recipe-rule-tree-view.md §5.2–§5.4.
// Owns sensors, drag state, drop-position computation, commit + toast,
// aria-live announcements, and Alt+Arrow keyboard moves. Pure move math
// lives in tree-dnd.ts / lib/recipes/move.ts.

import { useRef, useState } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { ClientLogger } from "@/lib/observability/client-logger";
import {
  TreeDropPositionType,
  TreeMoveKindType,
  TreeNodeKindType,
} from "@/lib/recipes/tree-types";
import type { TreeMoveRequest } from "@/lib/recipes/move";
import type { Recipe } from "@/lib/recipes/model";
import type { RuleId } from "@/lib/rules/model";
import {
  buildMoveRequest,
  computeDropPosition,
  isValidDrop,
  parseSortableId,
  sortableIdFor,
  type DndNodeRef,
} from "./tree-dnd";

interface UseTreeDndArgs {
  recipes: readonly Recipe[];
  commitTreeMove: (req: TreeMoveRequest) => void;
  /** Human label for announcements, e.g. recipe/rule display name. */
  describeNode: (ref: DndNodeRef) => string;
}

export interface ActiveDragNode extends DndNodeRef {
  name: string;
  sortableId: string;
}

export interface OverState {
  sortableId: string;
  position: TreeDropPositionType;
  isValid: boolean;
}

export function useTreeDnd(args: UseTreeDndArgs): {
  sensors: ReturnType<typeof useSensors>;
  activeNode: ActiveDragNode | null;
  overState: OverState | null;
  announcement: string;
  handlePointerMove: (clientY: number) => void;
  onDragStart: (event: DragStartEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel: () => void;
  handleMoveKey: (kind: TreeNodeKindType, id: string, direction: "up" | "down" | "left" | "right") => void;
} {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );
  const [activeNode, setActiveNode] = useState<ActiveDragNode | null>(null);
  const [overState, setOverState] = useState<OverState | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const pointerY = useRef(0);

  const commit = (req: TreeMoveRequest, announceText: string): void => {
    try {
      args.commitTreeMove(req);
      setAnnouncement(announceText);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Move failed";
      ClientLogger.error("[project-tree] dnd commit failed", { req, err });
      toast.error(message);
      setAnnouncement(`Move failed: ${message}`);
    }
  };

  const handlePointerMove = (clientY: number): void => {
    pointerY.current = clientY;
  };

  const onDragStart = (event: DragStartEvent): void => {
    const ref = parseSortableId(String(event.active.id));

    if (!ref) return;

    setActiveNode({
      ...ref,
      name: args.describeNode(ref),
      sortableId: String(event.active.id),
    });
    setOverState(null);
  };

  const onDragOver = (event: DragOverEvent): void => {
    if (!activeNode) {
      setOverState(null);

      return;
    }

    const overId = event.over ? String(event.over.id) : null;
    const target = overId ? parseSortableId(overId) : null;

    if (!target || !event.over?.rect) {
      setOverState(null);

      return;
    }

    const canGoInto =
      activeNode.kind === TreeNodeKindType.Rule && target.kind === TreeNodeKindType.Recipe;
    const rect = event.over.rect;
    const position = computeDropPosition(pointerY.current, rect.top, rect.height, canGoInto);

    setOverState({
      sortableId: overId as string,
      position,
      isValid: isValidDrop(activeNode.kind, target.kind, position),
    });
  };

  const onDragEnd = (event: DragEndEvent): void => {
    const drag = activeNode;
    const over = overState;
    setActiveNode(null);
    setOverState(null);

    if (!drag || !over || over.isValid === false) {
      if (drag && over) setAnnouncement("Move not allowed here");

      return;
    }

    const target = parseSortableId(over.sortableId);

    if (!target) return;

    const req = buildMoveRequest(args.recipes, drag, target, over.position);

    if (!req) {
      setAnnouncement("Move not allowed here");

      return;
    }

    commit(req, `Moved ${drag.name} ${describePosition(over.position)} ${args.describeNode(target)}`);
  };

  const onDragCancel = (): void => {
    setActiveNode(null);
    setOverState(null);
    setAnnouncement("Move cancelled");
  };

  const handleMoveKey = (
    kind: TreeNodeKindType,
    id: string,
    direction: "up" | "down" | "left" | "right",
  ): void => {
    if (kind === TreeNodeKindType.Recipe && (direction === "up" || direction === "down")) {
      moveRecipeKeyboard(id, direction);
    } else if (kind === TreeNodeKindType.Rule) {
      moveRuleKeyboard(id, direction);
    }
  };

  const moveRecipeKeyboard = (id: string, direction: "up" | "down"): void => {
    const idx = args.recipes.findIndex((r) => r.id === id);
    const target = direction === "up" ? args.recipes[idx - 1] : args.recipes[idx + 1];

    if (!target) return;

    commit(
      {
        moveKind: TreeMoveKindType.ReorderRecipe,
        sourceId: id,
        targetId: target.id,
        position: direction === "up" ? TreeDropPositionType.Before : TreeDropPositionType.After,
      },
      `Recipe moved ${direction}`,
    );
  };

  const moveRuleKeyboard = (id: string, direction: "up" | "down" | "left" | "right"): void => {
    const recipeIdx = args.recipes.findIndex((r) => r.ruleIds.includes(id as RuleId));
    const recipe = args.recipes[recipeIdx];

    if (!recipe) return;

    if (direction === "up" || direction === "down") {
      const ruleIdx = recipe.ruleIds.indexOf(id as RuleId);
      const sibling = direction === "up" ? recipe.ruleIds[ruleIdx - 1] : recipe.ruleIds[ruleIdx + 1];

      if (!sibling) return;

      commit(
        {
          moveKind: TreeMoveKindType.ReorderRule,
          sourceId: id,
          targetId: sibling,
          position: direction === "up" ? TreeDropPositionType.Before : TreeDropPositionType.After,
        },
        `Rule moved ${direction}`,
      );

      return;
    }

    const targetRecipe = direction === "left" ? args.recipes[recipeIdx - 1] : args.recipes[recipeIdx + 1];

    if (!targetRecipe) return;

    commit(
      {
        moveKind: TreeMoveKindType.MoveRuleToRecipe,
        sourceId: id,
        targetId: targetRecipe.id,
        position: TreeDropPositionType.Into,
      },
      `Rule moved to recipe ${targetRecipe.name}`,
    );
  };

  return {
    sensors,
    activeNode,
    overState,
    announcement,
    handlePointerMove,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
    handleMoveKey,
  };
}

function describePosition(position: TreeDropPositionType): string {
  if (position === TreeDropPositionType.Before) return "before";
  if (position === TreeDropPositionType.After) return "after";

  return "into";
}

export { sortableIdFor };
