import { EditorToolFamilyType } from "@/lib/editor/types";
// Rule-layer store slice, plan 30 step 71.
// Spec: spec/24-app-ui-design-system/_notes/rule-layer-store-hardening.md
//
// Pure reducers only. No Date.now / Math.random / crypto (G-STORE-03).
// New ids and image bounds are injected by the caller so reducers stay pure
// and deterministic under test.
import { create } from "zustand";
import { logger } from "../errors";
import { hydrateRuleSetForStore } from "../migrations";
import type { EditorRect, EditorRule } from "../types";
import { recordRuleHistory, recordRuleHistoryCoalesced } from "./history-slice";
import type { HistoryKind, RuleGroup } from "./history-types";

export type { RuleGroup } from "./history-types";

export interface RulesState {
  rules: EditorRule[];
  selectedIds: string[];
  groups: RuleGroup[];
}

export interface DuplicateOptions {
  newIds: string[];
  imageBounds: EditorRect;
  offsetPx?: number;
  /**
   * Plan 67 step 23. "copy" (default) deep-copies params only. "reference"
   * additionally stamps `sourceRuleId` on each new rule so downstream
   * consumers (mask source, positional anchor) can follow the chain.
   */
  mode?: "copy" | "reference";
}

const DEFAULT_OFFSET_PX = 16;

function joinIds(ids: readonly string[]): string {
  return ids.join(",");
}

function hasSnapshotData(state: RulesState): boolean {
  return state.rules.length > 0 || state.selectedIds.length > 0;
}

function recordHistory(kind: HistoryKind, before: RulesState, after: RulesState): void {
  recordRuleHistory(kind, before, after);
}

function pruneSelection(selectedIds: readonly string[], rules: readonly EditorRule[]): string[] {
  const present = new Set(rules.map((r) => r.id));

  return selectedIds.filter((id) => present.has(id));
}

function pruneGroups(groups: readonly RuleGroup[], rules: readonly EditorRule[]): RuleGroup[] {
  const present = new Set(rules.map((r) => r.id));
  const out: RuleGroup[] = [];
  for (const g of groups) {
    const kept = g.ruleIds.filter((id) => present.has(id));

    if (kept.length === 0) continue;
    out.push({ ...g, ruleIds: kept });
  }

  return out;
}

function clampRect(rect: EditorRect, bounds: EditorRect): EditorRect {
  const maxX = bounds.x + bounds.width - rect.width;
  const maxY = bounds.y + bounds.height - rect.height;

  return {
    x: Math.min(Math.max(rect.x, bounds.x), Math.max(bounds.x, maxX)),
    y: Math.min(Math.max(rect.y, bounds.y), Math.max(bounds.y, maxY)),
    width: rect.width,
    height: rect.height,
  };
}

// I-1: rule.id stable. I-4: no geometry mutation from lock toggle.
export function applySetLocked(
  state: RulesState,
  ruleIds: readonly string[],
  locked: boolean,
): RulesState {
  const targets = new Set(ruleIds);
  let hasChanged = false;
  const rules = state.rules.map((r) => {
    if (targets.has(r.id) === false || r.isLocked === locked) return r;
    hasChanged = true;

    return { ...r, isLocked: locked };
  });

  if (!hasChanged) return state;

  return { rules, selectedIds: pruneSelection(state.selectedIds, rules), groups: state.groups };
}

export function applySetHidden(
  state: RulesState,
  ruleIds: readonly string[],
  hidden: boolean,
): RulesState {
  const targets = new Set(ruleIds);
  let hasChanged = false;
  const rules = state.rules.map((r) => {
    if (targets.has(r.id) === false || r.isHidden === hidden) return r;
    hasChanged = true;

    return { ...r, isHidden: hidden };
  });

  if (!hasChanged) return state;
  // If newly hidden, drop from selection in the same commit.
  const selectedIds = hidden
    ? state.selectedIds.filter((id) => targets.has(id) === false)
    : state.selectedIds;

  return { rules, selectedIds: pruneSelection(selectedIds, rules), groups: state.groups };
}

