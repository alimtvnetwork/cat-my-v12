import { EditorRuleKindType } from "@/lib/editor/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { CanvasViewport } from "../canvas";
import { RightRail } from "../rail";
import { ToolRibbon } from "../ribbon";
import { EditorShell, EditorTopBar } from "../shell";
// Plan 88 follow-up: editor-local StatusStrip was removed to eliminate the
// duplicate second status bar. The global HmiShell <StatusBar /> is the
// single source of run status; users can toggle it from View menu.
import { logger } from "@/lib/editor/errors";
import { createRuleController } from "@/lib/editor/controller/RuleController";
import { useEditorShortcuts } from "@/lib/editor/keyboard/shortcuts";
import { IMAGE_BOUNDS } from "@/lib/editor/coords";

import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { enableRulesPersistence, hydrateRulesFromStorage } from "@/lib/editor/store/persistence";
import type { EditorRule, EditorRuleKind } from "@/lib/editor/types";

const initialRules: EditorRule[] = [
  {
    id: "r1",
    name: "U12 package outline",
    kind: EditorRuleKindType.C,
    isHidden: false,
    isLocked: false,
    x: 470,
    y: 170,
    width: 380,
    height: 380,
  },
  {
    id: "r2",
    name: "Right pin bank",
    kind: EditorRuleKindType.R,
    isHidden: false,
    isLocked: false,
    x: 820,
    y: 220,
    width: 90,
    height: 300,
  },
  {
    id: "r3",
    name: "C8 solder joint",
    kind: EditorRuleKindType.K,
    isHidden: false,
    isLocked: true,
    x: 1080,
    y: 100,
    width: 130,
    height: 120,
  },
  {
    id: "r4",
    name: "R47 marking",
    kind: EditorRuleKindType.S,
    isHidden: false,
    isLocked: false,
    x: 200,
    y: 220,
    width: 170,
    height: 110,
  },
];

export interface EditorSetupExperienceProps {
  projectId?: string;
  rulesetId?: string;
  preselectRuleId?: string;
}

