// Plan 83 backlog item 21: shared live-region announcer.
//
// Root cause the file addresses: transient success signals like "Copied
// error details" fire only through sonner toasts + `console.info`, both of
// which are invisible to assistive tech that ignores toast portals. This
// module exposes a tiny store + `announce()` helper that pushes a message
// into an sr-only `role="status"` (polite) or `role="alert"` (assertive)
// region rendered by `LiveAnnouncer`. Side-effect free at import.

import { create } from "zustand";

export enum AnnouncePriorityType {
  Polite = "polite",
  Assertive = "assertive",
}
export type AnnouncePriority = AnnouncePriorityType;

interface AnnouncerState {
  polite: string;
  assertive: string;
  seq: number;
  announce: (message: string, priority?: AnnouncePriority) => void;
  clear: () => void;
}

export const useAnnouncerStore = create<AnnouncerState>((set, get) => ({
  polite: "",
  assertive: "",
  seq: 0,
  announce: (message, priority = AnnouncePriorityType.Polite) => {
    const trimmed = message.trim();

    if (!trimmed) return;
    const seq = get().seq + 1;
    // Prefix a zero-width space when the previous message equals the new
    // one so screen readers re-announce identical strings.
    const prev = priority === "assertive" ? get().assertive : get().polite;
    const value = prev === trimmed ? `\u200B${trimmed}` : trimmed;

    if (priority === "assertive") set({ assertive: value, seq });
    else set({ polite: value, seq });
    console.info(`[a11y announce ${priority}] ${trimmed}`);
  },
  clear: () => set({ polite: "", assertive: "" }),
}));

export function announce(
  message: string,
  priority: AnnouncePriority = AnnouncePriorityType.Polite,
): void {
  useAnnouncerStore.getState().announce(message, priority);
}