export interface DeleteResult {
  next: RulesState;
  refusedIds: string[];
}

export function applyDeleteRules(state: RulesState, ruleIds: readonly string[]): DeleteResult {
  const targets = new Set(ruleIds);
  const refusedIds: string[] = [];
  const keep: EditorRule[] = [];
  for (const r of state.rules) {
    if (targets.has(r.id) === false) {
      keep.push(r);
      continue;
    }

    if (r.isLocked) {
      refusedIds.push(r.id);
      keep.push(r);
    }
  }

  const removedAny = keep.length !== state.rules.length;

  if (!removedAny && refusedIds.length === 0) {
    return { next: state, refusedIds };
  }

  return {
    next: {
      rules: keep,
      selectedIds: pruneSelection(state.selectedIds, keep),
      groups: pruneGroups(state.groups, keep),
    },
    refusedIds,
  };
}

export function applyDuplicateRules(
  state: RulesState,
  ruleIds: readonly string[],
  options: DuplicateOptions,
): RulesState {
  const offset = options.offsetPx ?? DEFAULT_OFFSET_PX;
  const sourceOrder: number[] = [];
  state.rules.forEach((r, idx) => {
    if (ruleIds.includes(r.id)) sourceOrder.push(idx);
  });

  if (sourceOrder.length === 0) return state;

  if (options.newIds.length !== sourceOrder.length) {
    throw new Error("E_UI_DUPLICATE_ID_COUNT_MISMATCH");
  }

  // Build the new rules in source order so newIds map 1:1.
  const newRules: EditorRule[] = sourceOrder.map((idx, i) => {
    const src = state.rules[idx];
    const shifted = clampRect(
      { x: src.x + offset, y: src.y + offset, width: src.width, height: src.height },
      options.imageBounds,
    );
    const clone: EditorRule = {
      ...src,
      id: options.newIds[i],
      x: shifted.x,
      y: shifted.y,
    };

    if (options.mode === "reference") {
      // Chain to the true origin: if the source itself is a reference,
      // follow up one level so hover tooltips resolve without a walk.
      clone.sourceRuleId = src.sourceRuleId ?? src.id;
    } else {
      delete clone.sourceRuleId;
    }

    return clone;
  });

  // Insert each clone directly above (higher index than) its source.
  // Process from bottom (lowest source index) so later inserts do not shift earlier ones.
  const out = state.rules.slice();
  let shift = 0;
  sourceOrder.forEach((idx, i) => {
    out.splice(idx + 1 + shift, 0, newRules[i]);
    shift += 1;
  });

  return { rules: out, selectedIds: newRules.map((r) => r.id), groups: state.groups };
}

export function applyReorderRules(
  state: RulesState,
  ruleIds: readonly string[],
  targetIndex: number,
): RulesState {
  const moving: EditorRule[] = [];
  const rest: EditorRule[] = [];
  // Preserve original relative order within the moved set.
  for (const r of state.rules) {
    if (ruleIds.includes(r.id)) moving.push(r);
    else rest.push(r);
  }

  if (moving.length === 0) return state;
  const clamped = Math.min(Math.max(targetIndex, 0), rest.length);
  const out = [...rest.slice(0, clamped), ...moving, ...rest.slice(clamped)];

  return { rules: out, selectedIds: pruneSelection(state.selectedIds, out), groups: state.groups };
}

export function applySelectAllVisibleUnlocked(state: RulesState): RulesState {
  const next = state.rules.filter((r) => !r.isHidden && !r.isLocked).map((r) => r.id);
  const same =
    next.length === state.selectedIds.length && next.every((id, i) => id === state.selectedIds[i]);

  if (same) return state;

  return { ...state, selectedIds: next };
}

export function applyReplaceAll(
  state: RulesState,
  rules: readonly EditorRule[],
  selectedIds?: readonly string[],
  groups?: readonly RuleGroup[],
): RulesState {
  const nextRules = rules.slice();
  const seed = selectedIds ?? (nextRules[0] ? [nextRules[0].id] : []);
  const seedGroups = groups ? groups.map((g) => ({ ...g, ruleIds: g.ruleIds.slice() })) : [];

  return {
    rules: nextRules,
    selectedIds: pruneSelection(seed, nextRules),
    groups: pruneGroups(seedGroups, nextRules),
  };
}

