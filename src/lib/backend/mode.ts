import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { isValidBackendPrefix } from "./validate";

import { BackendModeType } from "./BackendModeType";

export const DEFAULT_BACKEND_URL = "http://localhost:8787";

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
      baseUrl: DEFAULT_BACKEND_URL,
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
      version: 3,
      migrate: (persistedState: unknown) => {
        const state = (persistedState ?? {}) as Partial<BackendModeState>;
        const oldUrl = state.baseUrl;

        if (
          !oldUrl ||
          oldUrl === "http://localhost:8000" ||
          oldUrl === "http://localhost:8080" ||
          oldUrl === "http://127.0.0.1:8080"
        ) {
          return { ...state, baseUrl: DEFAULT_BACKEND_URL };
        }

        return state;
      },
      partialize: (state) => ({ baseUrl: state.baseUrl, mode: state.mode }),
    },
  ),
);
