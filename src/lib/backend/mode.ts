import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { isValidBackendPrefix } from "./validate";

import { BackendModeType } from "./BackendModeType";

export const DEFAULT_BACKEND_URL = "http://localhost:8000";

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
      version: 1,
      partialize: (state) => ({ baseUrl: state.baseUrl, mode: state.mode }),
    },
  ),
);
