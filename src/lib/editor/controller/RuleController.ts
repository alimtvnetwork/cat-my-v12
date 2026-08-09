// RuleController (plan 30 step 74).
// Single dispatch layer over rules-store + history-store + ids seam.
// Every UI entry point (canvas, rail, shortcuts, controller-driven panels)
// should call the controller so the store stays the only writer and side
// effects (id generation, image bounds, gesture correlation) live in one place.
import { IMAGE_BOUNDS } from "@/lib/editor/coords";
import { nextGestureId, withGesture } from "@/lib/editor/errors";
import type { HistorySnapshot } from "@/lib/editor/store/history-types";
import { useHistoryStore } from "@/lib/editor/store/history-slice";
import { nextRuleIds } from "@/lib/editor/store/ids";
import type { RulesState } from "@/lib/editor/store/rules-slice";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import type { EditorRect, EditorRule } from "@/lib/editor/types";

export interface RuleControllerDeps {
  rulesStore?: typeof useRulesStore;
  historyStore?: typeof useHistoryStore;
  generateIds?: (n: number) => string[];
  imageBounds?: EditorRect;
}

export interface RuleController {
  undo(): void;
  redo(): void;
  selectAll(): void;
  duplicateSelected(mode?: "copy" | "reference"): string[];
  duplicate(ids: string[], mode?: "copy" | "reference"): string[];
  deleteRules(ids: string[]): void;
  reorderToIndex(id: string, targetIndex: number): void;
  moveSelection(direction: "up" | "down"): void;
  applySnapshot(snapshot: HistorySnapshot | RulesState): void;
}

export function createRuleController(deps: RuleControllerDeps = {}): RuleController {
  const rules = deps.rulesStore ?? useRulesStore;
  const history = deps.historyStore ?? useHistoryStore;
  const gen = deps.generateIds ?? nextRuleIds;
  const bounds = deps.imageBounds ?? IMAGE_BOUNDS;

  const apply = (snap: HistorySnapshot | RulesState) => rules.getState().applySnapshot(snap);

  // Step 91: every gesture opens a scoped log frame so all state transitions
  // it triggers share one correlation id. The gesture logger writes the
  // opening line (I_UI_GESTURE_*); the store still emits its own kind-level
  // logs so downstream analysis can group by correlation id.
  const gesture = (
    source: string,
    code: string,
    fields: Record<string, string | number | boolean | null> = {},
  ) => {
    const g = withGesture(nextGestureId(source));
    g.info(code, fields);

    return g;
  };

  return {
    undo() {
      gesture("shortcut", "I_UI_GESTURE_UNDO");
      history.getState().undo(apply);
    },
    redo() {
      gesture("shortcut", "I_UI_GESTURE_REDO");
      history.getState().redo(apply);
    },
    selectAll() {
      gesture("shortcut", "I_UI_GESTURE_SELECT_ALL");
      rules.getState().selectAllVisibleUnlocked();
    },
    duplicate(ids, mode) {
      if (ids.length === 0) return [];
      const newIds = gen(ids.length);
      gesture("controller", "I_UI_GESTURE_DUPLICATE", {
        count: ids.length,
        mode: mode ?? "copy",
      });
      rules.getState().duplicateRules(ids, { newIds, imageBounds: bounds, mode });

      return newIds;
    },
    duplicateSelected(mode) {
      const ids = rules.getState().selectedIds;

      return this.duplicate(ids, mode);
    },
    deleteRules(ids) {
      gesture("controller", "I_UI_GESTURE_DELETE", { count: ids.length });
      rules.getState().deleteRules(ids);
    },
    reorderToIndex(id, targetIndex) {
      gesture("controller", "I_UI_GESTURE_REORDER", { targetIndex });
      rules.getState().reorderRules([id], targetIndex);
    },
    moveSelection(direction) {
      const state = rules.getState();
      const id = state.selectedIds[0];

      if (!id) return;
      const idx = state.rules.findIndex((r: EditorRule) => r.id === id);

      if (idx < 0) return;
      // reorderRules removes the moving id from the "rest" list before
      // inserting, so the target index is relative to that shortened list.
      // Moving up 1 = insert at (idx - 1) in the rest list. Moving down 1
      // = insert at (idx + 1) in the rest, which after removal is (idx).
      if (direction === "up") {
        if (idx === 0) return;
        gesture("shortcut", "I_UI_GESTURE_MOVE_UP");
        rules.getState().reorderRules([id], idx - 1);
      } else {
        if (idx >= state.rules.length - 1) return;
        gesture("shortcut", "I_UI_GESTURE_MOVE_DOWN");
        rules.getState().reorderRules([id], idx + 1);
      }
    },
    applySnapshot(snap) {
      apply(snap);
    },
  };
}
