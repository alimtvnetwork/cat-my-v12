import type { EditorRule } from "../types";

// Photoshop-like grouping (Plan 35). Additive: legacy snapshots without
// `groups` are hydrated to `[]` at load time.
export interface RuleGroup {
  id: string;
  name: string;
  ruleIds: string[];
  collapsed?: boolean;
}

export const UNDO_CAPACITY = 50;
// Coalesce window for same-key rapid edits (e.g. slider drags, typing in a
// panel field). Bumped from 400ms so consecutive edits on the same rule
// keep folding into one undo entry even with short thinking pauses between
// keystrokes / slider ticks.
export const PARAMS_COALESCE_MS = 1500;

export const HISTORY_KINDS = [
  "rule.create",
  "rule.delete",
  "rule.reorder",
  "rule.kind-switch",
  "shape.transform",
  "shape.commit",
  "params.edit",
  "layout.toggle",
  "layer.group",
  "layer.ungroup",
  "layer.merge",
] as const;

export type HistoryKind = (typeof HISTORY_KINDS)[number];

export interface HistorySnapshot {
  rules: EditorRule[];
  selectedIds: string[];
  groups: RuleGroup[];
}

export interface HistoryEntry {
  id: string;
  kind: HistoryKind;
  at: number;
  before: HistorySnapshot;
  after: HistorySnapshot;
  // Optional grouping key for coalescing (plan 30 step 88).
  // Two consecutive entries with the same key within PARAMS_COALESCE_MS
  // collapse: the `before` snapshot of the earlier entry is preserved,
  // the `after` snapshot is replaced with the latest.
  coalesceKey?: string;
}

export interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
}

export interface HistoryApplyResult {
  state: HistoryState;
  entry: HistoryEntry | null;
}

export type ApplyHistorySnapshot = (snapshot: HistorySnapshot) => void;
