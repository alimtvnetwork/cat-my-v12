import { create } from "zustand";
import { persist } from "zustand/middleware";

export enum UiModeType {
  Modern = "modern",
  Standard = "standard",
}

interface UiModeState {
  mode: UiModeType;
  setMode: (mode: UiModeType) => void;
  toggleMode: () => void;
}

export const useUiMode = create<UiModeState>()(
  persist(
    (set) => ({
      mode: UiModeType.Modern,
      setMode: (mode) => set({ mode }),
      toggleMode: () =>
        set((state) => ({
          mode:
            state.mode === UiModeType.Modern
              ? UiModeType.Standard
              : UiModeType.Modern,
        })),
    }),
    {
      name: "ui-mode-storage",
    }
  )
);