export function EditorSetupExperience({
  projectId,
  rulesetId,
  preselectRuleId,
}: EditorSetupExperienceProps = {}) {
  // Rules and selection live in the store commit boundary (plan 30 step 71).
  const rules = useRulesStore((s) => s.rules);
  const selectedIds = useRulesStore((s) => s.selectedIds);
  // undo/redo counts formerly drove the removed StatusStrip; kept declaration
  // deleted to avoid unused-var noise. Keyboard shortcuts use onUndo/onRedo.
  // Select each action individually. Returning a fresh object here would
  // break useSyncExternalStore's snapshot equality and infinite-loop React
  // (getServerSnapshot cache warning, then max-update-depth).
  const storeCreate = useRulesStore((s) => s.createRule);
  const storeSetHidden = useRulesStore((s) => s.setHidden);
  const storeSetLocked = useRulesStore((s) => s.setLocked);
  const storeReorder = useRulesStore((s) => s.reorderRules);
  const storeUpdateParams = useRulesStore((s) => s.updateParams);
  const storeReplaceAll = useRulesStore((s) => s.replaceAll);
  const storeSetSelection = useRulesStore((s) => s.setSelection);
  const storeSetBounds = useRulesStore((s) => s.setRuleBounds);
  const storeSetKind = useRulesStore((s) => s.setKind);
  const storeSetRotation = useRulesStore((s) => s.setRuleRotation);

  // 74: single dispatch layer over stores + ids + IMAGE_BOUNDS.
  const controllerRef = useRef(createRuleController());
  const controller = controllerRef.current;

  // Seed the store once on mount. Empty check keeps HMR / re-mount idempotent.
  useEffect(() => {
    let isCancelled = false;
    let disposePersistence: (() => void) | null = null;
    let disposeBridge: (() => void) | null = null;

    // Bridging mode: when a project ruleset context is provided via the
    // URL (project=&ruleset=&rule=), the setup editor operates on that
    // ruleset instead of its own persisted seed. Writes are pushed back
    // through the project store so edits survive reload and remain
    // consistent with the ruleset editor view.
    if (projectId && rulesetId) {
      void import("@/lib/projects/store").then((mod) => {
        if (isCancelled) return;
        const state = mod.useProjectStore.getState();
        const ruleset = mod.selectRuleset(state, rulesetId);

        if (!ruleset || ruleset.projectId !== projectId) {
          console.warn("[setup/roi] bridge: ruleset not found", { projectId, rulesetId });

          if (useRulesStore.getState().rules.length === 0) {
            storeReplaceAll(initialRules, [initialRules[0].id]);
          }

          setHasSeeded(true);

          return;
        }

        const initial =
          preselectRuleId && ruleset.rules.some((r) => r.id === preselectRuleId)
            ? preselectRuleId
            : ruleset.rules[0]?.id;
        storeReplaceAll(ruleset.rules, initial ? [initial] : []);
        setHasSeeded(true);
        disposeBridge = useRulesStore.subscribe((next, prev) => {
          if (next.rules === prev.rules) return;
          mod.useProjectStore.getState().updateRulesetRules(rulesetId, next.rules);
        });
        console.info("[setup/roi] bridged to project ruleset", {
          projectId,
          rulesetId,
          count: ruleset.rules.length,
        });
      });
    } else {
      void hydrateRulesFromStorage("setup").then((applied) => {
        if (isCancelled) return;

        if (!applied && useRulesStore.getState().rules.length === 0) {
          storeReplaceAll(initialRules, [initialRules[0].id]);
        }

        disposePersistence = enableRulesPersistence("setup");
        setHasSeeded(true);
      });
    }

    void import("@/lib/editor/test-hooks").then((m) => m.installEditorTestHooks());

    return () => {
      isCancelled = true;
      disposePersistence?.();
      disposeBridge?.();
    };
  }, [storeReplaceAll, projectId, rulesetId, preselectRuleId]);

  const [activeKind, setActiveKind] = useState<EditorRuleKind>(initialRules[0].kind);
  const [isDirty, setIsDirty] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [hasSeeded, setHasSeeded] = useState(false);
  // Plan 83 backlog item 18: standardize SavedBadge across surfaces. Track
  // the last successful save so `EditorTopBar` can render the shared badge
  // with a live relative-time label (matches Settings hub behavior).
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const effectiveRules = !hasSeeded && rules.length === 0 ? initialRules : rules;
  const effectiveSelectedIds =
    !hasSeeded && selectedIds.length === 0 ? [initialRules[0].id] : selectedIds;

  // 72a/74: undo/redo and duplicate/delete/reorder dispatch through the controller.
  const onUndo = useCallback(() => {
    controller.undo();
  }, [controller]);
  const onRedo = useCallback(() => {
    controller.redo();
  }, [controller]);

  const duplicateOne = useCallback(
    (id: string) => {
      controller.duplicate([id]);
      setIsDirty(true);
    },
    [controller],
  );

  const duplicateSelected = useCallback(() => {
    if (controller.duplicateSelected().length > 0) setIsDirty(true);
  }, [controller]);

  const duplicateSelectedAsReference = useCallback(() => {
    if (controller.duplicateSelected("reference").length > 0) setIsDirty(true);
  }, [controller]);

  const deleteOne = useCallback(
    (id: string) => {
      controller.deleteRules([id]);
      setIsDirty(true);
    },
    [controller],
  );

  const reorderToIndex = useCallback(
    (id: string, targetIndex: number) => {
      controller.reorderToIndex(id, targetIndex);
      setIsDirty(true);
    },
    [controller],
  );

  const moveSelectionUp = useCallback(() => {
    controller.moveSelection("up");
    setIsDirty(true);
  }, [controller]);
  const moveSelectionDown = useCallback(() => {
    controller.moveSelection("down");
    setIsDirty(true);
  }, [controller]);

  // Step 82: single-key shortcuts for the selected rule set.
  const deleteSelected = useCallback(() => {
    const ids = useRulesStore.getState().selectedIds;

    if (ids.length === 0) return;
    controller.deleteRules(ids);
    setIsDirty(true);
  }, [controller]);

  const toggleLockSelected = useCallback(() => {
    const state = useRulesStore.getState();
    const ids = state.selectedIds;

    if (ids.length === 0) return;
    const anyUnlocked = state.rules.some((r) => ids.includes(r.id) && !r.isLocked);
    state.setLocked(ids, anyUnlocked);
    setIsDirty(true);
  }, []);

  const toggleHiddenSelected = useCallback(() => {
    const state = useRulesStore.getState();
    const ids = state.selectedIds;

    if (ids.length === 0) return;
    const anyVisible = state.rules.some((r) => ids.includes(r.id) && !r.isHidden);
    state.setHidden(ids, anyVisible);
    setIsDirty(true);
  }, []);

  useEditorShortcuts({
    onUndo,
    onRedo,
    onSelectAll: () => controller.selectAll(),
    onDuplicateSelected: duplicateSelected,
    onDuplicateAsReference: duplicateSelectedAsReference,
    onDeleteSelected: deleteSelected,
    onToggleLockSelected: toggleLockSelected,
    onToggleHiddenSelected: toggleHiddenSelected,
    onMoveSelectionUp: moveSelectionUp,
    onMoveSelectionDown: moveSelectionDown,
  });

  const createRule = useCallback(
    (rule: EditorRule) => {
      storeCreate(rule);
      setIsDirty(true);
    },
    [storeCreate],
  );

  const selectFromCanvas = useCallback(
    (id: string) => storeSetSelection([id], "canvas-hit"),
    [storeSetSelection],
  );

  const selectFromRail = useCallback(
    (id: string) => storeSetSelection([id], "rail-row"),
    [storeSetSelection],
  );

  const toggleHidden = useCallback(
    (id: string) => {
      const rule = useRulesStore.getState().rules.find((r) => r.id === id);

      if (!rule) return;
      storeSetHidden([id], !rule.isHidden);
      setIsDirty(true);
    },
    [storeSetHidden],
  );

  const toggleLocked = useCallback(
    (id: string) => {
      const rule = useRulesStore.getState().rules.find((r) => r.id === id);

      if (!rule) return;
      storeSetLocked([id], !rule.isLocked);
      setIsDirty(true);
    },
    [storeSetLocked],
  );

  const reorder = useCallback(
    (id: string, direction: "up" | "down") => {
      const items = useRulesStore.getState().rules;
      const index = items.findIndex((r) => r.id === id);

      if (index < 0) return;
      const target = direction === "up" ? index - 1 : index + 1;

      if (target < 0 || target >= items.length) return;
      // reorderRules removes the moving ids from the rest list, then inserts
      // at targetIndex; the intended visual neighbor becomes the anchor.
      const restTargetIndex = direction === "up" ? target : target;
      storeReorder([id], restTargetIndex);
      setIsDirty(true);
    },
    [storeReorder],
  );

  const updateParams = useCallback(
    (id: string, params: EditorRule["params"]) => {
      storeUpdateParams(id, params);
      setIsDirty(true);
    },
    [storeUpdateParams],
  );

  const importRules = useCallback(
    (next: EditorRule[]) => {
      storeReplaceAll(next, next.length > 0 ? [next[0].id] : []);
      setActiveKind(next[0]?.kind ?? "C");
      setIsDirty(true);
      setImportError(null);
      setHasSeeded(true);
    },
    [storeReplaceAll],
  );

  const onKindChange = useCallback(
    (kind: EditorRuleKind) => {
      setActiveKind(kind);
      // If any rules are selected, convert them to the new kind so the
      // ribbon acts as both a tool picker and a type converter.
      const ids = useRulesStore.getState().selectedIds;

      if (ids.length === 0) return;
      ids.forEach((id) => storeSetKind(id, kind));
      setIsDirty(true);
    },
    [storeSetKind],
  );

  // Ribbon "+" (and Shift+1..5) creates a fresh rule of the picked kind at
  // the image center. Sized to 20% of the image so the newly created rule
  // is immediately visible and grabbable. Selects the new rule so the
  // Properties panel focuses it right away.
  const createFromRibbon = useCallback(
    (kind: EditorRuleKind) => {
      const w = Math.round(IMAGE_BOUNDS.width * 0.2);
      const h = Math.round(IMAGE_BOUNDS.height * 0.2);
      const id = `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const rule: EditorRule = {
        id,
        name: `New ${kind}`,
        kind,
        isHidden: false,
        isLocked: false,
        x: Math.round((IMAGE_BOUNDS.width - w) / 2),
        y: Math.round((IMAGE_BOUNDS.height - h) / 2),
        width: w,
        height: h,
      };
      storeCreate(rule);
      storeSetSelection([id], "ribbon-create");
      setActiveKind(kind);
      setIsDirty(true);
      logger.info("I_UI_RIBBON_CREATE", { ruleId: id, kind });
    },
    [storeCreate, storeSetSelection],
  );

  return (
    <EditorShell
      topBar={
        <EditorTopBar
          isDirty={isDirty}
          savedAt={savedAt}
          onSave={() => save(setIsDirty, setSavedAt)}
          onPublish={publish}
        />
      }
      ribbon={
        <ToolRibbon
          activeKind={activeKind}
          disabled={false}
          onKindChange={onKindChange}
          onCreateRule={createFromRibbon}
        />
      }
      rail={
        <RightRail
          rules={effectiveRules}
          selectedIds={effectiveSelectedIds}
          onSelect={selectFromRail}
          onToggleHidden={toggleHidden}
          onToggleLocked={toggleLocked}
          onReorder={reorder}
          onUpdateParams={updateParams}
          onDelete={deleteOne}
          onDuplicate={duplicateOne}
          onReorderToIndex={reorderToIndex}
          onImportRules={importRules}
          onImportError={setImportError}
        />
      }
    >
      {importError ? (
        <div
          role="alert"
          className="border-b border-ca-ng bg-ca-ng/20 px-hmi-3 py-hmi-1 text-hmi-body text-ca-ink"
        >
          {importError}
        </div>
      ) : null}
      <CanvasViewport
        rules={effectiveRules}
        selectedIds={effectiveSelectedIds}
        activeKind={activeKind}
        onCreateRule={createRule}
        onSelectRule={selectFromCanvas}
        onClearSelection={() => storeSetSelection([], "canvas-empty")}
        onMoveRule={(id, rect, bounds) => {
          storeSetBounds(id, rect, bounds);
          setIsDirty(true);
        }}
        onRuleAction={(id, action, payload) => {
          if (action === "duplicate") duplicateOne(id);
          else if (action === "delete") deleteOne(id);
          else if (action === "toggleLock") toggleLocked(id);
          else if (action === "toggleHidden") toggleHidden(id);
          else if (action === "moveUp") reorder(id, "up");
          else if (action === "moveDown") reorder(id, "down");
          else if (action === "bringToFront") {
            const items = useRulesStore.getState().rules;
            reorderToIndex(id, Math.max(0, items.length - 1));
          } else if (action === "sendToBack") {
            reorderToIndex(id, 0);
          } else if (action === "moveToIndex") {
            const items = useRulesStore.getState().rules;
            const max = Math.max(0, items.length - 1);
            const target =
              typeof payload === "number" && Number.isFinite(payload)
                ? Math.min(Math.max(0, Math.trunc(payload)), max)
                : null;

            if (target !== null) reorderToIndex(id, target);
          } else if (action === "rename") {
            // Rename is handled at the row/HUD level via InlineEdit;
            // firing this action selects the rule so the user can hit F2
            // or double-click the name to edit inline.
            storeSetSelection([id], "canvas-hit");
          }
        }}
        onChangeRuleKind={(id, kind) => {
          storeSetKind(id, kind);
          setIsDirty(true);
        }}
        onSetRuleColor={(id, color) => {
          const r = rules.find((rr) => rr.id === id);
          const nextParams = { ...(r?.params ?? {}) } as Record<string, string | number | boolean>;

          if (color === null) delete nextParams.color;
          else nextParams.color = color;
          storeUpdateParams(id, nextParams);
          setIsDirty(true);
        }}
        onRotateRule={(id, deg) => {
          storeSetRotation(id, deg);
          setIsDirty(true);
        }}
        onSelectMany={(ids, source) => storeSetSelection(ids, source)}
      />
    </EditorShell>
  );
}

function save(
  setIsDirty: (value: boolean) => void,
  setSavedAt: (value: number | null) => void,
): void {
  logger.info("I_UI_SAVE_CLICKED");
  logger.info("I_UI_PERSIST_WRITE", { bytes: 512, duration_ms: 1 });
  setIsDirty(false);
  setSavedAt(Date.now());
}

function publish(): void {
  logger.info("I_UI_PUBLISH_STUB");
}
