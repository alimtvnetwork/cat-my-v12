import {
  PARAMS_COALESCE_MS,
  UNDO_CAPACITY,
  type HistoryApplyResult,
  type HistoryEntry,
  type HistoryState,
} from "./history-types";

export const INITIAL_HISTORY_STATE: HistoryState = { past: [], future: [] };

export function selectUndoCount(state: HistoryState): number {
  return state.past.length;
}

export function selectRedoCount(state: HistoryState): number {
  return state.future.length;
}

export function applyPushHistory(state: HistoryState, entry: HistoryEntry): HistoryState {
  const key = entry.coalesceKey;
  const last = state.past[state.past.length - 1];
  const isCoalescable =
    key !== undefined && last?.coalesceKey === key && entry.at - last.at < PARAMS_COALESCE_MS;

  if (isCoalescable) {
    const merged: HistoryEntry = { ...last, at: entry.at, after: entry.after };
    const past = [...state.past.slice(0, -1), merged];

    return { past, future: [] };
  }

  const past = [...state.past, entry].slice(-UNDO_CAPACITY);

  return { past, future: [] };
}

export function applyUndoHistory(state: HistoryState): HistoryApplyResult {
  if (state.past.length === 0) return { state, entry: null };
  const entry = state.past[state.past.length - 1];
  const past = state.past.slice(0, -1);
  const future = [entry, ...state.future].slice(0, UNDO_CAPACITY);

  return { state: { past, future }, entry };
}

export function applyRedoHistory(state: HistoryState): HistoryApplyResult {
  if (state.future.length === 0) return { state, entry: null };
  const entry = state.future[0];
  const future = state.future.slice(1);
  const past = [...state.past, entry].slice(-UNDO_CAPACITY);

  return { state: { past, future }, entry };
}
