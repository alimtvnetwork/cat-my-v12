// Plan 83 backlog 18b. Tiny observable timestamp for "last committed to
// project store" so the RuleEditor toolbar can render a shared
// <SavedBadge/>. This store is intentionally minimal: presentation-only,
// no facade coupling, no history. Producers call `markSaved()` when they
// have durably persisted rule state (route-level subscription already
// funnels through `updateRulesetRules`); consumers read `useSaveStatus`.
import { create } from "zustand";

interface SaveStatusState {
  savedAt: number | null;
  markSaved: (at?: number) => void;
  reset: () => void;
}

export const useSaveStatus = create<SaveStatusState>((set) => ({
  savedAt: null,
  markSaved: (at?: number) => set({ savedAt: at ?? Date.now() }),
  reset: () => set({ savedAt: null }),
}));

export function markSaved(at?: number): void {
  useSaveStatus.getState().markSaved(at);
}
