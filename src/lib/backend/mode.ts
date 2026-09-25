import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { isValidBackendPrefix } from "./validate";

import { BackendModeType } from "./BackendModeType";

export const DEFAULT_BACKEND_URL = "http://localhost:8787";

export const LEGACY_BACKEND_URLS = Object.freeze([
  "http://localhost:8000",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
] as const);

export function isLegacyBackendUrl(url: string | null | undefined): boolean {
  if (!url) {
    return true;
  }

  const normalized = url.replace(/\/+$/, "");

  return (LEGACY_BACKEND_URLS as readonly string[]).includes(normalized);
}

export function resolveBackendBaseUrl(rawBase: string | null | undefined): string {
  if (isLegacyBackendUrl(rawBase)) {
    return DEFAULT_BACKEND_URL;
  }

  return rawBase ?? DEFAULT_BACKEND_URL;
}

export interface BackendModeState {
  mode: BackendModeType;
  baseUrl: string;
  setMode: (mode: BackendModeType) => void;
  setBaseUrl: (url: string) => void;
}

export const useBackendMode = create<BackendModeState>()(
  persist(
    (set, get) => ({
      mode: BackendModeType.Seed,
      baseUrl: "http://127.0.0.1:8787",
      setMode: (mode) => set({ mode }),
      setBaseUrl: (url) => {
        if (!isValidBackendPrefix(url)) {
          set({ baseUrl: url, mode: BackendModeType.Seed });
          toast.error("Invalid base URL, falling back to seed mode");
        } else {
          set({ baseUrl: url });
        }
      },
    }),
    {
      name: "app.backend.baseUrl",
      version: 2,
      migrate: (persistedState: any) => {
        if (persistedState && isLegacyBackendUrl(persistedState.baseUrl)) {
          return { ...persistedState, baseUrl: DEFAULT_BACKEND_URL };
        }

        return persistedState;
      },
      partialize: (state) => ({ baseUrl: state.baseUrl, mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        if (state && (state.baseUrl.includes(":8000") || !isValidBackendPrefix(state.baseUrl))) {
          state.baseUrl = "http://127.0.0.1:8787";
        }
      },
    },
  ),
);