export function applyCreateRule(state: RulesState, rule: EditorRule): RulesState {
  if (state.rules.some((r) => r.id === rule.id)) {
    throw new Error("E_UI_CREATE_DUPLICATE_ID");
  }

  return { rules: [...state.rules, rule], selectedIds: [rule.id], groups: state.groups };
}

export function applyUpdateParams(
  state: RulesState,
  ruleId: string,
  params: EditorRule["params"],
): RulesState {
  let hasChanged = false;
  const rules = state.rules.map((r) => {
    if (r.id !== ruleId) return r;
    hasChanged = true;

    return { ...r, params };
  });

  if (!hasChanged) return state;

  return { ...state, rules };
}

export function applySetKind(
  state: RulesState,
  ruleId: string,
  kind: EditorRule["kind"],
): RulesState {
  let hasChanged = false;
  const rules = state.rules.map((r) => {
    if (r.id !== ruleId || r.kind === kind) return r;
    hasChanged = true;
    const family: EditorRule["family"] =
      kind === "C" || kind === "R" ? EditorToolFamilyType.Rect : EditorToolFamilyType.Anchor;

    return { ...r, kind, family };
  });

  if (!hasChanged) return state;

  return { ...state, rules };
}

export function applySetName(state: RulesState, ruleId: string, name: string): RulesState {
  const trimmed = name.trim();

  if (!trimmed) return state;
  let hasChanged = false;
  const rules = state.rules.map((r) => {
    if (r.id !== ruleId || r.name === trimmed) return r;
    hasChanged = true;

    return { ...r, name: trimmed };
  });

  if (!hasChanged) return state;

  return { ...state, rules };
}

