// Favorites store: pinned nav routes shown in FavoritesBar. Persisted
// to localStorage so the user's picks survive reloads. Route strings
// mirror the MenuRoute union in TopMenuBar; we keep this loose (string)
// so users can add any app path without a code change.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createFacadeStateStorage } from "@/lib/projects/facade";
import { wireCrossTabRehydrate } from "@/lib/projects/cross-tab";

export interface FavoriteEntry {
  to: string;
  label: string;
}

interface FavoritesState {
  favorites: FavoriteEntry[];
  add: (entry: FavoriteEntry) => void;
  remove: (to: string) => void;
  toggle: (entry: FavoriteEntry) => void;
  reset: () => void;
}

const DEFAULTS: FavoriteEntry[] = [
  { to: "/", label: "Home" },
  { to: "/projects", label: "Projects" },
  { to: "/run", label: "Live run" },
  { to: "/results", label: "Results" },
];

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: DEFAULTS,
      add: (entry) => {
        if (get().favorites.some((f) => f.to === entry.to)) return;
        set({ favorites: [...get().favorites, entry] });
      },
      remove: (to) => set({ favorites: get().favorites.filter((f) => f.to !== to) }),
      toggle: (entry) => {
        const exists = get().favorites.some((f) => f.to === entry.to);

        if (exists) get().remove(entry.to);
        else get().add(entry);
      },
      reset: () => set({ favorites: DEFAULTS }),
    }),
    // Plan 80 step 29: route persistence through the SDK facade so the
    // whole app has one storage seam. `createFacadeStateStorage` also
    // one-shot migrates the legacy `ca.favorites` localStorage payload
    // into IndexedDB on first read, so no user loses their pins.
    { name: "ca.favorites", storage: createJSONStorage(() => createFacadeStateStorage()) },
  ),
);

// Plan 80 step 41: cross-tab sync via BroadcastChannel.
wireCrossTabRehydrate(useFavoritesStore, "ca.favorites", "favorites-store");

export const FAVORITE_CANDIDATES: FavoriteEntry[] = [
  { to: "/", label: "Home" },
  { to: "/projects", label: "Projects" },
  { to: "/setup", label: "Setup" },
  { to: "/setup/rules", label: "Rule Sets" },
  { to: "/setup/roi", label: "ROI" },
  { to: "/setup/reference", label: "Reference image" },
  { to: "/trial-run", label: "Trial run" },
  { to: "/ai-testing", label: "AI testing" },
  { to: "/run", label: "Live run" },
  { to: "/results", label: "Results" },
  { to: "/errors", label: "NG events" },
  { to: "/ops", label: "Ops console" },
  { to: "/settings", label: "Settings" },
  { to: "/settings/camera", label: "Camera" },
  { to: "/settings/trigger", label: "Trigger" },
  { to: "/settings/lighting", label: "Lighting" },
  { to: "/settings/license", label: "License" },
];
