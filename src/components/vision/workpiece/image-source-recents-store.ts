import { create } from "zustand";

export type RecentImageKind = "upload" | "camera";

export interface RecentImageSource {
  id: string;
  dataUrl: string;
  label: string;
  kind: RecentImageKind;
  capturedAt: number;
}

/** Keep the last N used image sources (uploads + camera captures). */
export const MAX_RECENT_IMAGE_SOURCES = 5;

interface ImageSourceRecentsState {
  recents: RecentImageSource[];
  pushRecent: (entry: { dataUrl: string; label: string; kind: RecentImageKind }) => void;
  removeRecent: (id: string) => void;
}

export const useImageSourceRecentsStore = create<ImageSourceRecentsState>()((set) => ({
  recents: [],
  pushRecent: (entry) =>
    set((state) => {
      // Move to front if already cached; otherwise prepend and trim to the cap.
      const withoutDup = state.recents.filter((r) => r.dataUrl !== entry.dataUrl);
      const next = [
        {
          ...entry,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          capturedAt: Date.now(),
        },
        ...withoutDup,
      ].slice(0, MAX_RECENT_IMAGE_SOURCES);

      return { recents: next };
    }),
  removeRecent: (id) =>
    set((state) => ({ recents: state.recents.filter((recent) => recent.id !== id) })),
}));