export function applySetBounds(
  state: RulesState,
  ruleId: string,
  rect: EditorRect,
  imageBounds: EditorRect,
): RulesState {
  let hasChanged = false;
  const rules = state.rules.map((r) => {
    if (r.id !== ruleId || r.isLocked) return r;
    const clamped = clampRect(
      { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      imageBounds,
    );

    if (
      r.x === clamped.x &&
      r.y === clamped.y &&
      r.width === clamped.width &&
      r.height === clamped.height
    )

      return r;
    hasChanged = true;

    return { ...r, x: clamped.x, y: clamped.y, width: clamped.width, height: clamped.height };
  });

  if (!hasChanged) return state;

  return { ...state, rules };
}

// ----- Commit boundary: emits one log line per action, wraps pure reducers.

export interface RulesActions {
  setLocked: (ruleIds: string[], locked: boolean) => void;
  setHidden: (ruleIds: string[], hidden: boolean) => void;
  deleteRules: (ruleIds: string[]) => void;
  duplicateRules: (ruleIds: string[], options: DuplicateOptions) => void;
  reorderRules: (ruleIds: string[], targetIndex: number) => void;
  reorderRule: (sourceId: string, targetId: string, position: ReorderPosition) => void;
  groupSelected: (groupId: string, name: string) => void;
  ungroup: (groupIds: string[]) => void;
  mergeSelected: () => MergeResult["reason"];
  selectAllVisibleUnlocked: () => void;
  replaceAll: (rules: EditorRule[], selectedIds?: string[], groups?: RuleGroup[]) => void;
  createRule: (rule: EditorRule) => void;
  updateParams: (ruleId: string, params: EditorRule["params"]) => void;
  setKind: (ruleId: string, kind: EditorRule["kind"]) => void;
  setRuleName: (ruleId: string, name: string) => void;
  setSelection: (ids: string[], source: string) => void;
  setRuleBounds: (ruleId: string, rect: EditorRect, imageBounds: EditorRect) => void;
  /**
   * Plan 79 step 36: persist ROI rotation (degrees, cw, normalised to
   * `(-180, 180]`). No-op when the angle is unchanged; coalesces with
   * bounds edits so a drag-rotate produces one undo entry.
   */
  setRuleRotation: (ruleId: string, degrees: number) => void;
  applySnapshot: (snapshot: RulesState) => void;
  __resetForTests: (state?: Partial<RulesState>) => void;
}

export type RulesStore = RulesState & RulesActions;

// ---------- Plan 35 step 7: group + reorder-with-position reducers ----------

export enum ReorderPositionType {
  Before = "before",
  After = "after",
  Into = "into",
}
export type ReorderPosition = ReorderPositionType;

export function applyReorderRule(
  state: RulesState,
  sourceId: string,
  targetId: string,
  position: ReorderPosition,
): RulesState {
  if (sourceId === targetId) return state;
  const srcIdx = state.rules.findIndex((r) => r.id === sourceId);
  const tgtIdx = state.rules.findIndex((r) => r.id === targetId);

  if (srcIdx < 0 || tgtIdx < 0) return state;
  const src = state.rules[srcIdx];
  const without = state.rules.filter((r) => r.id !== sourceId);
  const anchor = without.findIndex((r) => r.id === targetId);
  const insertAt = position === "before" ? anchor : anchor + 1;
  const rules = [...without.slice(0, insertAt), src, ...without.slice(insertAt)];
  let groups = state.groups.map((g) => ({
    ...g,
    ruleIds: g.ruleIds.filter((id) => id !== sourceId),
  }));

  if (position === "into") {
    const containing = groups.find((g) => g.ruleIds.includes(targetId));

    if (containing) {
      containing.ruleIds = [...containing.ruleIds, sourceId];
    }
  }

  groups = pruneGroups(groups, rules);

  return { rules, selectedIds: pruneSelection(state.selectedIds, rules), groups };
}

export function applyGroupSelected(state: RulesState, groupId: string, name: string): RulesState {
  const ids = state.selectedIds.filter((id) => state.rules.some((r) => r.id === id));

  if (ids.length < 2) return state;
  // Strip these ids out of any existing group.
  const stripped = state.groups.map((g) => ({
    ...g,
    ruleIds: g.ruleIds.filter((id) => ids.includes(id) === false),
  }));
  const next: RuleGroup = { id: groupId, name, ruleIds: ids.slice() };
  const groups = pruneGroups([...stripped, next], state.rules);

  return { ...state, groups };
}

export function applyUngroup(state: RulesState, groupIds: readonly string[]): RulesState {
  if (groupIds.length === 0) return state;
  const targets = new Set(groupIds);
  const groups = state.groups.filter((g) => targets.has(g.id) === false);

  if (groups.length === state.groups.length) return state;

  return { ...state, groups };
}

export interface MergeResult {
  next: RulesState;
  mergedId: string | null;
  reason: "ok" | "too-few" | "mixed-kind";
}

export function applyMergeSelected(state: RulesState): MergeResult {
  const ids = state.selectedIds.filter((id) => state.rules.some((r) => r.id === id));

  if (ids.length < 2) return { next: state, mergedId: null, reason: "too-few" };
  const picks = ids.map((id) => state.rules.find((r) => r.id === id)!).filter(Boolean);
  const kind = picks[0].kind;

  if (picks.every((r) => r.kind === kind) === false) {
    return { next: state, mergedId: null, reason: "mixed-kind" };
  }
  // Union bounding box, keep first rule's id and params.
  const minX = Math.min(...picks.map((r) => r.x));
  const minY = Math.min(...picks.map((r) => r.y));
  const maxX = Math.max(...picks.map((r) => r.x + r.width));
  const maxY = Math.max(...picks.map((r) => r.y + r.height));
  const keep = { ...picks[0], x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  const dropIds = new Set(ids.slice(1));
  const rules = state.rules
    .filter((r) => dropIds.has(r.id) === false)
    .map((r) => (r.id === keep.id ? keep : r));
  const groups = pruneGroups(
    state.groups.map((g) => ({
      ...g,
      ruleIds: g.ruleIds.filter((id) => dropIds.has(id) === false),
    })),
    rules,
  );

  return {
    next: { rules, selectedIds: [keep.id], groups },
    mergedId: keep.id,
    reason: "ok",
  };
}

const INITIAL_STATE: RulesState = { rules: [], selectedIds: [], groups: [] };

export const useRulesStore = create<RulesStore>((set, get) => ({
  ...INITIAL_STATE,

  setLocked: (ruleIds, locked) => {
    const before = get();
    const next = applySetLocked(before, ruleIds, locked);

    if (next === before) return;
    set(next);
    recordHistory("layout.toggle", before, next);
    logger.info(locked ? "I_UI_RULES_LOCKED" : "I_UI_RULES_UNLOCKED", {
      ruleIds: joinIds(ruleIds),
    });
  },

  setHidden: (ruleIds, hidden) => {
    const before = get();
    const next = applySetHidden(before, ruleIds, hidden);

    if (next === before) return;
    set(next);
    recordHistory("layout.toggle", before, next);
    logger.info(hidden ? "I_UI_RULES_HIDDEN" : "I_UI_RULES_SHOWN", { ruleIds: joinIds(ruleIds) });
  },

  deleteRules: (ruleIds) => {
    const before = get();
    const { next, refusedIds } = applyDeleteRules(before, ruleIds);
    const deletedIds = ruleIds.filter((id) => refusedIds.includes(id) === false);

    if (next !== before) set(next);

    if (deletedIds.length > 0) recordHistory("rule.delete", before, next);

    if (deletedIds.length > 0) {
      logger.info("I_UI_RULES_DELETED", { ruleIds: joinIds(deletedIds) });
    }

    if (refusedIds.length > 0) {
      logger.warn("W_UI_RULE_DELETE_REFUSED", { ruleIds: joinIds(refusedIds), reason: "locked" });
    }
  },

  duplicateRules: (ruleIds, options) => {
    const before = get();
    const next = applyDuplicateRules(before, ruleIds, options);

    if (next === before) return;
    set(next);
    recordHistory("rule.create", before, next);
    logger.info("I_UI_RULES_DUPLICATED", {
      ruleIds: joinIds(options.newIds),
      mode: options.mode ?? "copy",
    });
  },

  reorderRules: (ruleIds, targetIndex) => {
    const before = get();
    const next = applyReorderRules(before, ruleIds, targetIndex);

    if (next === before) return;
    set(next);
    recordHistory("rule.reorder", before, next);
    logger.info("I_UI_RULES_REORDERED", { ruleIds: joinIds(ruleIds), targetIndex });
  },

  reorderRule: (sourceId, targetId, position) => {
    const before = get();
    const next = applyReorderRule(before, sourceId, targetId, position);

    if (next === before) return;
    set(next);
    recordHistory("rule.reorder", before, next);
    logger.info("I_UI_RULE_REORDERED", { sourceId, targetId, position });
  },

  groupSelected: (groupId, name) => {
    const before = get();
    const next = applyGroupSelected(before, groupId, name);

    if (next === before) return;
    set(next);
    recordHistory("layer.group", before, next);
    logger.info("I_UI_LAYER_GROUPED", { groupId });
  },

  ungroup: (groupIds) => {
    const before = get();
    const next = applyUngroup(before, groupIds);

    if (next === before) return;
    set(next);
    recordHistory("layer.ungroup", before, next);
    logger.info("I_UI_LAYER_UNGROUPED", { groupIds: joinIds(groupIds) });
  },

  mergeSelected: () => {
    const before = get();
    const result = applyMergeSelected(before);

    if (result.next === before) {
      logger.warn("W_UI_LAYER_MERGE_REJECTED", { reason: result.reason });

      return result.reason;
    }

    set(result.next);
    recordHistory("layer.merge", before, result.next);
    logger.info("I_UI_LAYER_MERGED", { mergedId: result.mergedId ?? "" });

    return result.reason;
  },

  selectAllVisibleUnlocked: () => {
    const next = applySelectAllVisibleUnlocked(get());

    if (next === get()) return;
    set(next);
  },

  replaceAll: (rules, selectedIds, groups) => {
    const before = get();
    // Defensive: run forward-only v1 -> v2 migration at the store boundary so
    // any caller (import path, future persist middleware, tests) commits a v2
    // shape. Idempotent for already-v2 rules.
    const migrated = hydrateRuleSetForStore(rules);
    const next = applyReplaceAll(before, migrated, selectedIds, groups);
    set(next);

    if (hasSnapshotData(before)) recordHistory("rule.create", before, next);
    logger.info("I_UI_RULES_REPLACED", { count: migrated.length, groups: groups?.length ?? 0 });
  },

  createRule: (rule) => {
    const before = get();
    const next = applyCreateRule(before, rule);
    set(next);
    recordHistory("rule.create", before, next);
    logger.info("I_UI_RULE_CREATED", { ruleId: rule.id });
  },

  updateParams: (ruleId, params) => {
    const before = get();
    const next = applyUpdateParams(before, ruleId, params);

    if (next === before) return;
    set(next);
    // Coalesce consecutive edits to the same rule within PARAMS_COALESCE_MS
    // so slider drags produce ONE undo entry instead of dozens (step 88).
    recordRuleHistoryCoalesced("params.edit", before, next, `params.edit:${ruleId}`);
    logger.info("I_UI_RULE_PARAMS_CHANGED", { ruleId });
  },

  setKind: (ruleId, kind) => {
    const before = get();
    const next = applySetKind(before, ruleId, kind);

    if (next === before) return;
    set(next);
    recordHistory("rule.kind-switch", before, next);
    logger.info("I_UI_RULE_KIND_CHANGED", { ruleId, nextKind: kind });
  },

  setRuleName: (ruleId, name) => {
    const before = get();
    const next = applySetName(before, ruleId, name);

    if (next === before) return;
    set(next);
    recordRuleHistoryCoalesced("params.edit", before, next, `name.edit:${ruleId}`);
    logger.info("I_UI_RULE_RENAMED", { ruleId });
  },

  setSelection: (ids, source) => {
    const cur = get().selectedIds;
    const same = ids.length === cur.length && ids.every((id, i) => id === cur[i]);

    if (same) return;
    set({ ...get(), selectedIds: ids });
    logger.info("I_UI_SELECTION_CHANGED", { count: ids.length, source });
  },

  setRuleBounds: (ruleId, rect, imageBounds) => {
    const before = get();
    const next = applySetBounds(before, ruleId, rect, imageBounds);

    if (next === before) return;
    set(next);
    recordRuleHistoryCoalesced("layout.toggle", before, next, `bounds.edit:${ruleId}`);
    logger.info("I_UI_RULE_BOUNDS_CHANGED", {
      ruleId,
      x: rect.x,
      y: rect.y,
      w: rect.width,
      h: rect.height,
    });
  },

  setRuleRotation: (ruleId, degrees) => {
    const before = get();
    const idx = before.rules.findIndex((r) => r.id === ruleId);

    if (idx === -1) return;
    // Normalise once at the reducer boundary so consumers never observe
    // an out-of-range angle.
    let d = ((degrees + 180) % 360) - 180;

    if (d <= -180) d += 360;
    const cur = before.rules[idx].rotation ?? 0;

    if (Math.abs(cur - d) < 1e-6) return;
    const nextRules = before.rules.slice();
    nextRules[idx] = { ...nextRules[idx], rotation: d };
    const next = { ...before, rules: nextRules };
    set(next);
    recordRuleHistoryCoalesced("layout.toggle", before, next, `rotate.edit:${ruleId}`);
    logger.info("I_UI_RULE_ROTATED", { ruleId, degrees: d });
  },

  applySnapshot: (snapshot) => {
    set({
      rules: snapshot.rules.slice(),
      selectedIds: snapshot.selectedIds.slice(),
      groups: (snapshot.groups ?? []).map((g) => ({ ...g, ruleIds: g.ruleIds.slice() })),
    });
  },

  __resetForTests: (state) => {
    set({ ...INITIAL_STATE, ...state });
  },
}));
