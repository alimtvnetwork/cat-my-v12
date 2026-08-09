/**
 * Named layout presets. Each preset is a `LayoutSnapshot` (panels + dockSizes)
 * plus a user-supplied name. Persisted separately from the live layout under
 * `workspace-layout-presets:v1` so saving a preset never disturbs the current
 * workspace and vice versa.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { LayoutSnapshot } from "./layout-slice";

export interface LayoutPreset {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  snapshot: LayoutSnapshot;
}

interface LayoutPresetsState {
  presets: LayoutPreset[];
  savePreset: (name: string, snapshot: LayoutSnapshot) => LayoutPreset;
  updatePreset: (id: string, snapshot: LayoutSnapshot) => void;
  renamePreset: (id: string, name: string) => void;
  deletePreset: (id: string) => void;
}

export const LAYOUT_PRESETS_STORAGE_KEY = "workspace-layout-presets:v1";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();

  return `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useLayoutPresetsStore = create<LayoutPresetsState>()(
  persist(
    (set) => ({
      presets: [],
      savePreset: (name, snapshot) => {
        const trimmed = name.trim() || "Untitled layout";
        const now = Date.now();
        const preset: LayoutPreset = {
          id: newId(),
          name: trimmed,
          createdAt: now,
          updatedAt: now,
          snapshot,
        };
        set((s) => ({ presets: [...s.presets, preset] }));

        return preset;
      },
      updatePreset: (id, snapshot) =>
        set((s) => ({
          presets: s.presets.map((p) =>
            p.id === id ? { ...p, snapshot, updatedAt: Date.now() } : p,
          ),
        })),
      renamePreset: (id, name) =>
        set((s) => ({
          presets: s.presets.map((p) =>
            p.id === id ? { ...p, name: name.trim() || p.name, updatedAt: Date.now() } : p,
          ),
        })),
      deletePreset: (id) => set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),
    }),
    {
      name: LAYOUT_PRESETS_STORAGE_KEY,
      version: 1,
      storage:
        typeof window !== "undefined" ? createJSONStorage(() => window.localStorage) : undefined,
    },
  ),
);
