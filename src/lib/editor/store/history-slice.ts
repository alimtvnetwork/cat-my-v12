import { create } from "zustand";
import { logger } from "../errors";
import {
  applyPushHistory,
  applyRedoHistory,
  applyUndoHistory,
  INITIAL_HISTORY_STATE,
  selectRedoCount,
  selectUndoCount,
} from "./history-reducers";
import type {
  ApplyHistorySnapshot,
  HistoryEntry,
  HistoryKind,
  HistorySnapshot,
  HistoryState,
} from "./history-types";

export {
  HISTORY_KINDS,
  PARAMS_COALESCE_MS,
  UNDO_CAPACITY,
  type HistoryEntry,
  type HistoryKind,
} from "./history-types";
export { selectRedoCount, selectUndoCount } from "./history-reducers";

interface HistoryActions {
  pushEntry: (entry: HistoryEntry) => void;
  undo: (applySnapshot: ApplyHistorySnapshot) => void;
  redo: (applySnapshot: ApplyHistorySnapshot) => void;
  __resetForTests: (state?: Partial<HistoryState>) => void;
}

type HistoryStore = HistoryState & HistoryActions;

let historySequence = 0;

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  ...INITIAL_HISTORY_STATE,
  pushEntry: (entry) => set(applyPushHistory(get(), entry)),
  undo: (applySnapshot) => applyUndo(set, get, applySnapshot),
  redo: (applySnapshot) => applyRedo(set, get, applySnapshot),
  __resetForTests: (state) => set({ ...INITIAL_HISTORY_STATE, ...state }),
}));

export function recordRuleHistory(
  kind: HistoryKind,
  before: HistorySnapshot,
  after: HistorySnapshot,
): void {
  useHistoryStore.getState().pushEntry(makeEntry(kind, before, after));
}

export function recordRuleHistoryCoalesced(
  kind: HistoryKind,
  before: HistorySnapshot,
  after: HistorySnapshot,
  coalesceKey: string,
): void {
  const entry = makeEntry(kind, before, after);
  useHistoryStore.getState().pushEntry({ ...entry, coalesceKey });
}

function makeEntry(
  kind: HistoryKind,
  before: HistorySnapshot,
  after: HistorySnapshot,
): HistoryEntry {
  historySequence += 1;

  return {
    id: `h-${historySequence}`,
    kind,
    at: Date.now(),
    before: cloneSnapshot(before),
    after: cloneSnapshot(after),
  };
}

function cloneSnapshot(snapshot: HistorySnapshot): HistorySnapshot {
  
  return {
    rules: snapshot.rules.slice(),
    selectedIds: snapshot.selectedIds.slice(),
    groups: snapshot.groups.map((g) => ({ ...g, ruleIds: g.ruleIds.slice() })),
  };
}

function applyUndo(
  set: (state: HistoryState) => void,
  get: () => HistoryStore,
  applySnapshot: ApplyHistorySnapshot,
): void {
  const result = applyUndoHistory(get());

  if (result.entry === null) return;
  set(result.state);
  applySnapshot(result.entry.before);
  logger.info("I_UI_UNDO", { kind: result.entry.kind, remaining: selectUndoCount(result.state) });
}

function applyRedo(
  set: (state: HistoryState) => void,
  get: () => HistoryStore,
  applySnapshot: ApplyHistorySnapshot,
): void {
  const result = applyRedoHistory(get());

  if (result.entry === null) return;
  set(result.state);
  applySnapshot(result.entry.after);
  logger.info("I_UI_REDO", { kind: result.entry.kind, remaining: selectRedoCount(result.state) });
}
